import { randomUUID } from 'node:crypto';
import type {
  AssetTake,
  BrandEvaluationReport,
  CampaignDetail,
  Modality,
  ReferenceAnchor,
  StudioSSEEvent,
  StudioStageNumber,
  TimelineAssemblyPlan,
  VoicePersonaConfig,
} from '../../shared/types.js';
import type { CampaignVault } from '../vault/campaignVault.js';
import type { GeminiStudioGateway } from '../gemini/geminiStudioGateway.js';
import { MasterTimelineAssembler } from '../assembler/masterTimelineAssembler.js';

export type SSEListener = (event: StudioSSEEvent) => void;

export interface SceneGenerationInput {
  campaignId: string;
  sceneId: string;
  modality: 'keyframe_start' | 'keyframe_end' | 'motion_video' | 'voiceover_audio';
  promptOverride?: string;
  conversationalEdit?: boolean;
  extendVideo?: boolean;
  durationSeconds?: number;
}

export class StudioPipelineOrchestrator {
  private readonly vault: CampaignVault;
  private readonly gateway: GeminiStudioGateway;
  private readonly assembler: MasterTimelineAssembler;
  private readonly listeners = new Map<string, Set<SSEListener>>();

  constructor(deps: {
    vault: CampaignVault;
    gateway: GeminiStudioGateway;
    assembler?: MasterTimelineAssembler;
  }) {
    this.vault = deps.vault;
    this.gateway = deps.gateway;
    this.assembler = deps.assembler || new MasterTimelineAssembler({ vault: deps.vault });
  }

  public subscribeEvents(campaignId: string, listener: SSEListener): () => void {
    if (!this.listeners.has(campaignId)) {
      this.listeners.set(campaignId, new Set());
    }
    this.listeners.get(campaignId)!.add(listener);
    return () => {
      this.listeners.get(campaignId)?.delete(listener);
    };
  }

  public emitEvent(event: Omit<StudioSSEEvent, 'id' | 'timestamp'>): StudioSSEEvent {
    const fullEvent: StudioSSEEvent = {
      ...event,
      id: `evt-${randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
    };
    const set = this.listeners.get(event.campaignId);
    if (set) {
      for (const listener of set) {
        listener(fullEvent);
      }
    }
    return fullEvent;
  }

  public async generateAnchorImage(
    campaignId: string,
    anchorId: string,
    promptOverride?: string
  ): Promise<ReferenceAnchor> {
    const campaign = await this.vault.getCampaign(campaignId);
    const anchor = campaign.anchors.find((a) => a.id === anchorId);
    if (!anchor) {
      throw new Error(`Reference Anchor not found: ${anchorId}`);
    }

    const prompt = promptOverride || anchor.generationPrompt;
    this.emitEvent({
      campaignId,
      type: 'job.started',
      stage: 3,
      sceneId: null,
      modality: 'anchor_image',
      modelId: 'gemini-nano-banana-2.1',
      message: `Generating Reference Anchor "${anchor.name}" via Nano Banana 2.1...`,
    });

    let result;
    try {
      result = await this.gateway.generateOrEditImage({
        campaignId,
        sceneId: null,
        modality: 'anchor_image',
        prompt,
        previousInteractionId: promptOverride && anchor.interactionId ? anchor.interactionId : undefined,
      });
    } catch (err) {
      this.emitEvent({
        campaignId,
        type: 'job.failed',
        stage: 3,
        sceneId: null,
        modality: 'anchor_image',
        modelId: 'gemini-nano-banana-2.1',
        message: `Anchor generation failed: ${(err as Error).message}`,
      });
      throw err;
    }

    const take = await this.vault.appendTake({
      campaignId,
      sceneId: null,
      modality: 'anchor_image',
      modelId: result.modelId,
      interactionId: result.interactionId,
      parentInteractionId: result.parentInteractionId,
      prompt,
      mediaBase64: result.dataBase64,
      mimeType: result.mimeType,
      fileExtension: result.fileExtension,
      tokenUsage: result.tokenUsage,
      latencyMs: result.latencyMs,
      setAsActive: false,
    });

    const updatedAnchor = await this.vault.upsertReferenceAnchor(campaignId, {
      ...anchor,
      generationPrompt: prompt,
      imageUrl: take.mediaUrl,
      mimeType: take.mimeType,
      interactionId: take.interactionId,
      activeTakeId: take.id,
    });

    this.emitEvent({
      campaignId,
      type: 'job.completed',
      stage: 3,
      sceneId: null,
      modality: 'anchor_image',
      modelId: result.modelId,
      interactionId: result.interactionId,
      tokenUsage: result.tokenUsage,
      latencyMs: result.latencyMs,
      message: `Reference Anchor "${anchor.name}" ready.`,
    });

    return updatedAnchor;
  }

  public async runSceneStageJob(input: SceneGenerationInput): Promise<AssetTake> {
    const campaign = await this.vault.getCampaign(input.campaignId);
    const scene = campaign.scenes.find((s) => s.id === input.sceneId);
    if (!scene) {
      throw new Error(`Scene not found: ${input.sceneId}`);
    }

    const activeTakeId = scene.activeTakes[input.modality];
    const activeTake = campaign.takes.find((t) => t.id === activeTakeId);
    const previousInteractionId =
      (input.conversationalEdit || input.extendVideo) && activeTake?.interactionId
        ? activeTake.interactionId
        : undefined;

    if (input.modality === 'keyframe_start' || input.modality === 'keyframe_end') {
      const prompt =
        input.promptOverride ||
        (input.modality === 'keyframe_end'
          ? scene.endFramePrompt || scene.visualPrompt
          : scene.visualPrompt);

      // Gather linked Reference Anchor images for multi-image fusion (up to 14)
      const referenceImagePaths: Array<{ dataBase64: string; mimeType: string }> = [];
      for (const anchorId of scene.anchorIds) {
        const anchor = campaign.anchors.find((a) => a.id === anchorId);
        const media = this.gateway.readVaultMediaAsBase64(anchor?.imageUrl);
        if (media) {
          referenceImagePaths.push(media);
        }
      }

      this.emitEvent({
        campaignId: campaign.id,
        type: 'job.started',
        stage: 3,
        sceneId: scene.id,
        modality: input.modality,
        modelId: 'gemini-nano-banana-2.1',
        message: `${previousInteractionId ? 'Conversationally editing' : 'Generating'} ${input.modality} for "${scene.title}"...`,
      });

      let result;
      try {
        result = await this.gateway.generateOrEditImage({
          campaignId: campaign.id,
          sceneId: scene.id,
          modality: input.modality,
          prompt,
          referenceImagePaths,
          previousInteractionId,
        });
      } catch (err) {
        this.emitEvent({
          campaignId: campaign.id,
          type: 'job.failed',
          stage: 3,
          sceneId: scene.id,
          modality: input.modality,
          modelId: 'gemini-nano-banana-2.1',
          message: `Keyframe generation failed for "${scene.title}": ${(err as Error).message}`,
        });
        throw err;
      }

      const take = await this.vault.appendTake({
        campaignId: campaign.id,
        sceneId: scene.id,
        modality: input.modality,
        modelId: result.modelId,
        interactionId: result.interactionId,
        parentInteractionId: result.parentInteractionId,
        prompt,
        mediaBase64: result.dataBase64,
        mimeType: result.mimeType,
        fileExtension: result.fileExtension,
        tokenUsage: result.tokenUsage,
        latencyMs: result.latencyMs,
      });

      const latestCampaign = await this.vault.getCampaign(campaign.id);
      if (latestCampaign.currentStage < 3) {
        await this.vault.updateCampaignMeta(campaign.id, { currentStage: 3 });
      }

      this.emitEvent({
        campaignId: campaign.id,
        type: 'job.completed',
        stage: 3,
        sceneId: scene.id,
        modality: input.modality,
        modelId: result.modelId,
        interactionId: result.interactionId,
        tokenUsage: result.tokenUsage,
        latencyMs: result.latencyMs,
        message: `Keyframe take ${take.id} completed for "${scene.title}".`,
      });

      return take;
    }

    if (input.modality === 'motion_video') {
      const prompt =
        input.promptOverride ||
        (input.extendVideo
          ? `Extend this scene smoothly: ${scene.cameraMotionDirective}`
          : `${scene.cameraMotionDirective}. ${scene.visualPrompt}`);

      const startKfTake = campaign.takes.find((t) => t.id === scene.activeTakes.keyframe_start);
      const endKfTake = campaign.takes.find((t) => t.id === scene.activeTakes.keyframe_end);
      const startKeyframe =
        this.gateway.readVaultMediaAsBase64(startKfTake?.mediaUrl) || undefined;
      const endKeyframe =
        this.gateway.readVaultMediaAsBase64(endKfTake?.mediaUrl) || undefined;
      const sourceVideoForExtension = input.extendVideo
        ? this.gateway.readVaultMediaAsBase64(activeTake?.mediaUrl) || undefined
        : undefined;

      this.emitEvent({
        campaignId: campaign.id,
        type: 'job.started',
        stage: 4,
        sceneId: scene.id,
        modality: 'motion_video',
        modelId: 'gemini-omni-1.1-flash',
        message: `${input.extendVideo ? 'Extending' : previousInteractionId ? 'Conversationally editing' : 'Synthesizing'} motion clip for "${scene.title}"...`,
      });

      const targetDuration = input.extendVideo
        ? (activeTake?.durationSeconds || scene.targetDurationSeconds) + 4
        : input.durationSeconds || scene.targetDurationSeconds;

      let result;
      try {
        result = await this.gateway.synthesizeOrEditVideo({
          campaignId: campaign.id,
          sceneId: scene.id,
          prompt,
          startKeyframe,
          endKeyframe,
          sourceVideoForExtension,
          previousInteractionId,
          durationSeconds: targetDuration,
        });
      } catch (err) {
        this.emitEvent({
          campaignId: campaign.id,
          type: 'job.failed',
          stage: 4,
          sceneId: scene.id,
          modality: 'motion_video',
          modelId: 'gemini-omni-1.1-flash',
          message: `Motion video synthesis failed for "${scene.title}": ${(err as Error).message}`,
        });
        throw err;
      }

      const take = await this.vault.appendTake({
        campaignId: campaign.id,
        sceneId: scene.id,
        modality: 'motion_video',
        modelId: result.modelId,
        interactionId: result.interactionId,
        parentInteractionId: result.parentInteractionId,
        prompt,
        mediaBase64: result.dataBase64,
        mimeType: result.mimeType,
        fileExtension: result.fileExtension,
        durationSeconds: result.durationSeconds,
        tokenUsage: result.tokenUsage,
        latencyMs: result.latencyMs,
      });

      const latestCampaign = await this.vault.getCampaign(campaign.id);
      if (latestCampaign.currentStage < 4) {
        await this.vault.updateCampaignMeta(campaign.id, { currentStage: 4 });
      }

      this.emitEvent({
        campaignId: campaign.id,
        type: 'job.completed',
        stage: 4,
        sceneId: scene.id,
        modality: 'motion_video',
        modelId: result.modelId,
        interactionId: result.interactionId,
        tokenUsage: result.tokenUsage,
        latencyMs: result.latencyMs,
        message: `Motion video take ${take.id} ready for "${scene.title}".`,
      });

      return take;
    }

    // voiceover_audio
    const text = input.promptOverride || scene.voiceoverScript;
    this.emitEvent({
      campaignId: campaign.id,
      type: 'job.started',
      stage: 5,
      sceneId: scene.id,
      modality: 'voiceover_audio',
      modelId: 'gemini-3.8-flash-tts',
      message: `Synthesizing voiceover for "${scene.title}" with voice "${campaign.voicePersona.displayName}"...`,
    });

    let result;
    try {
      result = await this.gateway.synthesizeSceneVoiceover({
        campaignId: campaign.id,
        sceneId: scene.id,
        text,
        vocalStyleDirective:
          campaign.voicePersona.vocalStylePreset || scene.vocalStyleDirective,
        voiceId: campaign.voicePersona.voiceId,
        speakingRate: campaign.voicePersona.speakingRate,
        previousInteractionId,
      });
    } catch (err) {
      this.emitEvent({
        campaignId: campaign.id,
        type: 'job.failed',
        stage: 5,
        sceneId: scene.id,
        modality: 'voiceover_audio',
        modelId: 'gemini-3.8-flash-tts',
        message: `Voiceover synthesis failed for "${scene.title}": ${(err as Error).message}`,
      });
      throw err;
    }

    const take = await this.vault.appendTake({
      campaignId: campaign.id,
      sceneId: scene.id,
      modality: 'voiceover_audio',
      modelId: result.modelId,
      interactionId: result.interactionId,
      parentInteractionId: result.parentInteractionId,
      prompt: text,
      mediaBase64: result.dataBase64,
      mimeType: result.mimeType,
      fileExtension: result.fileExtension,
      durationSeconds: result.durationSeconds,
      tokenUsage: result.tokenUsage,
      latencyMs: result.latencyMs,
    });

    const latestCampaign = await this.vault.getCampaign(campaign.id);
    if (latestCampaign.currentStage < 5) {
      await this.vault.updateCampaignMeta(campaign.id, { currentStage: 5 });
    }

    this.emitEvent({
      campaignId: campaign.id,
      type: 'job.completed',
      stage: 5,
      sceneId: scene.id,
      modality: 'voiceover_audio',
      modelId: result.modelId,
      interactionId: result.interactionId,
      tokenUsage: result.tokenUsage,
      latencyMs: result.latencyMs,
      message: `Voiceover take ${take.id} ready for "${scene.title}".`,
    });

    return take;
  }

  public async runBatchStageJob(params: {
    campaignId: string;
    modality: 'keyframe_start' | 'motion_video' | 'voiceover_audio';
    sceneIds?: string[];
  }): Promise<AssetTake[]> {
    const campaign = await this.vault.getCampaign(params.campaignId);
    const targetScenes = params.sceneIds
      ? campaign.scenes.filter((s) => params.sceneIds!.includes(s.id))
      : campaign.scenes;

    // Generate all scene assets concurrently via Promise.all
    const results = await Promise.all(
      targetScenes.map((scene) =>
        this.runSceneStageJob({
          campaignId: params.campaignId,
          sceneId: scene.id,
          modality: params.modality,
        })
      )
    );
    return results;
  }

  public async generateCampaignMusicScore(params: {
    campaignId: string;
    promptOverride?: string;
    modelId?: 'lyria-3.5' | 'lyria-3-clip-preview';
  }): Promise<AssetTake> {
    const campaign = await this.vault.getCampaign(params.campaignId);
    const prompt = params.promptOverride || campaign.musicalMoodPrompt;
    const modelId = params.modelId || 'lyria-3.5';

    // Collect up to 10 active storyboard keyframe images as multimodal conditioning inputs
    const keyframeImages: Array<{ dataBase64: string; mimeType: string }> = [];
    for (const scene of campaign.scenes) {
      const kfTakeId = scene.activeTakes.keyframe_start;
      const kfTake = campaign.takes.find((t) => t.id === kfTakeId);
      const media = this.gateway.readVaultMediaAsBase64(kfTake?.mediaUrl);
      if (media) {
        keyframeImages.push(media);
      }
    }

    this.emitEvent({
      campaignId: campaign.id,
      type: 'job.started',
      stage: 5,
      sceneId: null,
      modality: 'music_score',
      modelId,
      message: `Composing campaign score via ${modelId} conditioned on ${keyframeImages.length} storyboard keyframes...`,
    });

    const totalTargetDuration =
      campaign.scenes.reduce((acc, s) => acc + (s.targetDurationSeconds || 6), 0) ||
      campaign.spotDurationSeconds;

    let result;
    try {
      result = await this.gateway.composeCampaignMusic({
        campaignId: campaign.id,
        prompt,
        keyframeImages,
        modelId,
        durationSeconds: totalTargetDuration,
      });
    } catch (err) {
      this.emitEvent({
        campaignId: campaign.id,
        type: 'job.failed',
        stage: 5,
        sceneId: null,
        modality: 'music_score',
        modelId,
        message: `Music score composition failed: ${(err as Error).message}`,
      });
      throw err;
    }

    const take = await this.vault.appendTake({
      campaignId: campaign.id,
      sceneId: null,
      modality: 'music_score',
      modelId: result.modelId,
      interactionId: result.interactionId,
      prompt,
      mediaBase64: result.dataBase64,
      mimeType: result.mimeType,
      fileExtension: result.fileExtension,
      durationSeconds: result.durationSeconds,
      tokenUsage: result.tokenUsage,
      latencyMs: result.latencyMs,
    });

    if (campaign.currentStage < 5) {
      await this.vault.updateCampaignMeta(campaign.id, { currentStage: 5 });
    }

    this.emitEvent({
      campaignId: campaign.id,
      type: 'job.completed',
      stage: 5,
      sceneId: null,
      modality: 'music_score',
      modelId: result.modelId,
      interactionId: result.interactionId,
      tokenUsage: result.tokenUsage,
      latencyMs: result.latencyMs,
      message: `Lyria campaign soundtrack (${take.id}) composed.`,
    });

    return take;
  }

  public async applyBrandFindingAutoFix(
    campaignId: string,
    findingId: string
  ): Promise<{
    campaign: CampaignDetail;
    remediatedTake?: AssetTake;
    evaluation: BrandEvaluationReport;
  }> {
    const campaign = await this.vault.getCampaign(campaignId);
    const evalReport = campaign.latestBrandEvaluation;
    if (!evalReport) {
      throw new Error(`No brand evaluation report found for campaign ${campaignId}`);
    }
    const finding = evalReport.findings.find((f) => f.id === findingId);
    if (!finding) {
      throw new Error(`Finding not found: ${findingId}`);
    }

    const targetScene =
      campaign.scenes.find((s) => s.id === finding.sceneId) || campaign.scenes[0];
    if (!targetScene) {
      throw new Error(`Target scene not found for finding ${findingId}`);
    }

    let remediatedTake: AssetTake | undefined;
    if (finding.modality === 'script') {
      await this.vault.updateScene(campaignId, targetScene.id, {
        voiceoverScript: finding.suggestedFixPrompt,
      });
      remediatedTake = await this.runSceneStageJob({
        campaignId,
        sceneId: targetScene.id,
        modality: 'voiceover_audio',
        promptOverride: finding.suggestedFixPrompt,
        conversationalEdit: true,
      });
    } else {
      const targetModality: 'keyframe_start' | 'motion_video' | 'voiceover_audio' =
        finding.modality;
      remediatedTake = await this.runSceneStageJob({
        campaignId,
        sceneId: targetScene.id,
        modality: targetModality,
        promptOverride: finding.suggestedFixPrompt,
        conversationalEdit: true,
      });
    }

    finding.resolved = true;
    finding.resolvedTakeId = remediatedTake?.id;
    // Boost compliance score modestly when a finding is remediated
    evalReport.overallScore = Math.min(100, evalReport.overallScore + 5);
    await this.vault.saveBrandEvaluation(campaignId, evalReport);

    const updatedCampaign = await this.vault.getCampaign(campaignId);
    return {
      campaign: updatedCampaign,
      remediatedTake,
      evaluation: evalReport,
    };
  }

  public async runStoryboardStage(
    campaignId: string,
    sceneCount = 3
  ): Promise<CampaignDetail> {
    const campaign = await this.vault.getCampaign(campaignId);
    const brandKit =
      (await this.vault.getBrandKit(campaign.brandKitId)) ||
      (await this.vault.listBrandKits())[0];

    this.emitEvent({
      campaignId: campaign.id,
      type: 'job.started',
      stage: 2,
      sceneId: null,
      modality: 'storyboard',
      modelId: 'gemini-3.8-flash',
      message: `Generating ${sceneCount}-scene storyboard via Gemini 3.8 Flash Structured Outputs...`,
    });

    try {
      const result = await this.gateway.generateStoryboard(campaign, brandKit, sceneCount);
      await this.vault.saveStoryboardScenes(campaign.id, result.scenes, 2);

      this.emitEvent({
        campaignId: campaign.id,
        type: 'job.completed',
        stage: 2,
        sceneId: null,
        modality: 'storyboard',
        modelId: result.modelId,
        interactionId: result.interactionId,
        tokenUsage: result.tokenUsage,
        latencyMs: result.latencyMs,
        message: `Generated ${result.scenes.length} storyboard scenes.`,
      });

      return await this.vault.getCampaign(campaign.id);
    } catch (err) {
      this.emitEvent({
        campaignId,
        type: 'job.failed',
        stage: 2,
        sceneId: null,
        modality: 'storyboard',
        modelId: 'gemini-3.8-flash',
        message: `Storyboard generation failed: ${(err as Error).message}`,
      });
      throw err;
    }
  }

  public async designVoicePersonaStage(
    campaignId: string,
    input: {
      displayName: string;
      gender: 'female' | 'male' | 'neutral';
      languageCode: string;
      personaPrompt: string;
    }
  ): Promise<{ voicePersona: VoicePersonaConfig; campaign: CampaignDetail }> {
    this.emitEvent({
      campaignId,
      type: 'job.started',
      stage: 5,
      sceneId: null,
      modality: 'voiceover_audio',
      modelId: 'gemini-3.8-flash-tts',
      message: `Designing custom narrator voice persona "${input.displayName}"...`,
    });

    try {
      const voicePersona = await this.gateway.designVoicePersona(campaignId, input);
      const campaign = await this.vault.updateCampaignMeta(campaignId, { voicePersona });

      this.emitEvent({
        campaignId,
        type: 'job.completed',
        stage: 5,
        sceneId: null,
        modality: 'voiceover_audio',
        modelId: 'gemini-3.8-flash-tts',
        interactionId: voicePersona.voiceId,
        message: `Voice persona "${voicePersona.displayName}" (${voicePersona.voiceId}) created.`,
      });

      return { voicePersona, campaign };
    } catch (err) {
      this.emitEvent({
        campaignId,
        type: 'job.failed',
        stage: 5,
        sceneId: null,
        modality: 'voiceover_audio',
        modelId: 'gemini-3.8-flash-tts',
        message: `Voice persona design failed: ${(err as Error).message}`,
      });
      throw err;
    }
  }

  public async runBrandEvaluationStage(
    campaignId: string
  ): Promise<{ report: BrandEvaluationReport; campaign: CampaignDetail }> {
    const campaign = await this.vault.getCampaign(campaignId);
    const brandKit =
      (await this.vault.getBrandKit(campaign.brandKitId)) ||
      (await this.vault.listBrandKits())[0];

    this.emitEvent({
      campaignId: campaign.id,
      type: 'job.started',
      stage: 6,
      sceneId: null,
      modality: 'brand_eval',
      modelId: 'gemini-3.8-flash',
      message:
        'Inspecting multimodal keyframes, motion videos, and voiceovers against Cymbal Aerospace Brand Kit...',
    });

    try {
      const report = await this.gateway.evaluateCampaignBrandCompliance(campaign, brandKit);
      await this.vault.saveBrandEvaluation(campaign.id, report);

      this.emitEvent({
        campaignId: campaign.id,
        type: 'job.completed',
        stage: 6,
        sceneId: null,
        modality: 'brand_eval',
        modelId: report.modelId,
        interactionId: report.interactionId,
        message: `Brand Evaluation complete: ${report.overallScore}/100 overall compliance score.`,
      });

      const updated = await this.vault.getCampaign(campaign.id);
      return { report, campaign: updated };
    } catch (err) {
      this.emitEvent({
        campaignId,
        type: 'job.failed',
        stage: 6,
        sceneId: null,
        modality: 'brand_eval',
        modelId: 'gemini-3.8-flash',
        message: `Brand Evaluation failed: ${(err as Error).message}`,
      });
      throw err;
    }
  }

  public async runMasterAssemblyStage(campaignId: string): Promise<{
    masterTake: AssetTake;
    timelinePlan: TimelineAssemblyPlan;
    campaign: CampaignDetail;
  }> {
    this.emitEvent({
      campaignId,
      type: 'job.started',
      stage: 6,
      sceneId: null,
      modality: 'master_video',
      modelId: 'ffmpeg-master-assembler',
      message: 'Assembling FFmpeg Master Cut with -12dB voiceover audio ducking...',
    });

    try {
      const result = await this.assembler.assembleMasterCut(campaignId);

      this.emitEvent({
        campaignId,
        type: 'job.completed',
        stage: 6,
        sceneId: null,
        modality: 'master_video',
        modelId: 'ffmpeg-master-assembler',
        interactionId: result.masterTake.interactionId,
        message: `Master Cut (${result.masterTake.id}, ${result.timelinePlan.totalDurationSeconds}s) assembled with -12dB music ducking.`,
      });

      const campaign = await this.vault.getCampaign(campaignId);
      return { ...result, campaign };
    } catch (err) {
      this.emitEvent({
        campaignId,
        type: 'job.failed',
        stage: 6,
        sceneId: null,
        modality: 'master_video',
        modelId: 'ffmpeg-master-assembler',
        message: `Master Cut assembly failed: ${(err as Error).message}`,
      });
      throw err;
    }
  }
}
