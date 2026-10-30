import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { CampaignVault } from '../src/server/vault/campaignVault.js';
import { GeminiStudioGateway, type RawInteractionsClient } from '../src/server/gemini/geminiStudioGateway.js';
import { StudioPipelineOrchestrator } from '../src/server/orchestrator/studioPipelineOrchestrator.js';
import { createStudioApp } from '../src/server/app.js';

describe('Slice 006 — Stage 6 Multimodal Brand Compliance Scorecard & One-Click Scene Auto-Fix', () => {
  let tempDir: string;
  let vault: CampaignVault;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'cymbal-studio-006-'));
    vault = new CampaignVault(tempDir);
    await vault.seedDefaultBrandKitAndTemplates();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('evaluates multimodal scene assets with gemini-3.8-flash and routes One-Click Auto-Fix into the flagged take previous_interaction_id chain', async () => {
    const createInteractionMock = vi.fn().mockImplementation(async (params) => {
      if (params.model === 'gemini-3.8-flash') {
        return {
          id: 'inter-brandeval-01',
          output_text: JSON.stringify({
            overallScore: 84,
            categoryScores: {
              visualIdentity: 82,
              aerospaceRealism: 88,
              narrativeAudioCohesion: 90,
              regulatoryCompliance: 76,
            },
            executiveSummary: 'Scene 1 keyframe livery needs brighter Mach-Blue (#0EA5E9) cheatline contrast.',
            findings: [
              {
                sceneNumber: 1,
                modality: 'keyframe_start',
                category: 'visual_identity',
                severity: 'warning',
                issue: 'Mach-Blue cheatline is occluded by hangar shadow.',
                suggestedFixPrompt: 'Brighten the Mach-Blue (#0EA5E9) fuselage cheatline with crisp rim lighting.',
              },
            ],
          }),
        };
      }
      // Auto-fix call to gemini-nano-banana-2.1
      return {
        id: 'inter-nb-autofixed-02',
        output_image: {
          data: Buffer.from('fixed-png-bytes').toString('base64'),
          mime_type: 'image/png',
        },
      };
    });

    const mockClient: RawInteractionsClient = {
      interactions: { create: createInteractionMock },
      voices: { create: vi.fn() },
    };

    const gateway = new GeminiStudioGateway({ client: mockClient, vault });
    const orchestrator = new StudioPipelineOrchestrator({ vault, gateway });
    const app = createStudioApp({ vault, gateway, orchestrator });

    const campaign = await vault.createCampaign({ templateId: 'tpl-supersonic-avionics-8921' });
    const scenes = await vault.saveStoryboardScenes(campaign.id, [
      {
        title: 'Hangar Reveal',
        narrativeBeat: 'CX-700 reveal',
        visualPrompt: 'CX-700 in hangar',
        cameraMotionDirective: 'Dolly in',
        voiceoverScript: 'Precision in every contour.',
        vocalStyleDirective: 'calm',
        targetDurationSeconds: 6,
      },
    ]);
    const sceneId = scenes[0].id;

    // Seed initial keyframe take with interactionId = 'inter-nb-initial-01'
    await vault.appendTake({
      campaignId: campaign.id,
      sceneId,
      modality: 'keyframe_start',
      modelId: 'gemini-nano-banana-2.1',
      interactionId: 'inter-nb-initial-01',
      prompt: 'CX-700 in hangar',
      mediaBase64: Buffer.from('initial-png').toString('base64'),
      mimeType: 'image/png',
      fileExtension: 'png',
    });

    // 1. Run Multimodal Brand Evaluation
    const evalRes = await request(app)
      .post(`/api/campaigns/${campaign.id}/brand-eval`)
      .send({})
      .expect(200);

    expect(evalRes.body.report.overallScore).toBe(84);
    expect(evalRes.body.report.findings).toHaveLength(1);
    const findingId = evalRes.body.report.findings[0].id;

    // 2. Click One-Click Auto-Fix on the finding
    const fixRes = await request(app)
      .post(`/api/campaigns/${campaign.id}/brand-eval/findings/${findingId}/autofix`)
      .send({})
      .expect(200);

    const fixCallArg = createInteractionMock.mock.calls[1][0];
    expect(fixCallArg.model).toBe('gemini-nano-banana-2.1');
    expect(fixCallArg.previous_interaction_id).toBe('inter-nb-initial-01');

    expect(fixRes.body.remediatedTake.interactionId).toBe('inter-nb-autofixed-02');
    expect(fixRes.body.remediatedTake.parentInteractionId).toBe('inter-nb-initial-01');
    expect(fixRes.body.evaluation.findings[0].resolved).toBe(true);
    expect(fixRes.body.campaign.scenes[0].activeTakes.keyframe_start).toBe(
      fixRes.body.remediatedTake.id
    );
  });
});
