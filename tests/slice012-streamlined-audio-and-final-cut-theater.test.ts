import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildFinalCutTheaterViewState } from '../src/client/viewModel/studioViewModel.js';
import type { CampaignDetail } from '../src/shared/types.js';

describe('Slice 012 — Streamlined Audio Studio & Pure Final Cut Theater', () => {
  it('builds a Pure Final Cut Theater state that hides Brand Evaluation Scorecards and raw FFmpeg filtergraphs', () => {
    const campaign: CampaignDetail = {
      id: 'camp-3',
      title: 'CX-900 Supersonic Avionics Launch',
      brandKitId: 'bk-cymbal-global',
      targetAudience: 'Global Airline Fleet VPs',
      spotDurationSeconds: 18,
      aspectRatio: '16:9',
      creativeBrief: 'Launch film',
      keyProductClaims: [],
      musicalMoodPrompt: 'Synth pulse',
      currentStage: 6,
      activeMasterTakeId: 'take-master-1',
      masterStale: false,
      voicePersona: {
        voiceId: 'voice-elena',
        displayName: 'Commander Elena Vance',
        gender: 'female',
        languageCode: 'en-US',
        personaPrompt: 'Calm authoritative test pilot.',
      },
      anchors: [],
      scenes: [
        {
          id: 'scene-1',
          campaignId: 'camp-3',
          orderIndex: 1,
          title: 'Dawn Stratosphere Climb',
          narrativeBeat: 'Hook',
          visualPrompt: 'Obsidian jet',
          cameraMotionDirective: 'Tracking shot',
          voiceoverScript: 'Clarity is everything.',
          vocalStyleDirective: 'authoritative',
          targetDurationSeconds: 6,
          anchorIds: [],
          activeTakes: {},
          stale: {
            keyframe_start: false,
            keyframe_end: false,
            motion_video: false,
            voiceover_audio: false,
          },
          updatedAt: '2026-10-30T00:00:00Z',
        },
      ],
      takes: [
        {
          id: 'take-master-1',
          campaignId: 'camp-3',
          sceneId: null,
          modality: 'master_video',
          modelId: 'ffmpeg-master-assembler',
          interactionId: 'int-master-1',
          prompt: 'Master cut',
          mediaUrl: '/media/take-master-1.mp4',
          mimeType: 'video/mp4',
          durationSeconds: 6,
          createdAt: '2026-10-30T00:00:00Z',
        },
      ],
      createdAt: '2026-10-30T00:00:00Z',
      updatedAt: '2026-10-30T00:00:00Z',
    };

    const view = buildFinalCutTheaterViewState(campaign);
    expect(view.masterVideoUrl).toBe('/media/take-master-1.mp4');
    expect(view.totalDurationSeconds).toBe(6);
    expect(view.sceneTimings).toHaveLength(1);
    expect(view.showBrandEvaluationScorecard).toBe(false);
    expect(view.showRawFfmpegFiltergraph).toBe(false);
  });

  it('wires Step 3 (Voice & Soundtrack) and Step 4 (Pure Final Cut Theater) in App.tsx without Brand Eval or FFmpeg filtergraph clutter', () => {
    const appSource = readFileSync(join(process.cwd(), 'src/client/App.tsx'), 'utf8');
    expect(appSource).toContain('buildFinalCutTheaterViewState');
    expect(appSource).toContain('toggle-voice-persona-btn');
    expect(appSource).not.toContain('Multimodal Brand & Aerospace Compliance Scorecard');
    expect(appSource).not.toContain('FFmpeg Audio Ducking Filtergraph');
  });
});
