import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { CampaignVault } from '../src/server/vault/campaignVault.js';
import { GeminiStudioGateway, type RawInteractionsClient } from '../src/server/gemini/geminiStudioGateway.js';
import { StudioPipelineOrchestrator } from '../src/server/orchestrator/studioPipelineOrchestrator.js';
import { createStudioApp } from '../src/server/app.js';

describe('Slice 004 — Stage 4 Keyframe-Locked Motion Video Synthesis, Editing & Extension (gemini-omni-1.1-flash)', () => {
  let tempDir: string;
  let vault: CampaignVault;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'cymbal-studio-004-'));
    vault = new CampaignVault(tempDir);
    await vault.seedDefaultBrandKitAndTemplates();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('passes approved start keyframe into gemini-omni-1.1-flash and supports conversational editing and tail-end video extension', async () => {
    let callIdx = 0;
    const createInteractionMock = vi.fn().mockImplementation(async () => {
      callIdx += 1;
      return {
        id: `inter-omni-${callIdx}`,
        output_video: {
          data: Buffer.from(`mp4-data-${callIdx}`).toString('base64'),
          mime_type: 'video/mp4',
        },
        usage: { input_tokens: 512, output_tokens: 2048, total_tokens: 2560 },
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
        title: 'Supersonic Climb',
        narrativeBeat: 'CX-700 climbing through Mach 1.2',
        visualPrompt: 'CX-700 climbing at 45,000 feet.',
        cameraMotionDirective: 'Tracking shot banking smoothly to starboard.',
        voiceoverScript: 'Engineered for effortless supersonic climb.',
        vocalStyleDirective: 'confident',
        targetDurationSeconds: 6,
      },
    ]);
    const sceneId = scenes[0].id;

    // Seed an active start keyframe take
    await vault.appendTake({
      campaignId: campaign.id,
      sceneId,
      modality: 'keyframe_start',
      modelId: 'gemini-nano-banana-2.1',
      interactionId: 'inter-kf-start',
      prompt: scenes[0].visualPrompt,
      mediaBase64: Buffer.from('keyframe-png-bytes').toString('base64'),
      mimeType: 'image/png',
      fileExtension: 'png',
    });

    // 1. Synthesize motion clip locked to start keyframe
    const synthRes = await request(app)
      .post(`/api/campaigns/${campaign.id}/scenes/${sceneId}/generate`)
      .send({ modality: 'motion_video' })
      .expect(200);

    const firstCall = createInteractionMock.mock.calls[0][0];
    expect(firstCall.model).toBe('gemini-omni-1.1-flash');
    expect(firstCall.input[0]).toMatchObject({
      type: 'image',
      mime_type: 'image/png',
    });
    expect(synthRes.body.take.interactionId).toBe('inter-omni-1');

    // 2. Conversational video edit via previous_interaction_id
    const editRes = await request(app)
      .post(`/api/campaigns/${campaign.id}/scenes/${sceneId}/generate`)
      .send({
        modality: 'motion_video',
        promptOverride: 'Add subtle condensation vapor along the wingtips',
        conversationalEdit: true,
      })
      .expect(200);

    const secondCall = createInteractionMock.mock.calls[1][0];
    expect(secondCall.previous_interaction_id).toBe('inter-omni-1');
    expect(editRes.body.take.parentInteractionId).toBe('inter-omni-1');

    // 3. Extend video tail via extendVideo=true
    const extendRes = await request(app)
      .post(`/api/campaigns/${campaign.id}/scenes/${sceneId}/generate`)
      .send({
        modality: 'motion_video',
        extendVideo: true,
      })
      .expect(200);

    const thirdCall = createInteractionMock.mock.calls[2][0];
    expect(thirdCall.previous_interaction_id).toBe('inter-omni-2');
    expect(thirdCall.input[0]).toMatchObject({
      type: 'video',
      mime_type: 'video/mp4',
    });
    expect(extendRes.body.take.durationSeconds).toBe(10);
  });
});
