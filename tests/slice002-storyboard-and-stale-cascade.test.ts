import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { CampaignVault } from '../src/server/vault/campaignVault.js';
import { GeminiStudioGateway, type RawInteractionsClient } from '../src/server/gemini/geminiStudioGateway.js';
import { StudioPipelineOrchestrator } from '../src/server/orchestrator/studioPipelineOrchestrator.js';
import { createStudioApp } from '../src/server/app.js';

describe('Slice 002 — Stage 2 AI Storyboard Generator (gemini-3.8-flash) & Non-Destructive Stale Cascade', () => {
  let tempDir: string;
  let vault: CampaignVault;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'cymbal-studio-002-'));
    vault = new CampaignVault(tempDir);
    await vault.seedDefaultBrandKitAndTemplates();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('calls gemini-3.8-flash with JSON Schema response_format to generate structured storyboard scenes', async () => {
    const createInteractionMock = vi.fn().mockResolvedValue({
      id: 'inter-storyboard-001',
      output_text: JSON.stringify({
        scenes: [
          {
            title: 'Dawn Hangar Reveal',
            narrativeBeat: 'Introduce CX-700 delta-wing airframe in obsidian hangar',
            visualPrompt: 'Wide anamorphic shot of Cymbal CX-700 supersonic airliner in titanium white and Mach-Blue livery inside dark obsidian hangar at dawn.',
            endFramePrompt: 'Camera pushes in to the glowing VisionX-9 glass cockpit canopy.',
            cameraMotionDirective: 'Slow precision dolly-in along the titanium leading edge at 24fps.',
            voiceoverScript: 'Every horizon begins with the courage to see further.',
            vocalStyleDirective: 'calm, authoritative, and inspiring aerospace narration',
            targetDurationSeconds: 6,
          },
          {
            title: 'VisionX-9 Photonic Shear HUD',
            narrativeBeat: 'Demonstrate predictive LIDAR clear-air turbulence overlay',
            visualPrompt: 'Interior cockpit shot of Captain Marcus Sterling viewing the translucent Mach-Blue VisionX-9 holographic HUD.',
            cameraMotionDirective: 'Over-the-shoulder push toward the panoramic primary flight display.',
            voiceoverScript: 'With VisionX-9 photonic LIDAR, flight crews read clear-air shear forty nautical miles ahead.',
            vocalStyleDirective: 'crisp, confident technical precision',
            targetDurationSeconds: 6,
          },
        ],
      }),
      usage: { input_tokens: 420, output_tokens: 310, total_tokens: 730 },
    });

    const mockClient: RawInteractionsClient = {
      interactions: { create: createInteractionMock },
      voices: { create: vi.fn() },
    };

    const gateway = new GeminiStudioGateway({ client: mockClient, vault });
    const orchestrator = new StudioPipelineOrchestrator({ vault, gateway });
    const app = createStudioApp({ vault, gateway, orchestrator });

    const campaign = await vault.createCampaign({ templateId: 'tpl-supersonic-avionics-8921' });

    const res = await request(app)
      .post(`/api/campaigns/${campaign.id}/storyboard/generate`)
      .send({ sceneCount: 2 })
      .expect(200);

    expect(createInteractionMock).toHaveBeenCalledTimes(1);
    const callArg = createInteractionMock.mock.calls[0][0];
    expect(callArg.model).toBe('gemini-3.8-flash');
    expect(callArg.response_format).toMatchObject({
      type: 'text',
      mime_type: 'application/json',
    });
    expect(callArg.response_format.schema.properties.scenes).toBeDefined();

    expect(res.body.scenes).toHaveLength(2);
    expect(res.body.scenes[0].title).toBe('Dawn Hangar Reveal');
    expect(res.body.currentStage).toBe(2);
  });

  it('non-destructively badges downstream assets as Stale when upstream visualPrompt or voiceoverScript changes', async () => {
    const gateway = new GeminiStudioGateway({ vault });
    const orchestrator = new StudioPipelineOrchestrator({ vault, gateway });
    const app = createStudioApp({ vault, gateway, orchestrator });

    const campaign = await vault.createCampaign({ templateId: 'tpl-supersonic-avionics-8921' });
    const scenes = await vault.saveStoryboardScenes(campaign.id, [
      {
        title: 'Stratospheric Mach Cruise',
        narrativeBeat: 'CX-700 cruising at Mach 1.8 at 55,000 feet',
        visualPrompt: 'Exterior tracking shot of CX-700 at 55,000 feet above Earth curvature.',
        cameraMotionDirective: 'Parallel aerial tracking shot with subtle lens flare.',
        voiceoverScript: 'Mach 1.8 cruise—engineered for the next century of flight.',
        vocalStyleDirective: 'soaring, confident',
        targetDurationSeconds: 6,
      },
    ]);
    const sceneId = scenes[0].id;

    // Record active keyframe, motion video, voiceover, and master cut takes
    const kfTake = await vault.appendTake({
      campaignId: campaign.id,
      sceneId,
      modality: 'keyframe_start',
      modelId: 'gemini-nano-banana-2.1',
      interactionId: 'inter-kf-1',
      prompt: scenes[0].visualPrompt,
      mediaBase64: Buffer.from('fake-png').toString('base64'),
      mimeType: 'image/png',
      fileExtension: 'png',
    });
    const vidTake = await vault.appendTake({
      campaignId: campaign.id,
      sceneId,
      modality: 'motion_video',
      modelId: 'gemini-omni-1.1-flash',
      interactionId: 'inter-vid-1',
      prompt: scenes[0].cameraMotionDirective,
      mediaBase64: Buffer.from('fake-mp4').toString('base64'),
      mimeType: 'video/mp4',
      fileExtension: 'mp4',
    });
    const voTake = await vault.appendTake({
      campaignId: campaign.id,
      sceneId,
      modality: 'voiceover_audio',
      modelId: 'gemini-3.8-flash-tts',
      interactionId: 'inter-vo-1',
      prompt: scenes[0].voiceoverScript,
      mediaBase64: Buffer.from('fake-wav').toString('base64'),
      mimeType: 'audio/wav',
      fileExtension: 'wav',
    });
    await vault.appendTake({
      campaignId: campaign.id,
      sceneId: null,
      modality: 'master_video',
      modelId: 'ffmpeg-master-assembler',
      interactionId: 'master-1',
      prompt: 'Master assembly',
      mediaBase64: Buffer.from('fake-master').toString('base64'),
      mimeType: 'video/mp4',
      fileExtension: 'mp4',
    });

    // 1. Edit voiceoverScript ONLY -> should mark voiceover_audio and master_video stale, NOT keyframe_start!
    const patchVoRes = await request(app)
      .patch(`/api/campaigns/${campaign.id}/scenes/${sceneId}`)
      .send({
        voiceoverScript: 'Mach 1.8 cruise—verified across four thousand flight hours.',
      })
      .expect(200);

    expect(patchVoRes.body.scene.stale.voiceover_audio).toBe(true);
    expect(patchVoRes.body.scene.stale.keyframe_start).toBeFalsy();
    expect(patchVoRes.body.cascadedStaleModalities).toEqual(
      expect.arrayContaining(['voiceover_audio', 'master_video'])
    );

    // 2. Edit visualPrompt -> should mark keyframe_start and motion_video stale while preserving all prior takes!
    const patchVisRes = await request(app)
      .patch(`/api/campaigns/${campaign.id}/scenes/${sceneId}`)
      .send({
        visualPrompt: 'Golden-hour exterior shot of CX-700 at 55,000 feet with Mach vapor cone.',
      })
      .expect(200);

    expect(patchVisRes.body.scene.stale.keyframe_start).toBe(true);
    expect(patchVisRes.body.scene.stale.motion_video).toBe(true);

    const updatedCampaign = await vault.getCampaign(campaign.id);
    expect(updatedCampaign.masterStale).toBe(true);
    // All 4 historical takes remain preserved in the vault!
    expect(updatedCampaign.takes.map((t) => t.id)).toEqual(
      expect.arrayContaining([kfTake.id, vidTake.id, voTake.id])
    );
  });
});
