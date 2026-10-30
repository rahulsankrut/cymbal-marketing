import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { CampaignVault } from '../src/server/vault/campaignVault.js';
import { createStudioApp } from '../src/server/app.js';

describe('Slice 007 — Stage 6 FFmpeg Master Timeline Assembler & -12dB Audio Ducking', () => {
  let tempDir: string;
  let vault: CampaignVault;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'cymbal-studio-007-'));
    vault = new CampaignVault(tempDir);
    await vault.seedDefaultBrandKitAndTemplates();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('computes scene timeline alignment (silence padding vs overflow warnings), builds -12dB ducking filtergraph, and assembles Master MP4', async () => {
    const app = createStudioApp({ vault });
    const campaign = await vault.createCampaign({ templateId: 'tpl-supersonic-avionics-8921' });
    const scenes = await vault.saveStoryboardScenes(campaign.id, [
      {
        title: 'Scene 1 — Shorter Voiceover than Video',
        narrativeBeat: 'Hangar reveal',
        visualPrompt: 'CX-700 hangar',
        cameraMotionDirective: 'Dolly in',
        voiceoverScript: 'Short line.',
        vocalStyleDirective: 'calm',
        targetDurationSeconds: 6,
      },
      {
        title: 'Scene 2 — Longer Voiceover than Video',
        narrativeBeat: 'Cockpit shear HUD',
        visualPrompt: 'VisionX-9 HUD',
        cameraMotionDirective: 'Push in',
        voiceoverScript: 'Detailed technical narration that runs longer than the six second video clip.',
        vocalStyleDirective: 'crisp',
        targetDurationSeconds: 6,
      },
    ]);

    // Scene 1: 6s video, 4s voiceover -> 2s silence padding
    await vault.appendTake({
      campaignId: campaign.id,
      sceneId: scenes[0].id,
      modality: 'motion_video',
      modelId: 'gemini-omni-1.1-flash',
      interactionId: 'vid-1',
      prompt: 'Dolly in',
      mediaBase64: Buffer.from('vid1').toString('base64'),
      mimeType: 'video/mp4',
      fileExtension: 'mp4',
      durationSeconds: 6,
    });
    await vault.appendTake({
      campaignId: campaign.id,
      sceneId: scenes[0].id,
      modality: 'voiceover_audio',
      modelId: 'gemini-3.8-flash-tts',
      interactionId: 'vo-1',
      prompt: 'Short line.',
      mediaBase64: Buffer.from('vo1').toString('base64'),
      mimeType: 'audio/wav',
      fileExtension: 'wav',
      durationSeconds: 4,
    });

    // Scene 2: 6s video, 8.5s voiceover -> 2.5s overflow warning + extension recommendation
    await vault.appendTake({
      campaignId: campaign.id,
      sceneId: scenes[1].id,
      modality: 'motion_video',
      modelId: 'gemini-omni-1.1-flash',
      interactionId: 'vid-2',
      prompt: 'Push in',
      mediaBase64: Buffer.from('vid2').toString('base64'),
      mimeType: 'video/mp4',
      fileExtension: 'mp4',
      durationSeconds: 6,
    });
    await vault.appendTake({
      campaignId: campaign.id,
      sceneId: scenes[1].id,
      modality: 'voiceover_audio',
      modelId: 'gemini-3.8-flash-tts',
      interactionId: 'vo-2',
      prompt: 'Long line.',
      mediaBase64: Buffer.from('vo2').toString('base64'),
      mimeType: 'audio/wav',
      fileExtension: 'wav',
      durationSeconds: 8.5,
    });

    // Assemble Master Cut
    const assembleRes = await request(app)
      .post(`/api/campaigns/${campaign.id}/assemble`)
      .send({})
      .expect(200);

    const { timelinePlan, masterTake } = assembleRes.body;
    expect(timelinePlan.musicAttenuationDb).toBe(-12);
    expect(timelinePlan.ffmpegFilterComplex).toContain('-12dB');
    expect(timelinePlan.segments[0].silencePaddingSeconds).toBe(2);
    expect(timelinePlan.segments[0].needsVideoExtension).toBe(false);
    expect(timelinePlan.segments[1].voiceoverOverflowSeconds).toBe(2.5);
    expect(timelinePlan.segments[1].needsVideoExtension).toBe(true);
    expect(timelinePlan.warnings.length).toBeGreaterThanOrEqual(1);

    expect(masterTake.modality).toBe('master_video');
    expect(masterTake.mimeType).toBe('video/mp4');
    expect(assembleRes.body.campaign.activeMasterTakeId).toBe(masterTake.id);
    expect(assembleRes.body.campaign.masterStale).toBe(false);
  });
});
