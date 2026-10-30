import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { CampaignVault } from '../src/server/vault/campaignVault.js';
import { GeminiStudioGateway, type RawInteractionsClient } from '../src/server/gemini/geminiStudioGateway.js';
import { StudioPipelineOrchestrator } from '../src/server/orchestrator/studioPipelineOrchestrator.js';
import { createStudioApp } from '../src/server/app.js';

describe('Slice 003 — Stage 3 Reference Anchor Studio & Keyframe Fusion (gemini-nano-banana-2.1)', () => {
  let tempDir: string;
  let vault: CampaignVault;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'cymbal-studio-003-'));
    vault = new CampaignVault(tempDir);
    await vault.seedDefaultBrandKitAndTemplates();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('fuses Reference Anchor images into gemini-nano-banana-2.1 keyframe calls and chains previous_interaction_id on conversational edits', async () => {
    let callCounter = 0;
    const createInteractionMock = vi.fn().mockImplementation(async () => {
      callCounter += 1;
      return {
        id: `inter-nb-${callCounter}`,
        output_image: {
          data: Buffer.from(`png-bytes-${callCounter}`).toString('base64'),
          mime_type: 'image/png',
        },
        usage: { input_tokens: 200, output_tokens: 1024, total_tokens: 1224 },
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
    const anchor = campaign.anchors[0];

    // 1. Generate the Reference Anchor image first
    await request(app)
      .post(`/api/campaigns/${campaign.id}/anchors/${anchor.id}/generate`)
      .send({})
      .expect(200);

    // 2. Add a storyboard scene linked to this anchor
    const scenes = await vault.saveStoryboardScenes(campaign.id, [
      {
        title: 'Hangar Hero Shot',
        narrativeBeat: 'CX-700 rollout',
        visualPrompt: 'CX-700 parked on obsidian hangar apron with Mach-Blue floor reflections.',
        cameraMotionDirective: 'Slow dolly in',
        voiceoverScript: 'Precision built for supersonic flight.',
        vocalStyleDirective: 'calm',
        targetDurationSeconds: 6,
        anchorIds: [anchor.id],
      },
    ]);
    const sceneId = scenes[0].id;

    // 3. Generate Scene Keyframe -> should pass Reference Anchor image part before text prompt!
    const kfRes1 = await request(app)
      .post(`/api/campaigns/${campaign.id}/scenes/${sceneId}/generate`)
      .send({ modality: 'keyframe_start' })
      .expect(200);

    const kfCallArg = createInteractionMock.mock.calls[1][0];
    expect(kfCallArg.model).toBe('gemini-nano-banana-2.1');
    expect(Array.isArray(kfCallArg.input)).toBe(true);
    expect(kfCallArg.input[0]).toMatchObject({
      type: 'image',
      mime_type: 'image/png',
    });
    expect(kfCallArg.input[1]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('CX-700 parked on obsidian hangar apron'),
    });

    const firstTakeId = kfRes1.body.take.id;
    expect(kfRes1.body.take.interactionId).toBe('inter-nb-2');

    // 4. Conversational Edit -> should pass previous_interaction_id = 'inter-nb-2' and preserve both takes!
    const kfRes2 = await request(app)
      .post(`/api/campaigns/${campaign.id}/scenes/${sceneId}/generate`)
      .send({
        modality: 'keyframe_start',
        promptOverride: 'Add golden dawn sunlight streaming through hangar doors',
        conversationalEdit: true,
      })
      .expect(200);

    const editCallArg = createInteractionMock.mock.calls[2][0];
    expect(editCallArg.previous_interaction_id).toBe('inter-nb-2');
    expect(kfRes2.body.take.parentInteractionId).toBe('inter-nb-2');

    // 5. Switch active take back to firstTakeId via Take History endpoint
    const switchRes = await request(app)
      .post(`/api/campaigns/${campaign.id}/active-take`)
      .send({
        sceneId,
        modality: 'keyframe_start',
        takeId: firstTakeId,
      })
      .expect(200);

    expect(switchRes.body.scenes[0].activeTakes.keyframe_start).toBe(firstTakeId);
    expect(switchRes.body.takes.filter((t: { sceneId: string }) => t.sceneId === sceneId)).toHaveLength(2);
  });
});
