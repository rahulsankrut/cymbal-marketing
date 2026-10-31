export type Modality =
  | 'anchor_image'
  | 'keyframe_start'
  | 'keyframe_end'
  | 'motion_video'
  | 'voiceover_audio'
  | 'music_score'
  | 'master_video';

export type StudioStageNumber = 1 | 2 | 3 | 4 | 5 | 6;

export interface BrandColorToken {
  name: string;
  hex: string;
  usage: string;
}

export interface VoicePersonaConfig {
  voiceId: string;
  displayName: string;
  gender: 'male' | 'female' | 'neutral';
  languageCode: string;
  personaPrompt: string;
  speakingRate?: number;
  vocalStylePreset?: string;
  sampleAudioUrl?: string;
  isDesignedVoice?: boolean;
}

export interface BrandKit {
  id: string;
  name: string;
  organization: string;
  tagline: string;
  visualIdentityRules: string[];
  aerospaceRealismRules: string[];
  regulatoryClaimGuardrails: string[];
  colorPalette: BrandColorToken[];
  defaultVoicePersona: VoicePersonaConfig;
  defaultMusicPrompt: string;
  isDefault?: boolean;
  updatedAt: string;
}

export interface StarterCampaignTemplate {
  id: string;
  title: string;
  subtitle: string;
  targetAudience: string;
  spotDurationSeconds: number;
  aspectRatio: '16:9' | '9:16';
  creativeBrief: string;
  keyProductClaims: string[];
  musicalMoodPrompt: string;
  suggestedAnchors: Array<{
    name: string;
    category: 'aircraft' | 'avionics' | 'character' | 'environment';
    description: string;
    generationPrompt: string;
  }>;
}

export interface ReferenceAnchor {
  id: string;
  campaignId: string;
  name: string;
  category: 'aircraft' | 'avionics' | 'character' | 'environment';
  description: string;
  generationPrompt: string;
  activeTakeId?: string;
  imageUrl?: string;
  mimeType?: string;
  interactionId?: string;
  createdAt: string;
}

export interface AssetTake {
  id: string;
  campaignId: string;
  sceneId: string | null;
  modality: Modality;
  modelId: string;
  interactionId: string;
  parentInteractionId?: string;
  prompt: string;
  mediaUrl: string;
  mimeType: string;
  durationSeconds?: number;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  latencyMs?: number;
  createdAt: string;
}

export interface SceneStaleState {
  keyframe_start?: boolean;
  keyframe_end?: boolean;
  motion_video?: boolean;
  voiceover_audio?: boolean;
}

export interface Scene {
  id: string;
  campaignId: string;
  orderIndex: number;
  title: string;
  narrativeBeat: string;
  visualPrompt: string;
  endFramePrompt?: string;
  cameraMotionDirective: string;
  voiceoverScript: string;
  vocalStyleDirective: string;
  targetDurationSeconds: number;
  anchorIds: string[];
  activeTakes: Partial<Record<Modality, string>>;
  stale: SceneStaleState;
  updatedAt: string;
}

export interface BrandEvaluationFinding {
  id: string;
  sceneId: string | null;
  sceneNumber?: number;
  modality: 'keyframe_start' | 'motion_video' | 'voiceover_audio' | 'script';
  category:
    | 'visual_identity'
    | 'aerospace_realism'
    | 'narrative_audio_cohesion'
    | 'regulatory_compliance';
  severity: 'critical' | 'warning' | 'info';
  issue: string;
  suggestedFixPrompt: string;
  resolved: boolean;
  resolvedTakeId?: string;
}

export interface BrandEvaluationReport {
  id: string;
  campaignId: string;
  interactionId: string;
  modelId: string;
  overallScore: number;
  categoryScores: {
    visualIdentity: number;
    aerospaceRealism: number;
    narrativeAudioCohesion: number;
    regulatoryCompliance: number;
  };
  executiveSummary: string;
  findings: BrandEvaluationFinding[];
  evaluatedAt: string;
}

export interface SceneTimelineSegment {
  sceneId: string;
  sceneOrder: number;
  sceneTitle: string;
  videoUrl?: string;
  voiceoverUrl?: string;
  videoDurationSeconds: number;
  voiceoverDurationSeconds: number;
  effectiveSceneDurationSeconds: number;
  startTimeSeconds: number;
  endTimeSeconds: number;
  silencePaddingSeconds: number;
  voiceoverOverflowSeconds: number;
  needsVideoExtension: boolean;
  duckingIntervals: Array<{
    startSeconds: number;
    endSeconds: number;
    attenuationDb: number;
  }>;
}

export interface TimelineAssemblyPlan {
  campaignId: string;
  totalDurationSeconds: number;
  musicScoreUrl?: string;
  musicAttenuationDb: number;
  segments: SceneTimelineSegment[];
  warnings: string[];
  ffmpegFilterComplex: string;
}

export interface CampaignDetail {
  id: string;
  title: string;
  brandKitId: string;
  templateId?: string;
  targetAudience: string;
  spotDurationSeconds: number;
  aspectRatio: '16:9' | '9:16';
  creativeBrief: string;
  keyProductClaims: string[];
  musicalMoodPrompt: string;
  currentStage: StudioStageNumber;
  voicePersona: VoicePersonaConfig;
  anchors: ReferenceAnchor[];
  scenes: Scene[];
  takes: AssetTake[];
  activeMusicTakeId?: string;
  activeMasterTakeId?: string;
  masterStale: boolean;
  latestBrandEvaluation?: BrandEvaluationReport;
  latestTimelinePlan?: TimelineAssemblyPlan;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignSummary {
  id: string;
  title: string;
  brandKitId: string;
  currentStage: StudioStageNumber;
  sceneCount: number;
  overallBrandScore?: number;
  masterStale: boolean;
  updatedAt: string;
}

export interface StudioSSEEvent {
  id: string;
  campaignId: string;
  type: 'job.started' | 'job.progress' | 'job.completed' | 'job.failed';
  stage: StudioStageNumber;
  sceneId?: string | null;
  modality?: Modality | 'storyboard' | 'brand_eval' | 'voice_design';
  modelId: string;
  message: string;
  interactionId?: string;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  latencyMs?: number;
  timestamp: string;
}
