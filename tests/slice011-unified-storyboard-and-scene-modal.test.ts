import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildVisualSceneCards,
  buildSceneInspectorModalState,
} from '../src/client/viewModel/studioViewModel.js';
import type { CampaignDetail } from '../src/shared/types.js';

function createStoryboardCampaign(): CampaignDetail {
  return {
    id: 'camp-2',
    title: 'CX-900 Supersonic Avionics Launch',
    brandKitId: 'bk-cymbal-global',
    targetAudience: 'Global Airline Fleet VPs',
    creativeBrief: 'Launch film',
    musicalMoodPrompt: 'Synth pulse',
    currentStage: 3,
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
        order: 1,
        title: 'Dawn Stratosphere Climb',
        narrativeBeat: 'Hook',
        visualPrompt: 'Obsidian jet climbing through clouds.',
        cameraMotionDirective: '24fps aerial tracking dolly.',
        voiceoverScript: 'At sixty thousand feet, clarity is everything.',
        vocalStyleDirective: 'authoritative',
        targetDurationSeconds: 6,
        activeTakes: {
          keyframe_start: 'take-kf-1',
          motion_video: 'take-vid-1',
        },
        stale: {
          keyframe_start: false,
          keyframe_end: false,
          motion_video: true,
          voiceover_audio: false,
        },
      },
    ],
    takes: [
      {
        id: 'take-kf-1',
        campaignId: 'camp-2',
        sceneId: 'scene-1',
        modality: 'keyframe_start',
        modelId: 'gemini-nano-banana-2.1',
        interactionId: 'int-kf-1',
        prompt: 'Obsidian jet climbing through clouds.',
        mediaUrl: '/media/take-kf-1.png',
        mimeType: 'image/png',
        createdAt: '2026-10-30T00:00:00Z',
      },
      {
        id: 'take-vid-1',
        campaignId: 'camp-2',
        sceneId: 'scene-1',
        modality: 'motion_video',
        modelId: 'gemini-omni-1.1-flash',
        interactionId: 'int-vid-1',
        prompt: '24fps aerial tracking dolly.',
        mediaUrl: '/media/take-vid-1.mp4',
        mimeType: 'video/mp4',
        durationSeconds: 6,
        createdAt: '2026-10-30T00:00:00Z',
      },
    ],
    createdAt: '2026-10-30T00:00:00Z',
    updatedAt: '2026-10-30T00:00:00Z',
  };
}

describe('Slice 011 — Unified Visual Storyboard & On-Demand Scene Inspector Modal', () => {
  it('switches Scene Cards between Keyframes (image) and Motion Clips (video) with 0 open textareas and opens SceneInspectorModal on demand', () => {
    const campaign = createStoryboardCampaign();

    const imageCards = buildVisualSceneCards(campaign, 'image');
    expect(imageCards).toHaveLength(1);
    expect(imageCards[0].openTextareaCount).toBe(0);
    expect(imageCards[0].activeModality).toBe('keyframe_start');
    expect(imageCards[0].activeMediaUrl).toBe('/media/take-kf-1.png');
    expect(imageCards[0].staleSummary).toBe('Out of Sync: Motion');

    const videoCards = buildVisualSceneCards(campaign, 'video');
    expect(videoCards[0].activeModality).toBe('motion_video');
    expect(videoCards[0].activeMediaUrl).toBe('/media/take-vid-1.mp4');

    const modalState = buildSceneInspectorModalState(campaign, 'scene-1');
    expect(modalState).not.toBeNull();
    expect(modalState?.title).toBe('Dawn Stratosphere Climb');
    expect(modalState?.keyframeTakes).toHaveLength(1);
    expect(modalState?.motionTakes).toHaveLength(1);
    expect(modalState?.canExtendMotion).toBe(true);
  });

  it('renders SceneInspectorModal component and unifies Keyframes + Motion Clips in Step 2 of App.tsx', () => {
    const modalPath = join(process.cwd(), 'src/client/components/SceneInspectorModal.tsx');
    expect(existsSync(modalPath)).toBe(true);

    const appSource = readFileSync(join(process.cwd(), 'src/client/App.tsx'), 'utf8');
    expect(appSource).toContain('SceneInspectorModal');
    expect(appSource).toContain('storyboard-preview-mode-image');
    expect(appSource).toContain('storyboard-preview-mode-video');
    expect(appSource).toContain('toggle-reference-anchors-btn');
  });
});
