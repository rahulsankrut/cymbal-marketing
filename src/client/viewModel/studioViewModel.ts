import type {
  AssetTake,
  CampaignDetail,
  Modality,
  Scene,
  StarterCampaignTemplate,
  StudioStageNumber,
} from '../../shared/types.js';

export type SimplifiedStepNumber = 1 | 2 | 3 | 4;

export interface SimplifiedStepMeta {
  number: SimplifiedStepNumber;
  label: string;
}

export const SIMPLIFIED_STEPS: ReadonlyArray<SimplifiedStepMeta> = [
  { number: 1, label: '1. Brief' },
  { number: 2, label: '2. Storyboard & Visuals' },
  { number: 3, label: '3. Voice & Soundtrack' },
  { number: 4, label: '4. Final Cut' },
];

export function mapBackendStageToStep(stage: StudioStageNumber): SimplifiedStepNumber {
  if (stage <= 1) return 1;
  if (stage <= 4) return 2;
  if (stage === 5) return 3;
  return 4;
}

export function computeSimplifiedStepReadiness(
  campaign: CampaignDetail | null
): Record<SimplifiedStepNumber, boolean> {
  if (!campaign) {
    return { 1: false, 2: false, 3: false, 4: false };
  }
  const hasBrief = Boolean(campaign.title.trim() && campaign.creativeBrief.trim());
  const hasStoryboard = campaign.currentStage >= 2 && campaign.scenes.length > 0;
  const hasAudio =
    campaign.currentStage >= 5 &&
    (Boolean(campaign.activeMusicTakeId) ||
      campaign.scenes.some((s) => Boolean(s.activeTakes.voiceover_audio)));
  const hasFinalCut =
    campaign.currentStage >= 6 &&
    Boolean(campaign.activeMasterTakeId) &&
    !campaign.masterStale;

  return {
    1: hasBrief,
    2: hasStoryboard,
    3: hasAudio,
    4: hasFinalCut,
  };
}

export interface CalmBriefViewState {
  title: string;
  targetAudience: string;
  creativeBrief: string;
  musicalMoodPrompt: string;
  activeTemplateId?: string;
  starterTemplates: StarterCampaignTemplate[];
  showBrandGuardrails: false;
  showCustomBrandKitForm: false;
}

export function buildCalmBriefViewState(
  campaign: CampaignDetail,
  starterTemplates: StarterCampaignTemplate[]
): CalmBriefViewState {
  return {
    title: campaign.title,
    targetAudience: campaign.targetAudience,
    creativeBrief: campaign.creativeBrief,
    musicalMoodPrompt: campaign.musicalMoodPrompt,
    activeTemplateId: campaign.templateId,
    starterTemplates,
    showBrandGuardrails: false,
    showCustomBrandKitForm: false,
  };
}

export type StoryboardMediaPreviewMode = 'image' | 'video';

export const DEFAULT_STORYBOARD_PREVIEW_MODE: StoryboardMediaPreviewMode = 'video';

export interface VoicePresetOption {
  voiceId: string;
  displayName: string;
  gender: 'female' | 'male' | 'neutral';
  defaultStyle: string;
  defaultPrompt: string;
}

export const VOICE_PRESET_OPTIONS: ReadonlyArray<VoicePresetOption> = [
  {
    voiceId: 'Kore',
    displayName: 'Kore — Warm & Crisp Commercial (Default)',
    gender: 'female',
    defaultStyle: 'Crisp, upbeat, fast-paced commercial narrator',
    defaultPrompt:
      'A brisk, upbeat, and clear commercial narrator with crisp modern pacing and engaging warmth.',
  },
  {
    voiceId: 'Puck',
    displayName: 'Puck — Friendly & Playful Storyteller',
    gender: 'neutral',
    defaultStyle: 'Friendly, curious, energetic storyteller',
    defaultPrompt:
      'An enthusiastic, friendly storyteller with bright energy and playful curiosity.',
  },
  {
    voiceId: 'Aoede',
    displayName: 'Aoede — Inspiring & Clear Innovation Host',
    gender: 'female',
    defaultStyle: 'Inspiring, clear innovation presenter',
    defaultPrompt:
      'An articulate, inspiring innovation host with clear diction and forward-looking energy.',
  },
  {
    voiceId: 'Fenrir',
    displayName: 'Fenrir — Bold & Dynamic Keynote Speaker',
    gender: 'male',
    defaultStyle: 'Confident, concise keynote speaker',
    defaultPrompt:
      'A confident, fast-paced keynote presenter with punchy delivery and modern gravitas.',
  },
  {
    voiceId: 'Charon',
    displayName: 'Charon — Deep & Steady Cinema Narrator',
    gender: 'male',
    defaultStyle: 'Warm cinematic storyteller',
    defaultPrompt:
      'A resonant, warm cinematic narrator with smooth pacing and clear articulation.',
  },
];

export const VOICE_SPEED_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 1.25, label: '1.25x — Fast & Energetic (Recommended)' },
  { value: 1.15, label: '1.15x — Crisp Commercial Pace' },
  { value: 1.4, label: '1.40x — Rapid High-Energy Pace' },
  { value: 1.0, label: '1.00x — Standard Natural Pace' },
  { value: 0.95, label: '0.95x — Measured Storyteller' },
];

export const VOICE_STYLE_OPTIONS: ReadonlyArray<string> = [
  'Crisp, upbeat, fast-paced commercial narrator',
  'Friendly, curious, energetic storyteller',
  'Inspiring, clear innovation presenter',
  'Confident, concise keynote speaker',
  'Warm cinematic storyteller',
];

export const MUSIC_GENRE_OPTIONS: ReadonlyArray<string> = [
  'Playful, upbeat orchestral adventure',
  'Upbeat indie electronic synth pulse',
  'Crisp, modern keynote pulse',
  'Crystalline ambient piano & warm synth pad',
  'High-energy cinematic percussion & brass',
];

export const MUSIC_TEMPO_OPTIONS: ReadonlyArray<string> = [
  '120 BPM (Fast & Upbeat)',
  '128 BPM (High-Energy Drive)',
  '112 BPM (Crisp Modern Groove)',
  '96 BPM (Steady Cinematic Pulse)',
  '84 BPM (Calm & Atmospheric)',
];

export const MUSIC_INSTRUMENT_OPTIONS: ReadonlyArray<string> = [
  'Bright Pizzicato Strings, Glockenspiel & Cheerful Horns',
  'Warm Analog Synths, Acoustic Guitar & Snappy Drums',
  'Confident Piano, Soaring Strings & Subtle Sub-Bass',
  'Full Symphony Brass, Cello Section & Timpani',
];

export function composeSoundtrackPromptFromSelections(params: {
  genre: string;
  tempo: string;
  instruments: string;
}): string {
  return `${params.genre} featuring ${params.instruments} at ${params.tempo}.`;
}

export interface VisualSceneCardViewModel {
  sceneId: string;
  sceneNumber: number;
  title: string;
  targetDurationSeconds: number;
  spokenNarrationPreview: string;
  previewMode: StoryboardMediaPreviewMode;
  activeMediaUrl?: string;
  posterImageUrl?: string;
  activeModality: 'keyframe_start' | 'motion_video';
  hasKeyframe: boolean;
  hasMotionVideo: boolean;
  isStale: boolean;
  staleSummary: string | null;
  openTextareaCount: 0;
}

export function buildVisualSceneCards(
  campaign: CampaignDetail,
  previewMode: StoryboardMediaPreviewMode = DEFAULT_STORYBOARD_PREVIEW_MODE
): VisualSceneCardViewModel[] {
  const findTake = (takeId?: string): AssetTake | undefined =>
    takeId ? campaign.takes.find((t) => t.id === takeId) : undefined;

  return campaign.scenes.map((scene: Scene, idx: number) => {
    const kfTake = findTake(scene.activeTakes.keyframe_start);
    const vidTake = findTake(scene.activeTakes.motion_video);
    const activeModality = previewMode === 'video' ? 'motion_video' : 'keyframe_start';
    const activeTake = previewMode === 'video' ? vidTake : kfTake;

    const staleLabels = [
      scene.stale.keyframe_start ? 'Keyframe' : null,
      scene.stale.motion_video ? 'Motion' : null,
      scene.stale.voiceover_audio ? 'Voiceover' : null,
    ].filter(Boolean);

    return {
      sceneId: scene.id,
      sceneNumber: idx + 1,
      title: scene.title,
      targetDurationSeconds: scene.targetDurationSeconds,
      spokenNarrationPreview: scene.voiceoverScript,
      previewMode,
      activeMediaUrl: activeTake?.mediaUrl,
      posterImageUrl: kfTake?.mediaUrl,
      activeModality,
      hasKeyframe: Boolean(kfTake),
      hasMotionVideo: Boolean(vidTake),
      isStale: staleLabels.length > 0,
      staleSummary: staleLabels.length > 0 ? `Out of Sync: ${staleLabels.join(', ')}` : null,
      openTextareaCount: 0,
    };
  });
}

export interface SceneInspectorModalViewModel {
  sceneId: string;
  sceneNumber: number;
  title: string;
  visualPrompt: string;
  cameraMotionDirective: string;
  voiceoverScript: string;
  activeKeyframeTake?: AssetTake;
  activeMotionTake?: AssetTake;
  keyframeTakes: AssetTake[];
  motionTakes: AssetTake[];
  canExtendMotion: boolean;
}

export function buildSceneInspectorModalState(
  campaign: CampaignDetail,
  sceneId: string | null
): SceneInspectorModalViewModel | null {
  if (!sceneId) return null;
  const idx = campaign.scenes.findIndex((s) => s.id === sceneId);
  if (idx === -1) return null;
  const scene = campaign.scenes[idx];

  const getTakes = (modality: Modality) =>
    campaign.takes.filter((t) => t.sceneId === scene.id && t.modality === modality);

  const activeKeyframeTake = campaign.takes.find(
    (t) => t.id === scene.activeTakes.keyframe_start
  );
  const activeMotionTake = campaign.takes.find(
    (t) => t.id === scene.activeTakes.motion_video
  );

  return {
    sceneId: scene.id,
    sceneNumber: idx + 1,
    title: scene.title,
    visualPrompt: scene.visualPrompt,
    cameraMotionDirective: scene.cameraMotionDirective,
    voiceoverScript: scene.voiceoverScript,
    activeKeyframeTake,
    activeMotionTake,
    keyframeTakes: getTakes('keyframe_start'),
    motionTakes: getTakes('motion_video'),
    canExtendMotion: Boolean(activeMotionTake),
  };
}

export function computeTotalStaleCount(campaign: CampaignDetail | null): number {
  if (!campaign) return 0;
  const sceneStaleCount = campaign.scenes.reduce((acc, s) => {
    return (
      acc +
      (s.stale.keyframe_start ? 1 : 0) +
      (s.stale.keyframe_end ? 1 : 0) +
      (s.stale.motion_video ? 1 : 0) +
      (s.stale.voiceover_audio ? 1 : 0)
    );
  }, 0);
  return sceneStaleCount + (campaign.masterStale ? 1 : 0);
}

export interface StreamlinedAudioViewModel {
  activeNarratorName: string;
  voiceSampleAudioUrl?: string;
  musicalMoodPrompt: string;
  activeMusicMediaUrl?: string;
  scenes: Array<{
    sceneId: string;
    sceneNumber: number;
    title: string;
    voiceoverScript: string;
    isStale: boolean;
    activeVoiceoverUrl?: string;
    activeVoiceoverDurationSeconds?: number;
  }>;
}

export function buildStreamlinedAudioViewState(
  campaign: CampaignDetail
): StreamlinedAudioViewModel {
  const findTake = (takeId?: string): AssetTake | undefined =>
    takeId ? campaign.takes.find((t) => t.id === takeId) : undefined;

  const musicTake = findTake(campaign.activeMusicTakeId);

  return {
    activeNarratorName: campaign.voicePersona.displayName,
    voiceSampleAudioUrl: campaign.voicePersona.sampleAudioUrl,
    musicalMoodPrompt: campaign.musicalMoodPrompt,
    activeMusicMediaUrl: musicTake?.mediaUrl,
    scenes: campaign.scenes.map((scene, idx) => {
      const voTake = findTake(scene.activeTakes.voiceover_audio);
      return {
        sceneId: scene.id,
        sceneNumber: idx + 1,
        title: scene.title,
        voiceoverScript: scene.voiceoverScript,
        isStale: Boolean(scene.stale.voiceover_audio),
        activeVoiceoverUrl: voTake?.mediaUrl,
        activeVoiceoverDurationSeconds: voTake?.durationSeconds,
      };
    }),
  };
}

export interface FinalCutTheaterViewModel {
  masterVideoUrl?: string;
  masterStale: boolean;
  totalDurationSeconds: number;
  sceneTimings: Array<{
    sceneId: string;
    sceneOrder: number;
    sceneTitle: string;
    durationLabel: string;
  }>;
  showBrandEvaluationScorecard: false;
  showRawFfmpegFiltergraph: false;
}

export function buildFinalCutTheaterViewState(
  campaign: CampaignDetail
): FinalCutTheaterViewModel {
  const masterTake = campaign.takes.find((t) => t.id === campaign.activeMasterTakeId);
  const plan = campaign.latestTimelinePlan;

  const sceneTimings = plan
    ? plan.segments.map((seg) => ({
        sceneId: seg.sceneId,
        sceneOrder: seg.sceneOrder,
        sceneTitle: seg.sceneTitle,
        durationLabel: `${seg.startTimeSeconds}s → ${seg.endTimeSeconds}s`,
      }))
    : campaign.scenes.map((s, idx) => ({
        sceneId: s.id,
        sceneOrder: idx + 1,
        sceneTitle: s.title,
        durationLabel: `${s.targetDurationSeconds}s`,
      }));

  const totalDurationSeconds = plan
    ? plan.totalDurationSeconds
    : campaign.scenes.reduce((acc, s) => acc + s.targetDurationSeconds, 0);

  return {
    masterVideoUrl: masterTake?.mediaUrl,
    masterStale: campaign.masterStale,
    totalDurationSeconds,
    sceneTimings,
    showBrandEvaluationScorecard: false,
    showRawFfmpegFiltergraph: false,
  };
}
