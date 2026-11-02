import express, { type Express } from 'express';
import cors from 'cors';
import type { CampaignVault } from './vault/campaignVault.js';
import { GeminiStudioGateway } from './gemini/geminiStudioGateway.js';
import { StudioPipelineOrchestrator } from './orchestrator/studioPipelineOrchestrator.js';
import { MasterTimelineAssembler } from './assembler/masterTimelineAssembler.js';

export interface StudioAppDependencies {
  vault: CampaignVault;
  gateway?: GeminiStudioGateway;
  orchestrator?: StudioPipelineOrchestrator;
  assembler?: MasterTimelineAssembler;
}

export function createStudioApp(deps: StudioAppDependencies): Express {
  const { vault } = deps;
  const gateway = deps.gateway || new GeminiStudioGateway({ vault });
  const assembler = deps.assembler || new MasterTimelineAssembler({ vault });
  const orchestrator =
    deps.orchestrator ||
    new StudioPipelineOrchestrator({ vault, gateway, assembler });

  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use('/media', express.static(vault.getMediaDir()));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'cymbal-aerospace-marketing-studio',
      project: process.env.GOOGLE_CLOUD_PROJECT || 'vertex-ai-demos-468803',
      vertexAi: process.env.GOOGLE_GENAI_USE_VERTEXAI === '1',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/bootstrap', async (_req, res) => {
    try {
      const [brandKits, starterTemplates, campaigns] = await Promise.all([
        vault.listBrandKits(),
        vault.listStarterTemplates(),
        vault.listCampaigns(),
      ]);
      res.json({
        brandKits,
        starterTemplates,
        campaigns,
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get('/api/brand-kits', async (_req, res) => {
    try {
      const kits = await vault.listBrandKits();
      res.json(kits);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/brand-kits', async (req, res) => {
    try {
      const kit = await vault.upsertBrandKit(req.body);
      res.status(201).json(kit);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.get('/api/campaigns', async (_req, res) => {
    try {
      const campaigns = await vault.listCampaigns();
      res.json(campaigns);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/campaigns', async (req, res) => {
    try {
      const campaign = await vault.createCampaign(req.body || {});
      res.status(201).json(campaign);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.get('/api/campaigns/:id', async (req, res) => {
    try {
      const campaign = await vault.getCampaign(req.params.id);
      res.json(campaign);
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  app.patch('/api/campaigns/:id', async (req, res) => {
    try {
      const updated = await vault.updateCampaignMeta(req.params.id, req.body || {});
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // SSE Telemetry & Job Progress Stream
  app.get('/api/campaigns/:id/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const unsubscribe = orchestrator.subscribeEvents(req.params.id, (evt) => {
      res.write(`data: ${JSON.stringify(evt)}\n\n`);
    });

    req.on('close', () => {
      unsubscribe();
    });
  });

  // Stage 2: AI Storyboard & Script Generation + Scene CRUD
  app.post('/api/campaigns/:id/storyboard/generate', async (req, res) => {
    try {
      const sceneCount = Number(req.body?.sceneCount || 3);
      const briefPatch: Record<string, unknown> = {};
      if (typeof req.body?.title === 'string') briefPatch.title = req.body.title;
      if (typeof req.body?.targetAudience === 'string') {
        briefPatch.targetAudience = req.body.targetAudience;
      }
      if (typeof req.body?.creativeBrief === 'string') {
        briefPatch.creativeBrief = req.body.creativeBrief;
      }
      if (typeof req.body?.musicalMoodPrompt === 'string') {
        briefPatch.musicalMoodPrompt = req.body.musicalMoodPrompt;
      }
      if (Object.keys(briefPatch).length > 0) {
        await vault.updateCampaignMeta(req.params.id, briefPatch);
      }
      const updated = await orchestrator.runStoryboardStage(req.params.id, sceneCount);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.post('/api/campaigns/:id/scenes', async (req, res) => {
    try {
      const scene = await vault.addScene(req.params.id, req.body);
      res.status(201).json(scene);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.patch('/api/campaigns/:id/scenes/:sceneId', async (req, res) => {
    try {
      const result = await vault.updateScene(req.params.id, req.params.sceneId, req.body);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.delete('/api/campaigns/:id/scenes/:sceneId', async (req, res) => {
    try {
      const scenes = await vault.deleteScene(req.params.id, req.params.sceneId);
      res.json({ scenes });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.post('/api/campaigns/:id/scenes/reorder', async (req, res) => {
    try {
      const scenes = await vault.reorderScenes(
        req.params.id,
        req.body?.orderedSceneIds || []
      );
      res.json({ scenes });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Stage 3: Reusable Visual Reference Anchors
  app.post('/api/campaigns/:id/anchors', async (req, res) => {
    try {
      const anchor = await vault.upsertReferenceAnchor(req.params.id, req.body);
      if (req.body?.generateNow) {
        const generated = await orchestrator.generateAnchorImage(
          req.params.id,
          anchor.id,
          req.body.generationPrompt
        );
        res.status(201).json(generated);
        return;
      }
      res.status(201).json(anchor);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.post('/api/campaigns/:id/anchors/:anchorId/generate', async (req, res) => {
    try {
      const generated = await orchestrator.generateAnchorImage(
        req.params.id,
        req.params.anchorId,
        req.body?.promptOverride
      );
      const campaign = await vault.getCampaign(req.params.id);
      res.json({ anchor: generated, campaign });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Stage 3, 4, 5: Per-Scene Asset Generation, Conversational Editing & Video Extension
  app.post('/api/campaigns/:id/scenes/:sceneId/generate', async (req, res) => {
    try {
      if (
        typeof req.body?.speakingRate === 'number' ||
        typeof req.body?.voiceId === 'string' ||
        typeof req.body?.vocalStylePreset === 'string'
      ) {
        const current = await vault.getCampaign(req.params.id);
        await vault.updateCampaignMeta(req.params.id, {
          voicePersona: {
            ...current.voicePersona,
            ...(typeof req.body.speakingRate === 'number'
              ? { speakingRate: req.body.speakingRate }
              : {}),
            ...(typeof req.body.voiceId === 'string' ? { voiceId: req.body.voiceId } : {}),
            ...(typeof req.body.vocalStylePreset === 'string'
              ? { vocalStylePreset: req.body.vocalStylePreset }
              : {}),
          },
        });
      }
      const take = await orchestrator.runSceneStageJob({
        campaignId: req.params.id,
        sceneId: req.params.sceneId,
        modality: req.body.modality,
        promptOverride: req.body.promptOverride,
        conversationalEdit: Boolean(req.body.conversationalEdit),
        extendVideo: Boolean(req.body.extendVideo),
        durationSeconds: req.body.durationSeconds,
      });
      const campaign = await vault.getCampaign(req.params.id);
      res.json({ take, campaign });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Parallel Batch Generation across all scenes
  app.post('/api/campaigns/:id/batch-generate', async (req, res) => {
    try {
      if (
        typeof req.body?.speakingRate === 'number' ||
        typeof req.body?.voiceId === 'string' ||
        typeof req.body?.vocalStylePreset === 'string'
      ) {
        const current = await vault.getCampaign(req.params.id);
        await vault.updateCampaignMeta(req.params.id, {
          voicePersona: {
            ...current.voicePersona,
            ...(typeof req.body.speakingRate === 'number'
              ? { speakingRate: req.body.speakingRate }
              : {}),
            ...(typeof req.body.voiceId === 'string' ? { voiceId: req.body.voiceId } : {}),
            ...(typeof req.body.vocalStylePreset === 'string'
              ? { vocalStylePreset: req.body.vocalStylePreset }
              : {}),
          },
        });
      }
      const takes = await orchestrator.runBatchStageJob({
        campaignId: req.params.id,
        modality: req.body.modality,
        sceneIds: req.body.sceneIds,
      });
      const campaign = await vault.getCampaign(req.params.id);
      res.json({ takes, campaign });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Switch active take in Take History
  app.post(['/api/campaigns/:id/active-take', '/api/campaigns/:id/ActiveTake'], async (req, res) => {
    try {
      const campaignId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const campaign = await vault.setActiveTake(
        campaignId,
        req.body.sceneId || null,
        req.body.modality,
        req.body.takeId
      );
      res.json(campaign);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Stage 5: Voice Design & Lyria Music Scoring
  app.post('/api/campaigns/:id/voice-design', async (req, res) => {
    try {
      const result = await orchestrator.designVoicePersonaStage(req.params.id, req.body);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.post('/api/campaigns/:id/music/generate', async (req, res) => {
    try {
      const take = await orchestrator.generateCampaignMusicScore({
        campaignId: req.params.id,
        promptOverride: req.body?.promptOverride,
        modelId: req.body?.modelId,
      });
      const campaign = await vault.getCampaign(req.params.id);
      res.json({ take, campaign });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Stage 6: Multimodal Brand Compliance Evaluation & 1-Click Auto-Fix
  app.post('/api/campaigns/:id/brand-eval', async (req, res) => {
    try {
      const result = await orchestrator.runBrandEvaluationStage(req.params.id);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.post('/api/campaigns/:id/brand-eval/findings/:findingId/autofix', async (req, res) => {
    try {
      const result = await orchestrator.applyBrandFindingAutoFix(
        req.params.id,
        req.params.findingId
      );
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Stage 6: FFmpeg Master Timeline Plan & Assembly
  app.post('/api/campaigns/:id/timeline-plan', async (req, res) => {
    try {
      const campaign = await vault.getCampaign(req.params.id);
      const plan = await assembler.computeTimelinePlan(campaign);
      const updated = await vault.getCampaign(req.params.id);
      res.json({ plan, campaign: updated });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.post('/api/campaigns/:id/assemble', async (req, res) => {
    try {
      const result = await orchestrator.runMasterAssemblyStage(req.params.id);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  return app;
}
