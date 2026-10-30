import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { CampaignVault } from '../src/server/vault/campaignVault.js';
import { GeminiStudioGateway, type RawInteractionsClient } from '../src/server/gemini/geminiStudioGateway.js';
import { StudioPipelineOrchestrator } from '../src/server/orchestrator/studioPipelineOrchestrator.js';
import { createStudioApp } from '../src/server/app.js';

describe('Slice 005 — Stage 5 Voice Design & Narration (gemini-3.8-flash-tts) + Keyframe-Conditioned Score (lyria-3.5)', () => {
  let tempDir: string;
  let vault: CampaignVault;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'cymbal-studio-005-'));
    vault = new CampaignVault(tempDir);
    await vault.seedDefaultBrandKitAndTemplates();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('designs a custom narrator voice, synthesizes per-scene TTS with speech_metadata, and composes Lyria 3.5 music conditioned on keyframes', async () => {
    const createVoiceMock = vi.fn().mockResolvedValue({
      id: 'voice_cymbal_chief_pilot_01',
      sample_audio: {
        data: Buffer.from('sample-wav-bytes').toString('base64'),
        mime_type: 'audio/wav',
      },
    });

    const createInteractionMock = vi.fn().mockImplementation(async (params) => {
      if (params.model === 'gemini-3.8-flash-tts') {
        return {
          id: 'inter-tts-scene-1',
          output_audio: {
            data: Buffer.from('tts-wav-bytes').toString('base64'),
            mime_type: 'audio/wav',
          },
        };
      }
      return {
        id: 'inter-lyria-score-1',
        output_audio: {
          data: Buffer.from('lyria-wav-bytes').toString('base64'),
          mime_type: 'audio/wav',
        },
      };
    });

    const mockClient: RawInteractionsClient = {
      interactions: { create: createInteractionMock },
      voices: { create: createVoiceMock },
    };

    const gateway = new GeminiStudioGateway({ client: mockClient, vault });
    const orchestrator = new StudioPipelineOrchestrator({ vault, gateway });
    const app = createStudioApp({ vault, gateway, orchestrator });

    const campaign = await vault.createCampaign({ templateId: 'tpl-supersonic-avionics-8921' });
    const scenes = await vault.saveStoryboardScenes(campaign.id, [
      {
        title: 'Cockpit Telemetry',
        narrativeBeat: 'HUD active',
        visualPrompt: 'VisionX-9 cockpit HUD',
        cameraMotionDirective: 'Push in',
        voiceoverScript: 'Every flight parameter projected with photonic clarity.',
        vocalStyleDirective: 'calm and authoritative aerospace commander',
        targetDurationSeconds: 6,
      },
    ]);
    const sceneId = scenes[0].id;

    // Seed active keyframe for multimodal Lyria conditioning
    await vault.appendTake({
      campaignId: campaign.id,
      sceneId,
      modality: 'keyframe_start',
      modelId: 'gemini-nano-banana-2.1',
      interactionId: 'inter-kf-1',
      prompt: scenes[0].visualPrompt,
      mediaBase64: Buffer.from('kf-image-bytes').toString('base64'),
      mimeType: 'image/png',
      fileExtension: 'png',
    });

    // 1. Design custom narrator voice via gemini-3.8-flash-tts Voice Design
    const voiceRes = await request(app)
      .post(`/api/campaigns/${campaign.id}/voice-design`)
      .send({
        displayName: 'Commander Elena Vance',
        gender: 'female',
        languageCode: 'en-US',
        personaPrompt: 'Calm, authoritative aerospace test pilot with warm gravitas.',
      })
      .expect(200);

    expect(createVoiceMock).toHaveBeenCalledTimes(1);
    expect(voiceRes.body.voicePersona.voiceId).toBe('voice_cymbal_chief_pilot_01');
    expect(voiceRes.body.voicePersona.sampleAudioUrl).toContain('/media/');

    // 2. Synthesize per-scene TTS voiceover using designed voiceId and speech_metadata annotations
    const ttsRes = await request(app)
      .post(`/api/campaigns/${campaign.id}/scenes/${sceneId}/generate`)
      .send({ modality: 'voiceover_audio' })
      .expect(200);

    const ttsCall = createInteractionMock.mock.calls[0][0];
    expect(ttsCall.model).toBe('gemini-3.8-flash-tts');
    expect(ttsCall.response_format).toEqual({ type: 'audio' });
    expect(ttsCall.generation_config.speech_config[0].voice).toBe('voice_cymbal_chief_pilot_01');
    expect(ttsCall.input[0].content[0].annotations[0]).toEqual({
      type: 'speech_metadata',
      style: 'calm and authoritative aerospace commander',
    });
    expect(ttsRes.body.take.modality).toBe('voiceover_audio');

    // 3. Generate campaign score via lyria-3.5 conditioned on storyboard keyframe images
    const musicRes = await request(app)
      .post(`/api/campaigns/${campaign.id}/music/generate`)
      .send({ modelId: 'lyria-3.5' })
      .expect(200);

    const lyriaCall = createInteractionMock.mock.calls[1][0];
    expect(lyriaCall.model).toBe('lyria-3.5');
    expect(lyriaCall.input[0].type).toBe('text');
    expect(lyriaCall.input[1]).toMatchObject({
      type: 'image',
      mime_type: 'image/png',
    });
    expect(musicRes.body.campaign.activeMusicTakeId).toBe(musicRes.body.take.id);
  });
});
