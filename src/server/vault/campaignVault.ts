import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type {
  AssetTake,
  BrandEvaluationReport,
  BrandKit,
  CampaignDetail,
  CampaignSummary,
  Modality,
  ReferenceAnchor,
  Scene,
  StarterCampaignTemplate,
  StudioStageNumber,
  TimelineAssemblyPlan,
  VoicePersonaConfig,
} from '../../shared/types.js';
import { DEFAULT_CYMBAL_BRAND_KIT, STARTER_CAMPAIGN_TEMPLATES } from './seedData.js';

interface VaultDatabaseSchema {
  brandKits: BrandKit[];
  starterTemplates: StarterCampaignTemplate[];
  campaigns: CampaignDetail[];
}

export interface CreateCampaignInput {
  title?: string;
  brandKitId?: string;
  templateId?: string;
  targetAudience?: string;
  spotDurationSeconds?: number;
  aspectRatio?: '16:9' | '9:16';
  creativeBrief?: string;
  keyProductClaims?: string[];
  musicalMoodPrompt?: string;
}

export interface BrandKitInput {
  id?: string;
  name: string;
  organization: string;
  tagline: string;
  visualIdentityRules: string[];
  aerospaceRealismRules: string[];
  regulatoryClaimGuardrails: string[];
  colorPalette: BrandKit['colorPalette'];
  defaultVoicePersona: VoicePersonaConfig;
  defaultMusicPrompt: string;
}

export interface ReferenceAnchorInput {
  id?: string;
  name: string;
  category: ReferenceAnchor['category'];
  description: string;
  generationPrompt: string;
  imageUrl?: string;
  mimeType?: string;
  interactionId?: string;
  activeTakeId?: string;
}

export interface SceneDraftInput {
  id?: string;
  title: string;
  narrativeBeat: string;
  visualPrompt: string;
  endFramePrompt?: string;
  cameraMotionDirective: string;
  voiceoverScript: string;
  vocalStyleDirective: string;
  targetDurationSeconds: number;
  anchorIds?: string[];
}

export interface ScenePatchInput {
  title?: string;
  narrativeBeat?: string;
  visualPrompt?: string;
  endFramePrompt?: string;
  cameraMotionDirective?: string;
  voiceoverScript?: string;
  vocalStyleDirective?: string;
  targetDurationSeconds?: number;
  anchorIds?: string[];
  orderIndex?: number;
}

export interface AppendTakeInput {
  campaignId: string;
  sceneId: string | null;
  modality: Modality;
  modelId: string;
  interactionId: string;
  parentInteractionId?: string;
  prompt: string;
  mediaBuffer?: Buffer;
  mediaBase64?: string;
  mimeType: string;
  fileExtension: string;
  durationSeconds?: number;
  tokenUsage?: AssetTake['tokenUsage'];
  latencyMs?: number;
  setAsActive?: boolean;
}

export class CampaignVault {
  private readonly dataDir: string;
  private readonly mediaDir: string;
  private readonly dbFilePath: string;

  constructor(baseDir: string) {
    this.dataDir = baseDir;
    this.mediaDir = join(baseDir, 'media');
    this.dbFilePath = join(baseDir, 'vault-state.json');
    mkdirSync(this.mediaDir, { recursive: true });
  }

  public getMediaDir(): string {
    return this.mediaDir;
  }

  private readDb(): VaultDatabaseSchema {
    if (!existsSync(this.dbFilePath)) {
      return {
        brandKits: [],
        starterTemplates: [],
        campaigns: [],
      };
    }
    const raw = readFileSync(this.dbFilePath, 'utf8');
    return JSON.parse(raw) as VaultDatabaseSchema;
  }

  private writeDb(db: VaultDatabaseSchema): void {
    writeFileSync(this.dbFilePath, JSON.stringify(db, null, 2), 'utf8');
  }

  public async seedDefaultBrandKitAndTemplates(): Promise<void> {
    const db = this.readDb();
    if (db.brandKits.length === 0) {
      db.brandKits.push(structuredClone(DEFAULT_CYMBAL_BRAND_KIT));
    }
    db.starterTemplates = structuredClone(STARTER_CAMPAIGN_TEMPLATES);
    this.writeDb(db);
  }

  public async listBrandKits(): Promise<BrandKit[]> {
    return this.readDb().brandKits;
  }

  public async getBrandKit(id: string): Promise<BrandKit | undefined> {
    return this.readDb().brandKits.find((b) => b.id === id);
  }

  public async upsertBrandKit(input: BrandKitInput): Promise<BrandKit> {
    const db = this.readDb();
    const now = new Date().toISOString();
    if (input.id) {
      const idx = db.brandKits.findIndex((b) => b.id === input.id);
      if (idx >= 0) {
        const updated: BrandKit = {
          ...db.brandKits[idx],
          ...input,
          id: input.id,
          updatedAt: now,
        };
        db.brandKits[idx] = updated;
        this.writeDb(db);
        return updated;
      }
    }
    const created: BrandKit = {
      ...input,
      id: input.id || `brandkit-${randomUUID().slice(0, 8)}`,
      updatedAt: now,
    };
    db.brandKits.push(created);
    this.writeDb(db);
    return created;
  }

  public async listStarterTemplates(): Promise<StarterCampaignTemplate[]> {
    return this.readDb().starterTemplates;
  }

  public async listCampaigns(): Promise<CampaignSummary[]> {
    const db = this.readDb();
    return db.campaigns.map((c) => ({
      id: c.id,
      title: c.title,
      brandKitId: c.brandKitId,
      currentStage: c.currentStage,
      sceneCount: c.scenes.length,
      overallBrandScore: c.latestBrandEvaluation?.overallScore,
      masterStale: c.masterStale,
      updatedAt: c.updatedAt,
    }));
  }

  public async getCampaign(id: string): Promise<CampaignDetail> {
    const campaign = this.readDb().campaigns.find((c) => c.id === id);
    if (!campaign) {
      throw new Error(`Campaign not found: ${id}`);
    }
    return campaign;
  }

  public async createCampaign(input: CreateCampaignInput): Promise<CampaignDetail> {
    const db = this.readDb();
    const template = input.templateId
      ? db.starterTemplates.find((t) => t.id === input.templateId)
      : undefined;

    const brandKit =
      db.brandKits.find((b) => b.id === input.brandKitId) ||
      db.brandKits[0] ||
      DEFAULT_CYMBAL_BRAND_KIT;

    const now = new Date().toISOString();
    const campaignId = `camp-${randomUUID().slice(0, 8)}`;

    const anchors: ReferenceAnchor[] = (template?.suggestedAnchors || []).map((a) => ({
      id: `anchor-${randomUUID().slice(0, 8)}`,
      campaignId,
      name: a.name,
      category: a.category,
      description: a.description,
      generationPrompt: a.generationPrompt,
      createdAt: now,
    }));

    const campaign: CampaignDetail = {
      id: campaignId,
      title: input.title || template?.title || 'Untitled Cymbal Aerospace Spot',
      brandKitId: brandKit.id,
      templateId: template?.id,
      targetAudience:
        input.targetAudience || template?.targetAudience || 'Aerospace Executive Buyers',
      spotDurationSeconds: input.spotDurationSeconds || template?.spotDurationSeconds || 24,
      aspectRatio: input.aspectRatio || template?.aspectRatio || '16:9',
      creativeBrief:
        input.creativeBrief ||
        template?.creativeBrief ||
        'Launch Cymbal Aerospace flagship flight systems with stratospheric precision.',
      keyProductClaims:
        input.keyProductClaims ||
        template?.keyProductClaims ||
        ['Triple-redundant avionics reliability (Subject to Regulatory Certification).'],
      musicalMoodPrompt:
        input.musicalMoodPrompt ||
        template?.musicalMoodPrompt ||
        brandKit.defaultMusicPrompt,
      currentStage: 1,
      voicePersona: structuredClone(brandKit.defaultVoicePersona),
      anchors,
      scenes: [],
      takes: [],
      masterStale: false,
      createdAt: now,
      updatedAt: now,
    };

    db.campaigns.unshift(campaign);
    this.writeDb(db);
    return campaign;
  }

  public async updateCampaignMeta(
    campaignId: string,
    patch: Partial<
      Pick<
        CampaignDetail,
        | 'title'
        | 'brandKitId'
        | 'targetAudience'
        | 'spotDurationSeconds'
        | 'aspectRatio'
        | 'creativeBrief'
        | 'keyProductClaims'
        | 'musicalMoodPrompt'
        | 'currentStage'
        | 'voicePersona'
      >
    >
  ): Promise<CampaignDetail> {
    const db = this.readDb();
    const campaign = db.campaigns.find((c) => c.id === campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }
    Object.assign(campaign, patch, { updatedAt: new Date().toISOString() });
    this.writeDb(db);
    return campaign;
  }

  public async upsertReferenceAnchor(
    campaignId: string,
    input: ReferenceAnchorInput
  ): Promise<ReferenceAnchor> {
    const db = this.readDb();
    const campaign = db.campaigns.find((c) => c.id === campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }
    const now = new Date().toISOString();
    if (input.id) {
      const existing = campaign.anchors.find((a) => a.id === input.id);
      if (existing) {
        Object.assign(existing, input);
        campaign.updatedAt = now;
        this.writeDb(db);
        return existing;
      }
    }
    const created: ReferenceAnchor = {
      id: input.id || `anchor-${randomUUID().slice(0, 8)}`,
      campaignId,
      name: input.name,
      category: input.category,
      description: input.description,
      generationPrompt: input.generationPrompt,
      imageUrl: input.imageUrl,
      mimeType: input.mimeType,
      interactionId: input.interactionId,
      activeTakeId: input.activeTakeId,
      createdAt: now,
    };
    campaign.anchors.push(created);
    campaign.updatedAt = now;
    this.writeDb(db);
    return created;
  }

  public async saveStoryboardScenes(
    campaignId: string,
    drafts: SceneDraftInput[],
    advanceToStage: StudioStageNumber = 2
  ): Promise<Scene[]> {
    const db = this.readDb();
    const campaign = db.campaigns.find((c) => c.id === campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }
    const now = new Date().toISOString();
    const defaultAnchorIds = campaign.anchors.map((a) => a.id);

    campaign.scenes = drafts.map((d, idx) => ({
      id: d.id || `scene-${randomUUID().slice(0, 8)}`,
      campaignId,
      orderIndex: idx,
      title: d.title,
      narrativeBeat: d.narrativeBeat,
      visualPrompt: d.visualPrompt,
      endFramePrompt: d.endFramePrompt,
      cameraMotionDirective: d.cameraMotionDirective,
      voiceoverScript: d.voiceoverScript,
      vocalStyleDirective: d.vocalStyleDirective,
      targetDurationSeconds: d.targetDurationSeconds || 6,
      anchorIds: d.anchorIds && d.anchorIds.length > 0 ? d.anchorIds : defaultAnchorIds,
      activeTakes: {},
      stale: {},
      updatedAt: now,
    }));

    if (campaign.currentStage < advanceToStage) {
      campaign.currentStage = advanceToStage;
    }
    if (campaign.activeMasterTakeId) {
      campaign.masterStale = true;
    }
    campaign.updatedAt = now;
    this.writeDb(db);
    return campaign.scenes;
  }

  public async addScene(campaignId: string, draft: SceneDraftInput): Promise<Scene> {
    const db = this.readDb();
    const campaign = db.campaigns.find((c) => c.id === campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }
    const now = new Date().toISOString();
    const scene: Scene = {
      id: draft.id || `scene-${randomUUID().slice(0, 8)}`,
      campaignId,
      orderIndex: campaign.scenes.length,
      title: draft.title,
      narrativeBeat: draft.narrativeBeat,
      visualPrompt: draft.visualPrompt,
      endFramePrompt: draft.endFramePrompt,
      cameraMotionDirective: draft.cameraMotionDirective,
      voiceoverScript: draft.voiceoverScript,
      vocalStyleDirective: draft.vocalStyleDirective,
      targetDurationSeconds: draft.targetDurationSeconds || 6,
      anchorIds: draft.anchorIds || campaign.anchors.map((a) => a.id),
      activeTakes: {},
      stale: {},
      updatedAt: now,
    };
    campaign.scenes.push(scene);
    if (campaign.activeMasterTakeId) {
      campaign.masterStale = true;
    }
    campaign.updatedAt = now;
    this.writeDb(db);
    return scene;
  }

  public async deleteScene(campaignId: string, sceneId: string): Promise<Scene[]> {
    const db = this.readDb();
    const campaign = db.campaigns.find((c) => c.id === campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }
    campaign.scenes = campaign.scenes
      .filter((s) => s.id !== sceneId)
      .map((s, idx) => ({ ...s, orderIndex: idx }));
    if (campaign.activeMasterTakeId) {
      campaign.masterStale = true;
    }
    campaign.updatedAt = new Date().toISOString();
    this.writeDb(db);
    return campaign.scenes;
  }

  public async reorderScenes(campaignId: string, orderedSceneIds: string[]): Promise<Scene[]> {
    const db = this.readDb();
    const campaign = db.campaigns.find((c) => c.id === campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }
    const byId = new Map(campaign.scenes.map((s) => [s.id, s]));
    const reordered: Scene[] = [];
    for (const id of orderedSceneIds) {
      const found = byId.get(id);
      if (found) {
        reordered.push(found);
        byId.delete(id);
      }
    }
    for (const remaining of byId.values()) {
      reordered.push(remaining);
    }
    campaign.scenes = reordered.map((s, idx) => ({ ...s, orderIndex: idx }));
    if (campaign.activeMasterTakeId) {
      campaign.masterStale = true;
    }
    campaign.updatedAt = new Date().toISOString();
    this.writeDb(db);
    return campaign.scenes;
  }

  /**
   * Non-Destructive Upstream Edit Stale Cascade:
   * - Editing visualPrompt or anchorIds marks existing keyframe_start, motion_video, and master_video as stale
   *   without deleting any takes.
   * - Editing cameraMotionDirective marks existing motion_video and master_video as stale.
   * - Editing voiceoverScript or vocalStyleDirective marks existing voiceover_audio and master_video as stale
   *   without marking keyframes stale.
   */
  public async updateScene(
    campaignId: string,
    sceneId: string,
    patch: ScenePatchInput
  ): Promise<{ scene: Scene; cascadedStaleModalities: Modality[] }> {
    const db = this.readDb();
    const campaign = db.campaigns.find((c) => c.id === campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }
    const scene = campaign.scenes.find((s) => s.id === sceneId);
    if (!scene) {
      throw new Error(`Scene not found: ${sceneId}`);
    }

    const cascadedStaleModalities: Modality[] = [];

    const visualChanged =
      (patch.visualPrompt !== undefined && patch.visualPrompt !== scene.visualPrompt) ||
      (patch.anchorIds !== undefined &&
        JSON.stringify(patch.anchorIds) !== JSON.stringify(scene.anchorIds));

    const endFrameChanged =
      patch.endFramePrompt !== undefined && patch.endFramePrompt !== scene.endFramePrompt;

    const motionChanged =
      patch.cameraMotionDirective !== undefined &&
      patch.cameraMotionDirective !== scene.cameraMotionDirective;

    const voiceChanged =
      (patch.voiceoverScript !== undefined && patch.voiceoverScript !== scene.voiceoverScript) ||
      (patch.vocalStyleDirective !== undefined &&
        patch.vocalStyleDirective !== scene.vocalStyleDirective);

    if (visualChanged) {
      if (scene.activeTakes.keyframe_start) {
        scene.stale.keyframe_start = true;
        cascadedStaleModalities.push('keyframe_start');
      }
      if (scene.activeTakes.motion_video) {
        scene.stale.motion_video = true;
        cascadedStaleModalities.push('motion_video');
      }
      if (campaign.activeMasterTakeId) {
        campaign.masterStale = true;
        cascadedStaleModalities.push('master_video');
      }
    }

    if (endFrameChanged) {
      if (scene.activeTakes.keyframe_end) {
        scene.stale.keyframe_end = true;
        cascadedStaleModalities.push('keyframe_end');
      }
      if (scene.activeTakes.motion_video && !cascadedStaleModalities.includes('motion_video')) {
        scene.stale.motion_video = true;
        cascadedStaleModalities.push('motion_video');
      }
      if (campaign.activeMasterTakeId && !cascadedStaleModalities.includes('master_video')) {
        campaign.masterStale = true;
        cascadedStaleModalities.push('master_video');
      }
    }

    if (motionChanged) {
      if (scene.activeTakes.motion_video && !cascadedStaleModalities.includes('motion_video')) {
        scene.stale.motion_video = true;
        cascadedStaleModalities.push('motion_video');
      }
      if (campaign.activeMasterTakeId && !cascadedStaleModalities.includes('master_video')) {
        campaign.masterStale = true;
        cascadedStaleModalities.push('master_video');
      }
    }

    if (voiceChanged) {
      if (scene.activeTakes.voiceover_audio) {
        scene.stale.voiceover_audio = true;
        cascadedStaleModalities.push('voiceover_audio');
      }
      if (campaign.activeMasterTakeId && !cascadedStaleModalities.includes('master_video')) {
        campaign.masterStale = true;
        cascadedStaleModalities.push('master_video');
      }
    }

    Object.assign(scene, patch, { updatedAt: new Date().toISOString() });
    campaign.updatedAt = scene.updatedAt;
    this.writeDb(db);

    return { scene, cascadedStaleModalities };
  }

  public async appendTake(input: AppendTakeInput): Promise<AssetTake> {
    const db = this.readDb();
    const campaign = db.campaigns.find((c) => c.id === input.campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${input.campaignId}`);
    }

    const takeId = `take-${randomUUID().slice(0, 8)}`;
    const ext = input.fileExtension.replace(/^\./, '');
    const fileName = `${input.campaignId}_${input.sceneId || 'campaign'}_${input.modality}_${takeId}.${ext}`;
    const diskPath = join(this.mediaDir, fileName);

    const buffer =
      input.mediaBuffer ||
      (input.mediaBase64 ? Buffer.from(input.mediaBase64, 'base64') : Buffer.alloc(0));
    writeFileSync(diskPath, buffer);

    const now = new Date().toISOString();
    const take: AssetTake = {
      id: takeId,
      campaignId: input.campaignId,
      sceneId: input.sceneId,
      modality: input.modality,
      modelId: input.modelId,
      interactionId: input.interactionId,
      parentInteractionId: input.parentInteractionId,
      prompt: input.prompt,
      mediaUrl: `/media/${fileName}`,
      mimeType: input.mimeType,
      durationSeconds: input.durationSeconds,
      tokenUsage: input.tokenUsage,
      latencyMs: input.latencyMs,
      createdAt: now,
    };

    campaign.takes.unshift(take);

    const shouldActivate = input.setAsActive !== false;
    if (shouldActivate) {
      if (input.modality === 'music_score') {
        campaign.activeMusicTakeId = take.id;
        if (campaign.currentStage < 5) campaign.currentStage = 5;
        if (campaign.activeMasterTakeId) {
          campaign.masterStale = true;
        }
      } else if (input.modality === 'master_video') {
        campaign.activeMasterTakeId = take.id;
        campaign.masterStale = false;
        campaign.currentStage = 6;
      } else if (input.sceneId) {
        const scene = campaign.scenes.find((s) => s.id === input.sceneId);
        if (scene) {
          const previousActiveTakeId = scene.activeTakes[input.modality];
          scene.activeTakes[input.modality] = take.id;
          if (
            input.modality === 'keyframe_start' ||
            input.modality === 'keyframe_end' ||
            input.modality === 'motion_video' ||
            input.modality === 'voiceover_audio'
          ) {
            scene.stale[input.modality] = false;
          }
          if (
            (input.modality === 'keyframe_start' || input.modality === 'keyframe_end') &&
            campaign.currentStage < 3
          ) {
            campaign.currentStage = 3;
          } else if (input.modality === 'motion_video' && campaign.currentStage < 4) {
            campaign.currentStage = 4;
          } else if (input.modality === 'voiceover_audio' && campaign.currentStage < 5) {
            campaign.currentStage = 5;
          }
          // If a new keyframe replaced an older keyframe while motion_video already existed,
          // mark downstream motion_video stale non-destructively!
          if (
            (input.modality === 'keyframe_start' || input.modality === 'keyframe_end') &&
            previousActiveTakeId &&
            previousActiveTakeId !== take.id &&
            scene.activeTakes.motion_video
          ) {
            scene.stale.motion_video = true;
          }
          if (campaign.activeMasterTakeId) {
            campaign.masterStale = true;
          }
        }
      }
    }

    campaign.updatedAt = now;
    this.writeDb(db);
    return take;
  }

  public async setActiveTake(
    campaignId: string,
    sceneId: string | null,
    modality: Modality,
    takeId: string
  ): Promise<CampaignDetail> {
    const db = this.readDb();
    const campaign = db.campaigns.find((c) => c.id === campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }
    const take = campaign.takes.find((t) => t.id === takeId && t.modality === modality);
    if (!take) {
      throw new Error(`Take not found: ${takeId}`);
    }

    if (modality === 'music_score') {
      campaign.activeMusicTakeId = take.id;
      if (campaign.activeMasterTakeId) {
        campaign.masterStale = true;
      }
    } else if (modality === 'master_video') {
      campaign.activeMasterTakeId = take.id;
      campaign.masterStale = false;
    } else if (sceneId) {
      const scene = campaign.scenes.find((s) => s.id === sceneId);
      if (!scene) {
        throw new Error(`Scene not found: ${sceneId}`);
      }
      const prevTakeId = scene.activeTakes[modality];
      scene.activeTakes[modality] = take.id;
      if (
        modality === 'keyframe_start' ||
        modality === 'keyframe_end' ||
        modality === 'motion_video' ||
        modality === 'voiceover_audio'
      ) {
        scene.stale[modality] = false;
      }
      if (
        (modality === 'keyframe_start' || modality === 'keyframe_end') &&
        prevTakeId &&
        prevTakeId !== take.id &&
        scene.activeTakes.motion_video
      ) {
        scene.stale.motion_video = true;
      }
      if (campaign.activeMasterTakeId) {
        campaign.masterStale = true;
      }
    }

    campaign.updatedAt = new Date().toISOString();
    this.writeDb(db);
    return campaign;
  }

  public async saveBrandEvaluation(
    campaignId: string,
    report: BrandEvaluationReport
  ): Promise<BrandEvaluationReport> {
    const db = this.readDb();
    const campaign = db.campaigns.find((c) => c.id === campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }
    campaign.latestBrandEvaluation = report;
    if (campaign.currentStage < 6) {
      campaign.currentStage = 6;
    }
    campaign.updatedAt = new Date().toISOString();
    this.writeDb(db);
    return report;
  }

  public async saveTimelinePlan(
    campaignId: string,
    plan: TimelineAssemblyPlan
  ): Promise<TimelineAssemblyPlan> {
    const db = this.readDb();
    const campaign = db.campaigns.find((c) => c.id === campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }
    campaign.latestTimelinePlan = plan;
    campaign.updatedAt = new Date().toISOString();
    this.writeDb(db);
    return plan;
  }
}
