import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  AudioLines,
  CheckCircle2,
  Download,
  Film,
  Image as ImageIcon,
  Layers,
  Mic,
  Music,
  Play,
  Plus,
  Rocket,
  Sparkles,
} from 'lucide-react';
import type {
  BrandKit,
  CampaignDetail,
  CampaignSummary,
  Modality,
  ReferenceAnchor,
  Scene,
  StarterCampaignTemplate,
  StudioSSEEvent,
} from '../shared/types.js';
import {
  SIMPLIFIED_STEPS,
  DEFAULT_STORYBOARD_PREVIEW_MODE,
  VOICE_PRESET_OPTIONS,
  VOICE_SPEED_OPTIONS,
  VOICE_STYLE_OPTIONS,
  MUSIC_GENRE_OPTIONS,
  MUSIC_TEMPO_OPTIONS,
  MUSIC_INSTRUMENT_OPTIONS,
  composeSoundtrackPromptFromSelections,
  mapBackendStageToStep,
  computeSimplifiedStepReadiness,
  computeTotalStaleCount,
  buildCalmBriefViewState,
  buildVisualSceneCards,
  buildSceneInspectorModalState,
  buildStreamlinedAudioViewState,
  buildFinalCutTheaterViewState,
  type SimplifiedStepNumber,
  type StoryboardMediaPreviewMode,
} from './viewModel/studioViewModel.js';
import { SceneInspectorModal } from './components/SceneInspectorModal.js';

export function App() {
  const [brandKits, setBrandKits] = useState<BrandKit[]>([]);
  const [starterTemplates, setStarterTemplates] = useState<StarterCampaignTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<CampaignDetail | null>(null);
  const [activeStage, setActiveStage] = useState<SimplifiedStepNumber>(1);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [events, setEvents] = useState<StudioSSEEvent[]>([]);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Unified Step 2 Storyboard & Visuals UI state (Motion Clips primary by default)
  const [storyboardPreviewMode, setStoryboardPreviewMode] =
    useState<StoryboardMediaPreviewMode>(DEFAULT_STORYBOARD_PREVIEW_MODE);
  const [showReferenceAnchorsDrawer, setShowReferenceAnchorsDrawer] = useState(false);
  const [showAddSceneDrawer, setShowAddSceneDrawer] = useState(false);
  const [inspectedSceneId, setInspectedSceneId] = useState<string | null>(null);

  // Step 3 Voice & Soundtrack dropdown + prompt controls state
  const [showVoicePersonaForm, setShowVoicePersonaForm] = useState(false);
  const [voicePresetId, setVoicePresetId] = useState<string>('Kore');
  const [voiceSpeed, setVoiceSpeed] = useState<number>(1.25);
  const [voiceStylePreset, setVoiceStylePreset] = useState<string>(
    VOICE_STYLE_OPTIONS[0]
  );
  const [voiceDisplayName, setVoiceDisplayName] = useState(
    'Kore — Warm & Crisp Commercial (Default)'
  );
  const [voiceGender, setVoiceGender] = useState<'female' | 'male' | 'neutral'>('female');
  const [voicePersonaPrompt, setVoicePersonaPrompt] = useState(
    'A brisk, upbeat, and clear commercial narrator with crisp modern pacing and engaging warmth.'
  );

  // Step 3 Soundtrack dropdown controls
  const [musicGenre, setMusicGenre] = useState<string>(MUSIC_GENRE_OPTIONS[0]);
  const [musicTempo, setMusicTempo] = useState<string>(MUSIC_TEMPO_OPTIONS[0]);
  const [musicInstruments, setMusicInstruments] = useState<string>(
    MUSIC_INSTRUMENT_OPTIONS[0]
  );

  // New Scene form state
  const [newSceneTitle, setNewSceneTitle] = useState('');
  const [newSceneVisualPrompt, setNewSceneVisualPrompt] = useState('');
  const [newSceneMotion, setNewSceneMotion] = useState('');
  const [newSceneVoiceover, setNewSceneVoiceover] = useState('');

  // New Reference Anchor form state
  const [showNewAnchorForm, setShowNewAnchorForm] = useState(false);
  const [newAnchorName, setNewAnchorName] = useState('');
  const [newAnchorCategory, setNewAnchorCategory] =
    useState<ReferenceAnchor['category']>('aircraft');
  const [newAnchorPrompt, setNewAnchorPrompt] = useState('');

  async function loadBootstrap(selectCampaignId?: string) {
    try {
      const res = await fetch('/api/bootstrap');
      const data = await res.json();
      setBrandKits(data.brandKits || []);
      setStarterTemplates(data.starterTemplates || []);
      setCampaigns(data.campaigns || []);

      const targetId = selectCampaignId || data.campaigns?.[0]?.id;
      if (targetId) {
        const detailRes = await fetch(`/api/campaigns/${targetId}`);
        if (detailRes.ok) {
          const detail: CampaignDetail = await detailRes.json();
          setActiveCampaign(detail);
          setVoicePresetId(detail.voicePersona.voiceId || 'Kore');
          setVoiceSpeed(detail.voicePersona.speakingRate || 1.25);
          setVoiceStylePreset(
            detail.voicePersona.vocalStylePreset || VOICE_STYLE_OPTIONS[0]
          );
          setVoiceDisplayName(detail.voicePersona.displayName);
          setVoiceGender(detail.voicePersona.gender);
          setVoicePersonaPrompt(detail.voicePersona.personaPrompt);
        }
      }
    } catch (err) {
      setErrorBanner((err as Error).message);
    }
  }

  useEffect(() => {
    void loadBootstrap();
  }, []);

  // Keep browser voiceover <audio> elements playing at the selected speaking speed
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const players = document.querySelectorAll<HTMLAudioElement>(
      'audio[data-voiceover-player="true"]'
    );
    players.forEach((audioEl) => {
      audioEl.playbackRate = voiceSpeed;
    });
  }, [voiceSpeed, activeStage, activeCampaign]);

  // Subscribe to SSE telemetry stream for active campaign
  useEffect(() => {
    if (!activeCampaign?.id) return;
    const source = new EventSource(`/api/campaigns/${activeCampaign.id}/events`);
    source.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data) as StudioSSEEvent;
        setEvents((prev) => [evt, ...prev].slice(0, 20));
      } catch {
        // ignore parse errors
      }
    };
    return () => {
      source.close();
    };
  }, [activeCampaign?.id]);

  const activeBrandKit =
    brandKits.find((b) => b.id === activeCampaign?.brandKitId) || brandKits[0];

  async function handleCreateCampaignFromTemplate(templateId: string) {
    setBusyAction(`template-${templateId}`);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          brandKitId: activeBrandKit?.id,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Failed to create campaign (${res.status})`);
      }
      const created: CampaignDetail = await res.json();
      setActiveCampaign(created);
      setActiveStage(1);
      await loadBootstrap(created.id);
    } catch (err) {
      setErrorBanner((err as Error).message);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleUpdateCampaignField(patch: Partial<CampaignDetail>) {
    if (!activeCampaign) return;
    try {
      const res = await fetch(`/api/campaigns/${activeCampaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const updated: CampaignDetail = await res.json();
        setActiveCampaign(updated);
      }
    } catch (err) {
      setErrorBanner((err as Error).message);
    }
  }

  async function handleGenerateStoryboard() {
    if (!activeCampaign) return;
    setBusyAction('generate-storyboard');
    setErrorBanner(null);
    try {
      const res = await fetch(`/api/campaigns/${activeCampaign.id}/storyboard/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneCount: 3 }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Storyboard generation failed (${res.status})`);
      }
      const updated: CampaignDetail = await res.json();
      setActiveCampaign(updated);
      setActiveStage(2);
    } catch (err) {
      setErrorBanner((err as Error).message);
    } finally {
      setBusyAction(null);
    }
  }

  async function handlePatchScene(sceneId: string, patch: Partial<Scene>) {
    if (!activeCampaign) return;
    try {
      const res = await fetch(
        `/api/campaigns/${activeCampaign.id}/scenes/${sceneId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        }
      );
      if (res.ok) {
        const detailRes = await fetch(`/api/campaigns/${activeCampaign.id}`);
        setActiveCampaign(await detailRes.json());
      }
    } catch (err) {
      setErrorBanner((err as Error).message);
    }
  }

  async function handleAddScene(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCampaign || !newSceneTitle.trim()) return;
    setBusyAction('add-scene');
    try {
      await fetch(`/api/campaigns/${activeCampaign.id}/scenes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newSceneTitle.trim(),
          narrativeBeat: 'Custom scene beat',
          visualPrompt:
            newSceneVisualPrompt.trim() ||
            'Photorealistic Cymbal Aerospace airframe in stratospheric sunlight.',
          cameraMotionDirective:
            newSceneMotion.trim() || 'Smooth 24fps aerial tracking shot.',
          voiceoverScript:
            newSceneVoiceover.trim() ||
            'Engineered with triple-redundant optical precision.',
          vocalStyleDirective: 'authoritative aerospace narration',
          targetDurationSeconds: 6,
        }),
      });
      setNewSceneTitle('');
      setNewSceneVisualPrompt('');
      setNewSceneMotion('');
      setNewSceneVoiceover('');
      const detailRes = await fetch(`/api/campaigns/${activeCampaign.id}`);
      setActiveCampaign(await detailRes.json());
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteScene(sceneId: string) {
    if (!activeCampaign) return;
    await fetch(`/api/campaigns/${activeCampaign.id}/scenes/${sceneId}`, {
      method: 'DELETE',
    });
    const detailRes = await fetch(`/api/campaigns/${activeCampaign.id}`);
    setActiveCampaign(await detailRes.json());
  }

  async function handleGenerateAnchor(anchorId: string) {
    if (!activeCampaign) return;
    setBusyAction(`anchor-${anchorId}`);
    setErrorBanner(null);
    try {
      const res = await fetch(
        `/api/campaigns/${activeCampaign.id}/anchors/${anchorId}/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Anchor generation failed (${res.status})`);
      }
      const data = await res.json();
      setActiveCampaign(data.campaign);
    } catch (err) {
      setErrorBanner((err as Error).message);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCreateReferenceAnchor(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCampaign || !newAnchorName.trim()) return;
    setBusyAction('create-anchor');
    setErrorBanner(null);
    try {
      const res = await fetch(`/api/campaigns/${activeCampaign.id}/anchors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAnchorName.trim(),
          category: newAnchorCategory,
          description: newAnchorPrompt.trim() || `${newAnchorName.trim()} visual continuity anchor`,
          generationPrompt:
            newAnchorPrompt.trim() ||
            `Photorealistic Cymbal Aerospace ${newAnchorCategory}: ${newAnchorName.trim()}, Stratosphere Obsidian and Titanium livery.`,
          generateNow: true,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Failed to create anchor (${res.status})`);
      }
      const detailRes = await fetch(`/api/campaigns/${activeCampaign.id}`);
      if (detailRes.ok) {
        setActiveCampaign(await detailRes.json());
      }
      setNewAnchorName('');
      setNewAnchorPrompt('');
      setShowNewAnchorForm(false);
    } catch (err) {
      setErrorBanner((err as Error).message);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleGenerateSceneAsset(
    sceneId: string,
    modality: 'keyframe_start' | 'keyframe_end' | 'motion_video' | 'voiceover_audio',
    options?: {
      promptOverride?: string;
      conversationalEdit?: boolean;
      extendVideo?: boolean;
    }
  ) {
    if (!activeCampaign) return;
    setBusyAction(`${sceneId}-${modality}-${options?.extendVideo ? 'ext' : 'gen'}`);
    setErrorBanner(null);
    try {
      const res = await fetch(
        `/api/campaigns/${activeCampaign.id}/scenes/${sceneId}/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modality,
            ...options,
          }),
        }
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Generation failed (${res.status})`);
      }
      const data = await res.json();
      setActiveCampaign(data.campaign);
    } catch (err) {
      setErrorBanner((err as Error).message);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleBatchGenerate(
    modality: 'keyframe_start' | 'motion_video' | 'voiceover_audio'
  ) {
    if (!activeCampaign) return;
    setBusyAction(`batch-${modality}`);
    setErrorBanner(null);
    try {
      const res = await fetch(`/api/campaigns/${activeCampaign.id}/batch-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modality }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Batch generation failed (${res.status})`);
      }
      const data = await res.json();
      setActiveCampaign(data.campaign);
    } catch (err) {
      setErrorBanner((err as Error).message);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSwitchActiveTake(
    sceneId: string | null,
    modality: Modality,
    takeId: string
  ) {
    if (!activeCampaign) return;
    const res = await fetch(`/api/campaigns/${activeCampaign.id}/active-take`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sceneId, modality, takeId }),
    });
    if (res.ok) {
      setActiveCampaign(await res.json());
    }
  }

  async function handleDesignVoice(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCampaign) return;
    setBusyAction('voice-design');
    setErrorBanner(null);
    try {
      const res = await fetch(`/api/campaigns/${activeCampaign.id}/voice-design`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: voiceDisplayName,
          gender: voiceGender,
          languageCode: 'en-US',
          personaPrompt: voicePersonaPrompt,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Voice design failed (${res.status})`);
      }
      const data = await res.json();
      setActiveCampaign(data.campaign);
    } catch (err) {
      setErrorBanner((err as Error).message);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleGenerateMusic(modelId: 'lyria-3.5' | 'lyria-3-clip-preview') {
    if (!activeCampaign) return;
    setBusyAction(`music-${modelId}`);
    setErrorBanner(null);
    try {
      const res = await fetch(`/api/campaigns/${activeCampaign.id}/music/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Music score generation failed (${res.status})`);
      }
      const data = await res.json();
      setActiveCampaign(data.campaign);
    } catch (err) {
      setErrorBanner((err as Error).message);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleAssembleMasterCut() {
    if (!activeCampaign) return;
    setBusyAction('assemble-master');
    setErrorBanner(null);
    try {
      const res = await fetch(`/api/campaigns/${activeCampaign.id}/assemble`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Master cut assembly failed (${res.status})`);
      }
      const data = await res.json();
      setActiveCampaign(data.campaign);
    } catch (err) {
      setErrorBanner((err as Error).message);
    } finally {
      setBusyAction(null);
    }
  }

  const totalStaleCount = computeTotalStaleCount(activeCampaign);

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col">
      {/* Top Executive Studio Header */}
      <header className="border-b border-slate-800/80 bg-[#0A0F1D]/95 backdrop-blur sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/40 flex items-center justify-center text-sky-400 shadow-inner">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-sky-400">
                  Cymbal Aerospace
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                  @google/genai Interactions Studio
                </span>
                {totalStaleCount > 0 && (
                  <span
                    data-testid="global-stale-badge"
                    className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center gap-1 font-medium"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {totalStaleCount} Out of Sync
                  </span>
                )}
              </div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                {activeCampaign?.title || 'Multimodal Marketing & Video Synthesis Studio'}
              </h1>
            </div>
          </div>

          {/* Campaign Switcher & Quick Stats */}
          <div className="flex items-center gap-3">
            <a
              href="/prototypes/index.html"
              data-testid="open-ux-prototypes-link"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-200 text-xs font-semibold transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              3 UX Prototypes (Material 3)
            </a>
            <select
              aria-label="Select Active Campaign"
              value={activeCampaign?.id || ''}
              onChange={(e) => void loadBootstrap(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              {campaigns.map((c) => {
                const mappedStep =
                  c.id === activeCampaign?.id
                    ? Math.max(
                        mapBackendStageToStep(c.currentStage),
                        mapBackendStageToStep(activeCampaign.currentStage),
                        activeStage
                      )
                    : mapBackendStageToStep(c.currentStage);
                return (
                  <option key={c.id} value={c.id}>
                    {c.title} (Step {mappedStep}/4)
                  </option>
                );
              })}
            </select>

            <div className="hidden md:flex items-center gap-2 text-xs bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-slate-400">Scenes:</span>
              <span className="font-mono font-semibold text-white">
                {activeCampaign?.scenes.length || 0}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">Takes in Vault:</span>
              <span className="font-mono font-semibold text-sky-300">
                {activeCampaign?.takes.length || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Compact 4-Step Storycraft Pill Navigation */}
        <div className="max-w-[1600px] mx-auto px-6 pb-3 flex items-center justify-center">
          <nav
            aria-label="Studio 4-Step Navigation"
            className="inline-flex flex-wrap items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-full p-1.5 shadow-inner"
          >
            {SIMPLIFIED_STEPS.map((st) => {
              const stepReadiness = computeSimplifiedStepReadiness(activeCampaign);
              const isActive = activeStage === st.number;
              const isCompleted = stepReadiness[st.number];
              return (
                <button
                  key={st.number}
                  type="button"
                  data-testid={`stage-tab-${st.number}`}
                  onClick={() => setActiveStage(st.number)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                      : isCompleted
                        ? 'text-slate-100 hover:bg-slate-800/80'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {isCompleted && !isActive && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                  <span>{st.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {errorBanner && (
        <div className="bg-rose-950/80 border-b border-rose-500/40 px-6 py-2.5 text-xs text-rose-200 flex items-center justify-between">
          <span>{errorBanner}</span>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="text-rose-300 underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Studio Stage Workspace */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-6">
        {/* STEP 1: Calm Creative Brief (Brand Guardrails & Custom Kit Clutter Removed) */}
        {activeStage === 1 && activeCampaign && (() => {
          const briefView = buildCalmBriefViewState(activeCampaign, starterTemplates);
          return (
            <div className="max-w-4xl mx-auto space-y-6">
              <section className="bg-[#0D1326] border border-slate-800/90 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-sky-400">
                      1-Click Campaign Presets
                    </h2>
                    <p className="text-xs text-slate-400">
                      Pick a pre-seeded Cymbal Aerospace brief or write your own below.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {briefView.starterTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                        briefView.activeTemplateId === tpl.id
                          ? 'bg-sky-950/30 border-sky-500/60'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-white mb-1">{tpl.title}</div>
                        <div className="text-[11px] text-sky-300 mb-2">{tpl.subtitle}</div>
                        <p className="text-[11px] text-slate-400 line-clamp-3 mb-3">
                          {tpl.creativeBrief}
                        </p>
                      </div>
                      <button
                        type="button"
                        data-testid={`launch-template-${tpl.id}`}
                        disabled={busyAction === `template-${tpl.id}`}
                        onClick={() => void handleCreateCampaignFromTemplate(tpl.id)}
                        className="w-full py-1.5 px-3 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 text-xs font-semibold transition cursor-pointer"
                      >
                        {busyAction === `template-${tpl.id}`
                          ? 'Initializing...'
                          : 'Use Preset'}
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-[#0D1326] border border-slate-800/90 rounded-2xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-white">
                      Campaign Creative Brief
                    </h2>
                    <p className="text-xs text-slate-400">
                      Define your story pitch and audience, then generate your visual storyboard.
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid="stage1-generate-storyboard-btn"
                    disabled={busyAction === 'generate-storyboard'}
                    onClick={() => void handleGenerateStoryboard()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/20 transition cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    {busyAction === 'generate-storyboard'
                      ? 'Generating Storyboard...'
                      : 'Generate Storyboard →'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Campaign Title</label>
                    <input
                      type="text"
                      value={activeCampaign.title}
                      onChange={(e) =>
                        setActiveCampaign({ ...activeCampaign, title: e.target.value })
                      }
                      onBlur={() =>
                        void handleUpdateCampaignField({ title: activeCampaign.title })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Target Audience</label>
                    <input
                      type="text"
                      value={activeCampaign.targetAudience}
                      onChange={(e) =>
                        setActiveCampaign({
                          ...activeCampaign,
                          targetAudience: e.target.value,
                        })
                      }
                      onBlur={() =>
                        void handleUpdateCampaignField({
                          targetAudience: activeCampaign.targetAudience,
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Creative Pitch & Narrative Arc
                  </label>
                  <textarea
                    rows={3}
                    value={activeCampaign.creativeBrief}
                    onChange={(e) =>
                      setActiveCampaign({
                        ...activeCampaign,
                        creativeBrief: e.target.value,
                      })
                    }
                    onBlur={() =>
                      void handleUpdateCampaignField({
                        creativeBrief: activeCampaign.creativeBrief,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Soundtrack Mood
                  </label>
                  <input
                    type="text"
                    value={activeCampaign.musicalMoodPrompt}
                    onChange={(e) =>
                      setActiveCampaign({
                        ...activeCampaign,
                        musicalMoodPrompt: e.target.value,
                      })
                    }
                    onBlur={() =>
                      void handleUpdateCampaignField({
                        musicalMoodPrompt: activeCampaign.musicalMoodPrompt,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                  />
                </div>
              </section>
            </div>
          );
        })()}

        {/* STEP 2: Unified Visual Storyboard & On-Demand Scene Inspector Modal */}
        {activeStage === 2 && activeCampaign && (() => {
          const sceneCards = buildVisualSceneCards(activeCampaign, storyboardPreviewMode);
          const inspectorModalState = buildSceneInspectorModalState(
            activeCampaign,
            inspectedSceneId
          );

          return (
            <div className="space-y-6">
              {/* Top Storyboard Action & Preview Mode Bar (Motion Clips Primary, Keyframes Toggle) */}
              <div className="bg-[#0D1326] border border-slate-800/90 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex rounded-full bg-slate-950 border border-slate-800 p-1">
                    <button
                      type="button"
                      data-testid="storyboard-preview-mode-video"
                      onClick={() => setStoryboardPreviewMode('video')}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                        storyboardPreviewMode === 'video'
                          ? 'bg-sky-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Film className="w-3.5 h-3.5" />
                      Motion Clips (Primary)
                    </button>
                    <button
                      type="button"
                      data-testid="storyboard-preview-mode-image"
                      onClick={() => setStoryboardPreviewMode('image')}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                        storyboardPreviewMode === 'image'
                          ? 'bg-sky-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      Keyframes
                    </button>
                  </div>

                  <button
                    type="button"
                    data-testid="toggle-reference-anchors-btn"
                    onClick={() => setShowReferenceAnchorsDrawer((v) => !v)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 cursor-pointer"
                  >
                    Reference Anchors ({activeCampaign.anchors.length})
                  </button>

                  <button
                    type="button"
                    data-testid="toggle-add-scene-btn"
                    onClick={() => setShowAddSceneDrawer((v) => !v)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-sky-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Scene
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    data-testid="stage2-regenerate-storyboard-btn"
                    disabled={busyAction === 'generate-storyboard'}
                    onClick={() => void handleGenerateStoryboard()}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    {busyAction === 'generate-storyboard'
                      ? 'Generating Storyboard...'
                      : 'Regenerate Storyboard'}
                  </button>

                  {storyboardPreviewMode === 'image' ? (
                    <button
                      type="button"
                      data-testid="batch-generate-keyframes-btn"
                      disabled={busyAction === 'batch-keyframe_start'}
                      onClick={() => void handleBatchGenerate('keyframe_start')}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {busyAction === 'batch-keyframe_start'
                        ? 'Generating All Keyframes...'
                        : 'Generate All Keyframes'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      data-testid="batch-generate-motion-btn"
                      disabled={busyAction === 'batch-motion_video'}
                      onClick={() => void handleBatchGenerate('motion_video')}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {busyAction === 'batch-motion_video'
                        ? 'Synthesizing All Motion Clips...'
                        : 'Synthesize All Motion Clips'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveStage(3)}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-sky-300 border border-slate-800 text-xs font-semibold cursor-pointer"
                  >
                    Next: Voice & Soundtrack →
                  </button>
                </div>
              </div>

              {/* Collapsible Reference Anchors Drawer */}
              {showReferenceAnchorsDrawer && (
                <section
                  data-testid="reference-anchors-drawer"
                  className="bg-[#0D1326] border border-slate-800/90 rounded-2xl p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400">
                        Subject Reference Anchors
                      </h3>
                      <p className="text-xs text-slate-400">
                        Reference images keep aircraft liveries, cockpit hardware, and crew visually
                        consistent across all scenes.
                      </p>
                    </div>
                    <button
                      type="button"
                      data-testid="toggle-new-anchor-btn"
                      onClick={() => setShowNewAnchorForm((v) => !v)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      New Reference Anchor
                    </button>
                  </div>

                  {showNewAnchorForm && (
                    <form
                      onSubmit={handleCreateReferenceAnchor}
                      className="p-3.5 rounded-xl bg-slate-900/90 border border-sky-500/30 grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
                    >
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Anchor Name</label>
                        <input
                          type="text"
                          placeholder="e.g., CX-900 CryoNacelle"
                          value={newAnchorName}
                          onChange={(e) => setNewAnchorName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Category</label>
                        <select
                          value={newAnchorCategory}
                          onChange={(e) =>
                            setNewAnchorCategory(
                              e.target.value as ReferenceAnchor['category']
                            )
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        >
                          <option value="aircraft">aircraft</option>
                          <option value="avionics">avionics</option>
                          <option value="character">character</option>
                          <option value="environment">environment</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Visual Generation Prompt
                        </label>
                        <input
                          type="text"
                          placeholder="Describe livery, materials, lighting..."
                          value={newAnchorPrompt}
                          onChange={(e) => setNewAnchorPrompt(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={busyAction === 'create-anchor'}
                        className="py-1.5 px-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs cursor-pointer"
                      >
                        {busyAction === 'create-anchor'
                          ? 'Generating Anchor...'
                          : 'Create & Generate'}
                      </button>
                    </form>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {activeCampaign.anchors.map((anchor) => (
                      <div
                        key={anchor.id}
                        className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                              {anchor.category}
                            </span>
                            <h4 className="text-xs font-bold text-white mt-1.5">{anchor.name}</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {anchor.description}
                            </p>
                          </div>
                          {anchor.imageUrl && (
                            <img
                              src={anchor.imageUrl}
                              alt={anchor.name}
                              className="w-16 h-16 rounded-lg object-cover border border-sky-500/40 shrink-0"
                            />
                          )}
                        </div>
                        <button
                          type="button"
                          data-testid={`generate-anchor-${anchor.id}`}
                          disabled={busyAction === `anchor-${anchor.id}`}
                          onClick={() => void handleGenerateAnchor(anchor.id)}
                          className="w-full py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-sky-300 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          {busyAction === `anchor-${anchor.id}`
                            ? 'Synthesizing...'
                            : anchor.imageUrl
                              ? 'Regenerate Anchor'
                              : 'Generate Anchor'}
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Collapsible Add Scene Drawer */}
              {showAddSceneDrawer && (
                <form
                  onSubmit={(e) => {
                    void handleAddScene(e);
                    setShowAddSceneDrawer(false);
                  }}
                  className="bg-[#0D1326] border border-slate-800/80 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
                >
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">New Scene Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Mach 1.8 Stratospheric Climb"
                      value={newSceneTitle}
                      onChange={(e) => setNewSceneTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Visual Prompt</label>
                    <input
                      type="text"
                      placeholder="Keyframe visual composition..."
                      value={newSceneVisualPrompt}
                      onChange={(e) => setNewSceneVisualPrompt(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Camera Motion</label>
                    <input
                      type="text"
                      placeholder="24fps tracking dolly..."
                      value={newSceneMotion}
                      onChange={(e) => setNewSceneMotion(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Voiceover Line</label>
                    <input
                      type="text"
                      placeholder="Spoken narration line..."
                      value={newSceneVoiceover}
                      onChange={(e) => setNewSceneVoiceover(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-sky-500 text-slate-950 text-xs font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Scene
                  </button>
                </form>
              )}

              {/* Visual-First Storyboard Scene Cards Grid (Zero Open Textareas!) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {sceneCards.map((card) => (
                  <div
                    key={card.sceneId}
                    data-testid={`scene-card-${card.sceneNumber}`}
                    className="bg-[#0D1326] border border-slate-800/90 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                          Scene 0{card.sceneNumber} · {card.targetDurationSeconds}s
                        </span>
                        {card.staleSummary && (
                          <span
                            data-testid={`scene-stale-pill-${card.sceneNumber}`}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 font-semibold"
                          >
                            {card.staleSummary}
                          </span>
                        )}
                      </div>

                      {/* 16:9 Visual Preview Frame */}
                      <div className="aspect-video rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center relative">
                        {card.previewMode === 'video' ? (
                          card.activeMediaUrl ? (
                            <video
                              key={card.activeMediaUrl}
                              src={card.activeMediaUrl}
                              poster={card.posterImageUrl}
                              controls
                              loop
                              muted
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          ) : card.posterImageUrl ? (
                            <div className="relative w-full h-full">
                              <img
                                src={card.posterImageUrl}
                                alt={card.title}
                                className="w-full h-full object-cover opacity-75"
                              />
                              <div className="absolute inset-x-0 bottom-2 flex justify-center">
                                <span className="px-2.5 py-1 rounded-full bg-slate-950/85 border border-slate-700 text-[10px] text-sky-300 font-semibold">
                                  Keyframe Ready · Click Generate Motion
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center p-4 text-xs text-slate-500">
                              No motion clip generated yet
                            </div>
                          )
                        ) : card.activeMediaUrl ? (
                          <img
                            src={card.activeMediaUrl}
                            alt={card.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center p-4 text-xs text-slate-500">
                            No keyframe generated yet
                          </div>
                        )}
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-white">{card.title}</h3>
                        <p className="text-xs text-slate-400 italic line-clamp-2 mt-1">
                          "{card.spokenNarrationPreview}"
                        </p>
                      </div>
                    </div>

                    {/* Clean Card Footer Actions */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      {card.previewMode === 'video' ? (
                        <button
                          type="button"
                          data-testid={`generate-motion-${card.sceneNumber}`}
                          disabled={busyAction === `${card.sceneId}-motion_video-gen`}
                          onClick={() =>
                            void handleGenerateSceneAsset(card.sceneId, 'motion_video')
                          }
                          className="flex-1 py-1.5 px-3 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 text-xs font-semibold cursor-pointer"
                        >
                          {busyAction === `${card.sceneId}-motion_video-gen`
                            ? 'Synthesizing...'
                            : card.hasMotionVideo
                              ? 'Regenerate Motion'
                              : 'Generate Motion'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          data-testid={`generate-kf-${card.sceneNumber}`}
                          disabled={busyAction === `${card.sceneId}-keyframe_start-gen`}
                          onClick={() =>
                            void handleGenerateSceneAsset(card.sceneId, 'keyframe_start')
                          }
                          className="flex-1 py-1.5 px-3 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 text-xs font-semibold cursor-pointer"
                        >
                          {busyAction === `${card.sceneId}-keyframe_start-gen`
                            ? 'Generating...'
                            : card.hasKeyframe
                              ? 'Regenerate Keyframe'
                              : 'Generate Keyframe'}
                        </button>
                      )}

                      <button
                        type="button"
                        data-testid={`open-scene-inspector-${card.sceneNumber}`}
                        onClick={() => setInspectedSceneId(card.sceneId)}
                        className="py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                      >
                        Edit Scene
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* On-Demand Scene Inspector Modal */}
              <SceneInspectorModal
                modalState={inspectorModalState}
                busyAction={busyAction}
                onClose={() => setInspectedSceneId(null)}
                onPatchScene={handlePatchScene}
                onDeleteScene={handleDeleteScene}
                onGenerateSceneAsset={handleGenerateSceneAsset}
                onSwitchActiveTake={handleSwitchActiveTake}
              />
            </div>
          );
        })()}

        {/* STEP 3: Streamlined Voice & Soundtrack Studio */}
        {activeStage === 3 && activeCampaign && (() => {
          const audioView = buildStreamlinedAudioViewState(activeCampaign);
          return (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 7 Cols: Per-Scene Narration Studio + Voice Controls Dropdowns + Prompt */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-[#0D1326] border border-slate-800/90 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <AudioLines className="w-4 h-4 text-sky-400" />
                        Scene Voiceover Narration
                      </h2>
                      <p className="text-xs text-slate-400">
                        Active Narrator: <strong>{audioView.activeNarratorName}</strong> · Speed:{' '}
                        <strong className="text-sky-300">{voiceSpeed}x</strong>
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        data-testid="toggle-voice-persona-btn"
                        onClick={() => setShowVoicePersonaForm((v) => !v)}
                        className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                      >
                        <Mic className="w-3.5 h-3.5 text-sky-400" />
                        Customize Voice Persona
                      </button>
                      <button
                        type="button"
                        data-testid="batch-generate-voiceover-btn"
                        disabled={busyAction === 'batch-voiceover_audio'}
                        onClick={() => void handleBatchGenerate('voiceover_audio')}
                        className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer"
                      >
                        {busyAction === 'batch-voiceover_audio'
                          ? 'Synthesizing All Voiceovers...'
                          : 'Synthesize All Voiceovers'}
                      </button>
                    </div>
                  </div>

                  {/* Quick Dropdown Controls + Prompt for Voice Choice & Faster Pacing */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Narrator Voice Preset
                      </label>
                      <select
                        data-testid="voice-preset-select"
                        value={voicePresetId}
                        onChange={(e) => {
                          const chosen = VOICE_PRESET_OPTIONS.find(
                            (o) => o.voiceId === e.target.value
                          );
                          if (!chosen) return;
                          setVoicePresetId(chosen.voiceId);
                          setVoiceDisplayName(chosen.displayName);
                          setVoiceGender(chosen.gender);
                          setVoiceStylePreset(chosen.defaultStyle);
                          setVoicePersonaPrompt(chosen.defaultPrompt);
                          const nextPersona = {
                            ...activeCampaign.voicePersona,
                            voiceId: chosen.voiceId,
                            displayName: chosen.displayName,
                            gender: chosen.gender,
                            personaPrompt: chosen.defaultPrompt,
                            speakingRate: voiceSpeed,
                            vocalStylePreset: chosen.defaultStyle,
                          };
                          setActiveCampaign({
                            ...activeCampaign,
                            voicePersona: nextPersona,
                          });
                          void handleUpdateCampaignField({ voicePersona: nextPersona });
                        }}
                        className="w-full bg-slate-950 border border-slate-700/90 rounded-lg px-2.5 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                      >
                        {VOICE_PRESET_OPTIONS.map((opt) => (
                          <option key={opt.voiceId} value={opt.voiceId}>
                            {opt.displayName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Speaking Speed (Pace)
                      </label>
                      <select
                        data-testid="voice-speed-select"
                        value={String(voiceSpeed)}
                        onChange={(e) => {
                          const nextSpeed = Number(e.target.value) || 1.25;
                          setVoiceSpeed(nextSpeed);
                          const nextPersona = {
                            ...activeCampaign.voicePersona,
                            speakingRate: nextSpeed,
                          };
                          setActiveCampaign({
                            ...activeCampaign,
                            voicePersona: nextPersona,
                          });
                          void handleUpdateCampaignField({ voicePersona: nextPersona });
                        }}
                        className="w-full bg-slate-950 border border-slate-700/90 rounded-lg px-2.5 py-2 text-xs text-sky-300 font-semibold focus:border-sky-500 focus:outline-none"
                      >
                        {VOICE_SPEED_OPTIONS.map((opt) => (
                          <option key={opt.value} value={String(opt.value)}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Vocal Delivery Style
                      </label>
                      <select
                        data-testid="voice-style-select"
                        value={voiceStylePreset}
                        onChange={(e) => {
                          const chosenStyle = e.target.value;
                          setVoiceStylePreset(chosenStyle);
                          const updatedPrompt = `${chosenStyle}. ${voicePersonaPrompt}`;
                          setVoicePersonaPrompt(updatedPrompt);
                          const nextPersona = {
                            ...activeCampaign.voicePersona,
                            vocalStylePreset: chosenStyle,
                            personaPrompt: updatedPrompt,
                            speakingRate: voiceSpeed,
                          };
                          setActiveCampaign({
                            ...activeCampaign,
                            voicePersona: nextPersona,
                          });
                          void handleUpdateCampaignField({ voicePersona: nextPersona });
                        }}
                        className="w-full bg-slate-950 border border-slate-700/90 rounded-lg px-2.5 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                      >
                        {VOICE_STYLE_OPTIONS.map((styleOpt) => (
                          <option key={styleOpt} value={styleOpt}>
                            {styleOpt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Always-Available Voice Direction Prompt alongside Dropdowns */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Voice Direction Prompt (Fine-tune tone & pacing alongside dropdowns)
                    </label>
                    <input
                      type="text"
                      data-testid="voice-prompt-input"
                      value={voicePersonaPrompt}
                      onChange={(e) => {
                        setVoicePersonaPrompt(e.target.value);
                        setActiveCampaign({
                          ...activeCampaign,
                          voicePersona: {
                            ...activeCampaign.voicePersona,
                            personaPrompt: e.target.value,
                          },
                        });
                      }}
                      onBlur={() =>
                        void handleUpdateCampaignField({
                          voicePersona: {
                            ...activeCampaign.voicePersona,
                            personaPrompt: voicePersonaPrompt,
                            speakingRate: voiceSpeed,
                          },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                    />
                  </div>
                </div>

                {showVoicePersonaForm && (
                  <section
                    data-testid="voice-persona-drawer"
                    className="bg-[#0D1326] border border-sky-500/30 rounded-2xl p-5 space-y-4"
                  >
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400">
                        Custom Narrator Voice Persona
                      </h3>
                      <p className="text-xs text-slate-400">
                        Describe the vocal tone, cadence, and persona for your campaign narrator.
                      </p>
                    </div>

                    <form onSubmit={(e) => void handleDesignVoice(e)} className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Narrator Name
                          </label>
                          <input
                            type="text"
                            value={voiceDisplayName}
                            onChange={(e) => setVoiceDisplayName(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Voice Gender
                          </label>
                          <select
                            value={voiceGender}
                            onChange={(e) =>
                              setVoiceGender(e.target.value as 'female' | 'male' | 'neutral')
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          >
                            <option value="female">Female</option>
                            <option value="male">Male</option>
                            <option value="neutral">Neutral</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Voice Persona Description
                        </label>
                        <textarea
                          rows={2}
                          value={voicePersonaPrompt}
                          onChange={(e) => setVoicePersonaPrompt(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                        />
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] text-emerald-300">
                          Active Voice: {audioView.activeNarratorName}
                        </span>
                        <button
                          type="submit"
                          data-testid="design-voice-btn"
                          disabled={busyAction === 'voice-design'}
                          className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer"
                        >
                          {busyAction === 'voice-design'
                            ? 'Designing Voice...'
                            : 'Save & Audition Voice'}
                        </button>
                      </div>
                    </form>

                    {audioView.voiceSampleAudioUrl && (
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                        <div className="text-[11px] text-sky-300 font-semibold">
                          Voice Sample Preview
                        </div>
                        <audio
                          data-voiceover-player="true"
                          src={audioView.voiceSampleAudioUrl}
                          onPlay={(e) => {
                            e.currentTarget.playbackRate = voiceSpeed;
                          }}
                          controls
                          className="w-full h-8"
                        />
                      </div>
                    )}
                  </section>
                )}

                <div className="space-y-3">
                  {audioView.scenes.map((scene) => (
                    <div
                      key={scene.sceneId}
                      className="bg-[#0D1326] border border-slate-800/90 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            Scene 0{scene.sceneNumber}: {scene.title}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 font-mono">
                            {voiceSpeed}x Pace
                          </span>
                          {scene.isStale && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 font-semibold">
                              Out of Sync
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 italic">"{scene.voiceoverScript}"</p>
                        {scene.activeVoiceoverUrl && (
                          <audio
                            data-voiceover-player="true"
                            src={scene.activeVoiceoverUrl}
                            onPlay={(e) => {
                              e.currentTarget.playbackRate = voiceSpeed;
                            }}
                            controls
                            className="w-full max-w-md h-8 mt-2"
                          />
                        )}
                      </div>

                      <button
                        type="button"
                        data-testid={`generate-vo-${scene.sceneNumber}`}
                        disabled={busyAction === `${scene.sceneId}-voiceover_audio-gen`}
                        onClick={() =>
                          void handleGenerateSceneAsset(scene.sceneId, 'voiceover_audio')
                        }
                        className="px-3.5 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 text-xs font-semibold shrink-0 cursor-pointer"
                      >
                        {busyAction === `${scene.sceneId}-voiceover_audio-gen`
                          ? 'Synthesizing...'
                          : scene.activeVoiceoverUrl
                            ? `Re-Synthesize (${scene.activeVoiceoverDurationSeconds || 4}s)`
                            : 'Synthesize Voiceover'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right 5 Cols: Campaign Soundtrack Composer with Dropdown Controls + Prompt */}
              <div className="lg:col-span-5 space-y-6">
                <section className="bg-[#0D1326] border border-slate-800/90 rounded-2xl p-5 space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Music className="w-4 h-4 text-sky-400" />
                      Campaign Soundtrack
                    </h2>
                    <p className="text-xs text-slate-400">
                      Choose a musical style, tempo, and instrumentation or customize the prompt
                      below.
                    </p>
                  </div>

                  {/* Soundtrack Dropdown Controls */}
                  <div className="space-y-2.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Soundtrack Style / Genre
                      </label>
                      <select
                        data-testid="music-genre-select"
                        value={musicGenre}
                        onChange={(e) => {
                          const nextGenre = e.target.value;
                          setMusicGenre(nextGenre);
                          const composed = composeSoundtrackPromptFromSelections({
                            genre: nextGenre,
                            tempo: musicTempo,
                            instruments: musicInstruments,
                          });
                          setActiveCampaign({
                            ...activeCampaign,
                            musicalMoodPrompt: composed,
                          });
                          void handleUpdateCampaignField({ musicalMoodPrompt: composed });
                        }}
                        className="w-full bg-slate-950 border border-slate-700/90 rounded-lg px-2.5 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                      >
                        {MUSIC_GENRE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Tempo & Energy
                        </label>
                        <select
                          data-testid="music-tempo-select"
                          value={musicTempo}
                          onChange={(e) => {
                            const nextTempo = e.target.value;
                            setMusicTempo(nextTempo);
                            const composed = composeSoundtrackPromptFromSelections({
                              genre: musicGenre,
                              tempo: nextTempo,
                              instruments: musicInstruments,
                            });
                            setActiveCampaign({
                              ...activeCampaign,
                              musicalMoodPrompt: composed,
                            });
                            void handleUpdateCampaignField({ musicalMoodPrompt: composed });
                          }}
                          className="w-full bg-slate-950 border border-slate-700/90 rounded-lg px-2.5 py-2 text-xs text-sky-300 font-semibold focus:border-sky-500 focus:outline-none"
                        >
                          {MUSIC_TEMPO_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Instrumentation
                        </label>
                        <select
                          data-testid="music-instruments-select"
                          value={musicInstruments}
                          onChange={(e) => {
                            const nextInst = e.target.value;
                            setMusicInstruments(nextInst);
                            const composed = composeSoundtrackPromptFromSelections({
                              genre: musicGenre,
                              tempo: musicTempo,
                              instruments: nextInst,
                            });
                            setActiveCampaign({
                              ...activeCampaign,
                              musicalMoodPrompt: composed,
                            });
                            void handleUpdateCampaignField({ musicalMoodPrompt: composed });
                          }}
                          className="w-full bg-slate-950 border border-slate-700/90 rounded-lg px-2.5 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                        >
                          {MUSIC_INSTRUMENT_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Soundtrack Prompt (Auto-updates from dropdowns or edit directly)
                    </label>
                    <textarea
                      rows={2}
                      data-testid="soundtrack-prompt-textarea"
                      value={activeCampaign.musicalMoodPrompt}
                      onChange={(e) =>
                        setActiveCampaign({
                          ...activeCampaign,
                          musicalMoodPrompt: e.target.value,
                        })
                      }
                      onBlur={() =>
                        void handleUpdateCampaignField({
                          musicalMoodPrompt: activeCampaign.musicalMoodPrompt,
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      data-testid="compose-lyria-35-btn"
                      disabled={busyAction === 'music-lyria-3.5'}
                      onClick={() => void handleGenerateMusic('lyria-3.5')}
                      className="flex-1 py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer"
                    >
                      {busyAction === 'music-lyria-3.5'
                        ? 'Composing Soundtrack...'
                        : 'Compose Soundtrack'}
                    </button>
                    <button
                      type="button"
                      disabled={busyAction === 'music-lyria-3-clip-preview'}
                      onClick={() => void handleGenerateMusic('lyria-3-clip-preview')}
                      className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 font-semibold text-xs cursor-pointer"
                    >
                      30s Preview Clip
                    </button>
                  </div>

                  {audioView.activeMusicMediaUrl && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-emerald-300 font-semibold">
                          Active Campaign Soundtrack
                        </span>
                        <span className="text-slate-400">Auto-ducked under voiceover</span>
                      </div>
                      <audio
                        src={audioView.activeMusicMediaUrl}
                        controls
                        className="w-full h-8"
                      />
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-800/80 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveStage(4)}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-sky-300 border border-slate-800 text-xs font-semibold cursor-pointer"
                    >
                      Next: Final Cut →
                    </button>
                  </div>
                </section>
              </div>
            </div>
          );
        })()}

        {/* STEP 4: Pure Final Cut Theater (No Brand Eval Scorecard or Raw FFmpeg Clutter) */}
        {activeStage === 4 && activeCampaign && (() => {
          const finalCutView = buildFinalCutTheaterViewState(activeCampaign);
          return (
            <div className="max-w-4xl mx-auto space-y-6">
              <section className="bg-[#0D1326] border border-slate-800/90 rounded-2xl p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Play className="w-5 h-5 text-sky-400" />
                      Final Cut Theater
                    </h2>
                    <p className="text-xs text-slate-400">
                      Assemble your scenes, voiceovers, and soundtrack into a finished master{' '}
                      <code>.MP4</code> commercial.
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid="assemble-master-btn"
                    disabled={busyAction === 'assemble-master'}
                    onClick={() => void handleAssembleMasterCut()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs shrink-0 cursor-pointer"
                  >
                    <Film className="w-4 h-4" />
                    {busyAction === 'assemble-master'
                      ? 'Assembling Master MP4...'
                      : 'Assemble Final Master Cut (.MP4)'}
                  </button>
                </div>

                {/* Master Cut Video Player */}
                {finalCutView.masterVideoUrl ? (
                  <div className="space-y-3">
                    <div className="aspect-video rounded-xl bg-slate-950 border border-emerald-500/40 overflow-hidden relative">
                      <video
                        key={finalCutView.masterVideoUrl}
                        data-testid="master-cut-video-player"
                        src={finalCutView.masterVideoUrl}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex items-center justify-between bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl">
                      <div className="text-xs">
                        <span className="font-bold text-emerald-300">
                          Master Cut Ready ({finalCutView.totalDurationSeconds}s)
                        </span>
                        {finalCutView.masterStale && (
                          <span className="ml-2 text-amber-300 font-semibold">
                            (Upstream scene changed — re-assemble to refresh)
                          </span>
                        )}
                      </div>
                      <a
                        href={finalCutView.masterVideoUrl}
                        download={`${activeCampaign.title.replace(/\s+/g, '_')}_Master.mp4`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 text-xs font-semibold"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download Master .MP4
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center p-8 text-center text-xs text-slate-400">
                    Click <strong>Assemble Final Master Cut (.MP4)</strong> above to render your
                    complete commercial with synchronized narration and music.
                  </div>
                )}

                {/* Clean Scene Duration Summary */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Scene Timeline Summary
                    </span>
                    <span className="text-xs font-mono text-sky-300">
                      Total Runtime: {finalCutView.totalDurationSeconds}s
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {finalCutView.sceneTimings.map((seg) => (
                      <div
                        key={seg.sceneId}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between"
                      >
                        <span className="text-slate-200 font-medium truncate pr-2">
                          0{seg.sceneOrder}. {seg.sceneTitle}
                        </span>
                        <span className="font-mono text-sky-300 shrink-0">
                          {seg.durationLabel}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          );
        })()}
      </main>

      {/* Subtle Single-Line Studio Status Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0A0F1D] px-6 py-2.5">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-200">Studio Status:</span>
            {events[0] ? (
              <span className="text-sky-300">{events[0].message}</span>
            ) : (
              <span className="text-slate-500">Ready</span>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
