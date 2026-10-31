import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  VOICE_PRESET_OPTIONS,
  VOICE_SPEED_OPTIONS,
  VOICE_STYLE_OPTIONS,
  MUSIC_GENRE_OPTIONS,
  MUSIC_TEMPO_OPTIONS,
  MUSIC_INSTRUMENT_OPTIONS,
  composeSoundtrackPromptFromSelections,
  buildStreamlinedAudioViewState,
  buildFinalCutTheaterViewState,
  computeTotalStaleCount,
} from '../src/client/viewModel/studioViewModel.js';
import type { CampaignDetail } from '../src/shared/types.js';

describe('Slice 012 — Streamlined Audio Studio & Pure Final Cut Theater', () => {
  it('builds Streamlined Audio Studio and Pure Final Cut Theater states that hide Brand Evaluation Scorecards and raw FFmpeg filtergraphs', () => {
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

    const audioView = buildStreamlinedAudioViewState(campaign);
    expect(audioView.activeNarratorName).toBe('Commander Elena Vance');
    expect(audioView.scenes).toHaveLength(1);
    expect(computeTotalStaleCount(campaign)).toBe(0);

    expect(VOICE_PRESET_OPTIONS.length).toBeGreaterThanOrEqual(4);
    expect(VOICE_SPEED_OPTIONS.some((o) => o.value === 1.25)).toBe(true);
    expect(VOICE_STYLE_OPTIONS.length).toBeGreaterThanOrEqual(4);
    expect(MUSIC_GENRE_OPTIONS.length).toBeGreaterThanOrEqual(4);
    expect(MUSIC_TEMPO_OPTIONS.length).toBeGreaterThanOrEqual(4);
    expect(MUSIC_INSTRUMENT_OPTIONS.length).toBeGreaterThanOrEqual(4);

    const composedPrompt = composeSoundtrackPromptFromSelections({
      genre: MUSIC_GENRE_OPTIONS[0],
      tempo: MUSIC_TEMPO_OPTIONS[1],
      instruments: MUSIC_INSTRUMENT_OPTIONS[0],
    });
    expect(composedPrompt).toContain(MUSIC_GENRE_OPTIONS[0]);
    expect(composedPrompt).toContain(MUSIC_TEMPO_OPTIONS[1]);

    const view = buildFinalCutTheaterViewState(campaign);
    expect(view.masterVideoUrl).toBe('/media/take-master-1.mp4');
    expect(view.totalDurationSeconds).toBe(6);
    expect(view.sceneTimings).toHaveLength(1);
    expect(view.showBrandEvaluationScorecard).toBe(false);
    expect(view.showRawFfmpegFiltergraph).toBe(false);
  });

  it('wires Step 3 (Voice & Soundtrack dropdowns + prompts) and Step 4 (Pure Final Cut Theater) in App.tsx without Brand Eval or FFmpeg filtergraph clutter', () => {
    const appSource = readFileSync(join(process.cwd(), 'src/client/App.tsx'), 'utf8');
    expect(appSource).toContain('buildStreamlinedAudioViewState');
    expect(appSource).toContain('buildFinalCutTheaterViewState');
    expect(appSource).toContain('voice-preset-select');
    expect(appSource).toContain('voice-speed-select');
    expect(appSource).toContain('voice-style-select');
    expect(appSource).toContain('music-genre-select');
    expect(appSource).toContain('music-tempo-select');
    expect(appSource).toContain('music-instruments-select');
    expect(appSource).toContain('toggle-voice-persona-btn');
    expect(appSource).not.toContain('Multimodal Brand & Aerospace Compliance Scorecard');
    expect(appSource).not.toContain('FFmpeg Audio Ducking Filtergraph');
  });
});
