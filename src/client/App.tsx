import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  AudioLines,
  CheckCircle2,
  Clapperboard,
  Cpu,
  Download,
  Film,
  Image as ImageIcon,
  Layers,
  Mic,
  Music,
  Play,
  Plus,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import type {
  AssetTake,
  BrandKit,
  CampaignDetail,
  CampaignSummary,
  Modality,
  Scene,
  StarterCampaignTemplate,
  StudioSSEEvent,
  StudioStageNumber,
} from '../shared/types.js';
import {
  SIMPLIFIED_STEPS,
  computeSimplifiedStepReadiness,
  buildCalmBriefViewState,
  type SimplifiedStepNumber,
} from './viewModel/studioViewModel.js';

export function App() {
  const [brandKits, setBrandKits] = useState<BrandKit[]>([]);
  const [starterTemplates, setStarterTemplates] = useState<StarterCampaignTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<CampaignDetail | null>(null);
  const [activeStage, setActiveStage] = useState<StudioStageNumber>(1);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [events, setEvents] = useState<StudioSSEEvent[]>([]);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Per-scene conversational edit prompt state
  const [sceneEditPrompts, setSceneEditPrompts] = useState<Record<string, string>>({});

  // Custom Brand Kit modal state
  const [showNewBrandKitForm, setShowNewBrandKitForm] = useState(false);
  const [newBrandKitName, setNewBrandKitName] = useState('');
  const [newBrandKitTagline, setNewBrandKitTagline] = useState('');

  // Voice Design form state
  const [voiceDisplayName, setVoiceDisplayName] = useState('Commander Elena Vance');
  const [voiceGender, setVoiceGender] = useState<'female' | 'male' | 'neutral'>('female');
  const [voicePersonaPrompt, setVoicePersonaPrompt] = useState(
    'An authoritative, calm, and inspiring aerospace chief test pilot with crisp mid-Atlantic diction and warm cinematic gravitas.'
  );

  // New Scene form state
  const [newSceneTitle, setNewSceneTitle] = useState('');
  const [newSceneVisualPrompt, setNewSceneVisualPrompt] = useState('');
  const [newSceneMotion, setNewSceneMotion] = useState('');
  const [newSceneVoiceover, setNewSceneVoiceover] = useState('');

  // New Reference Anchor form state
  const [showNewAnchorForm, setShowNewAnchorForm] = useState(false);
  const [newAnchorName, setNewAnchorName] = useState('');
  const [newAnchorCategory, setNewAnchorCategory] = useState<'aircraft' | 'cockpit' | 'crew' | 'logo' | 'environment'>('aircraft');
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

  function getTakeById(takeId?: string): AssetTake | undefined {
    if (!takeId || !activeCampaign) return undefined;
    return activeCampaign.takes.find((t) => t.id === takeId);
  }

  function getSceneTakes(sceneId: string, modality: Modality): AssetTake[] {
    if (!activeCampaign) return [];
    return activeCampaign.takes.filter(
      (t) => t.sceneId === sceneId && t.modality === modality
    );
  }

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

  async function handleCreateCustomBrandKit(e: React.FormEvent) {
    e.preventDefault();
    if (!newBrandKitName.trim() || !activeBrandKit) return;
    setBusyAction('create-brand-kit');
    try {
      const res = await fetch('/api/brand-kits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBrandKitName.trim(),
          organization: 'Cymbal Aerospace Corporation',
          tagline: newBrandKitTagline.trim() || 'Precision Flight Systems',
          visualIdentityRules: activeBrandKit.visualIdentityRules,
          aerospaceRealismRules: activeBrandKit.aerospaceRealismRules,
          regulatoryClaimGuardrails: activeBrandKit.regulatoryClaimGuardrails,
          colorPalette: activeBrandKit.colorPalette,
          defaultVoicePersona: activeBrandKit.defaultVoicePersona,
          defaultMusicPrompt: activeBrandKit.defaultMusicPrompt,
        }),
      });
      if (res.ok) {
        const kit: BrandKit = await res.json();
        setBrandKits((prev) => [...prev, kit]);
        if (activeCampaign) {
          await handleUpdateCampaignField({ brandKitId: kit.id });
        }
        setNewBrandKitName('');
        setNewBrandKitTagline('');
        setShowNewBrandKitForm(false);
      }
    } finally {
      setBusyAction(null);
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
      if (options?.conversationalEdit) {
        setSceneEditPrompts((prev) => ({ ...prev, [`${sceneId}-${modality}`]: '' }));
      }
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

  async function handleRunBrandEvaluation() {
    if (!activeCampaign) return;
    setBusyAction('brand-eval');
    setErrorBanner(null);
    try {
      const res = await fetch(`/api/campaigns/${activeCampaign.id}/brand-eval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Brand evaluation failed (${res.status})`);
      }
      const data = await res.json();
      setActiveCampaign(data.campaign);
    } catch (err) {
      setErrorBanner((err as Error).message);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleAutoFixFinding(findingId: string) {
    if (!activeCampaign) return;
    setBusyAction(`autofix-${findingId}`);
    setErrorBanner(null);
    try {
      const res = await fetch(
        `/api/campaigns/${activeCampaign.id}/brand-eval/findings/${findingId}/autofix`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Auto-fix failed (${res.status})`);
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

  const totalStaleCount =
    (activeCampaign?.scenes.reduce((acc, s) => {
      return (
        acc +
        (s.stale.keyframe_start ? 1 : 0) +
        (s.stale.keyframe_end ? 1 : 0) +
        (s.stale.motion_video ? 1 : 0) +
        (s.stale.voiceover_audio ? 1 : 0)
      );
    }, 0) || 0) + (activeCampaign?.masterStale ? 1 : 0);

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
                const stageNum =
                  c.id === activeCampaign?.id
                    ? Math.max(c.currentStage, activeCampaign.currentStage, activeStage)
                    : c.currentStage;
                return (
                  <option key={c.id} value={c.id}>
                    {c.title} (Stage {stageNum}/6)
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
                  onClick={() => setActiveStage(st.number as StudioStageNumber)}
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

        {/* STAGE 2: AI Storyboard & Non-Linear Scene Canvas */}
        {activeStage === 2 && activeCampaign && (
          <div className="space-y-6">
            <div className="bg-[#0D1326] border border-slate-800/90 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Clapperboard className="w-4 h-4 text-sky-400" />
                  Stage 2 — AI Storyboard & Non-Linear Scene Canvas
                </h2>
                <p className="text-xs text-slate-400">
                  Generated with <code className="text-sky-300">gemini-3.8-flash</code> Structured
                  Outputs. Editing any prompt or script automatically marks downstream keyframes,
                  motion clips, or voiceovers as{' '}
                  <span className="text-amber-300 font-semibold">Stale / Out of Sync</span> without
                  deleting prior takes.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  data-testid="stage2-regenerate-storyboard-btn"
                  disabled={busyAction === 'generate-storyboard'}
                  onClick={() => void handleGenerateStoryboard()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  {busyAction === 'generate-storyboard'
                    ? 'Generating via gemini-3.8-flash...'
                    : activeCampaign.scenes.length > 0
                      ? 'Regenerate AI Storyboard'
                      : 'Generate AI Storyboard'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStage(3)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Next: Keyframe Studio (Stage 3) →
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {activeCampaign.scenes.map((scene, idx) => (
                <div
                  key={scene.id}
                  data-testid={`scene-card-${idx + 1}`}
                  className="bg-[#0D1326] border border-slate-800/90 rounded-2xl p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                        SCENE 0{idx + 1} · {scene.targetDurationSeconds}s
                      </span>
                      <div className="flex items-center gap-1.5">
                        {(scene.stale.keyframe_start ||
                          scene.stale.motion_video ||
                          scene.stale.voiceover_audio) && (
                          <span
                            data-testid={`scene-stale-pill-${idx + 1}`}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 font-semibold"
                          >
                            Stale Downstream:{' '}
                            {[
                              scene.stale.keyframe_start ? 'Keyframe' : null,
                              scene.stale.motion_video ? 'Motion' : null,
                              scene.stale.voiceover_audio ? 'Voiceover' : null,
                            ]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        )}
                        <button
                          type="button"
                          title="Delete Scene"
                          onClick={() => void handleDeleteScene(scene.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={scene.title}
                      onChange={(e) => {
                        const next = activeCampaign.scenes.map((s) =>
                          s.id === scene.id ? { ...s, title: e.target.value } : s
                        );
                        setActiveCampaign({ ...activeCampaign, scenes: next });
                      }}
                      onBlur={(e) =>
                        void handlePatchScene(scene.id, { title: e.target.value })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-sm font-bold text-white"
                    />

                    <div>
                      <label className="block text-[11px] font-semibold text-sky-300 mb-1">
                        Nano Banana 2.1 Visual Keyframe Prompt
                      </label>
                      <textarea
                        rows={3}
                        data-testid={`scene-visual-prompt-${idx + 1}`}
                        value={scene.visualPrompt}
                        onChange={(e) => {
                          const next = activeCampaign.scenes.map((s) =>
                            s.id === scene.id ? { ...s, visualPrompt: e.target.value } : s
                          );
                          setActiveCampaign({ ...activeCampaign, scenes: next });
                        }}
                        onBlur={(e) =>
                          void handlePatchScene(scene.id, { visualPrompt: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-indigo-300 mb-1">
                        Omni 1.1 Flash Camera & Motion Directive
                      </label>
                      <textarea
                        rows={2}
                        value={scene.cameraMotionDirective}
                        onChange={(e) => {
                          const next = activeCampaign.scenes.map((s) =>
                            s.id === scene.id
                              ? { ...s, cameraMotionDirective: e.target.value }
                              : s
                          );
                          setActiveCampaign({ ...activeCampaign, scenes: next });
                        }}
                        onBlur={(e) =>
                          void handlePatchScene(scene.id, {
                            cameraMotionDirective: e.target.value,
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-emerald-300 mb-1">
                        Gemini 3.8 TTS Narration Script
                      </label>
                      <textarea
                        rows={2}
                        data-testid={`scene-voiceover-script-${idx + 1}`}
                        value={scene.voiceoverScript}
                        onChange={(e) => {
                          const next = activeCampaign.scenes.map((s) =>
                            s.id === scene.id ? { ...s, voiceoverScript: e.target.value } : s
                          );
                          setActiveCampaign({ ...activeCampaign, scenes: next });
                        }}
                        onBlur={(e) =>
                          void handlePatchScene(scene.id, {
                            voiceoverScript: e.target.value,
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Custom Scene Form */}
            <form
              onSubmit={(e) => void handleAddScene(e)}
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
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Scene to Canvas
              </button>
            </form>
          </div>
        )}

        {/* STAGE 3: Keyframe & Reference Anchor Studio (gemini-nano-banana-2.1) */}
        {activeStage === 3 && activeCampaign && (
          <div className="space-y-6">
            {/* Reference Anchors Section */}
            <section className="bg-[#0D1326] border border-slate-800/90 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-sky-400">
                    Reusable Brand & Subject Reference Anchors (gemini-nano-banana-2.1)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Reference anchor images are fused into every scene keyframe request (up to 14
                    references) so Cymbal aircraft liveries, avionics hardware, and crew stay
                    visually locked across shots.
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
                          e.target.value as 'aircraft' | 'cockpit' | 'crew' | 'logo' | 'environment'
                        )
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="aircraft">aircraft</option>
                      <option value="cockpit">cockpit</option>
                      <option value="crew">crew</option>
                      <option value="logo">logo</option>
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
                      : 'Create & Generate Anchor'}
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
                        <h3 className="text-xs font-bold text-white mt-1.5">{anchor.name}</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">{anchor.description}</p>
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
                        ? 'Synthesizing Anchor...'
                        : anchor.imageUrl
                          ? 'Regenerate Reference Anchor'
                          : 'Generate Reference Anchor (Nano Banana 2.1)'}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Scene Keyframes Section */}
            <section className="space-y-4">
              <div className="bg-[#0D1326] border border-slate-800/90 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-sky-400" />
                    Stage 3 — Scene Keyframes & Stateful Conversational Editing
                  </h2>
                  <p className="text-xs text-slate-400">
                    Powered by <code className="text-sky-300">gemini-nano-banana-2.1</code> with
                    multi-image reference fusion and stateful{' '}
                    <code className="text-sky-300">previous_interaction_id</code> turn editing.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    data-testid="batch-generate-keyframes-btn"
                    disabled={busyAction === 'batch-keyframe_start'}
                    onClick={() => void handleBatchGenerate('keyframe_start')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    {busyAction === 'batch-keyframe_start'
                      ? 'Generating All Keyframes in Parallel...'
                      : 'Generate All Scene Keyframes (Parallel)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStage(4)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    Next: Motion Synthesis (Stage 4) →
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {activeCampaign.scenes.map((scene, idx) => {
                  const activeKfTake = getTakeById(scene.activeTakes.keyframe_start);
                  const kfTakes = getSceneTakes(scene.id, 'keyframe_start');
                  const editKey = `${scene.id}-keyframe_start`;

                  return (
                    <div
                      key={scene.id}
                      className="bg-[#0D1326] border border-slate-800/90 rounded-2xl p-5 flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">
                            0{idx + 1}. {scene.title}
                          </span>
                          {scene.stale.keyframe_start && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 font-semibold">
                              Stale / Out of Sync
                            </span>
                          )}
                        </div>

                        {/* Keyframe Preview Box */}
                        <div className="aspect-video rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center relative">
                          {activeKfTake ? (
                            <img
                              src={activeKfTake.mediaUrl}
                              alt={scene.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-center p-4 text-xs text-slate-500">
                              No keyframe generated yet
                            </div>
                          )}
                          {activeKfTake && (
                            <div className="absolute bottom-2 left-2 right-2 bg-slate-950/85 backdrop-blur px-2.5 py-1 rounded text-[10px] font-mono text-slate-300 flex items-center justify-between">
                              <span>ID: {activeKfTake.interactionId}</span>
                              {activeKfTake.parentInteractionId && (
                                <span className="text-sky-400">
                                  ↳ Edited from {activeKfTake.parentInteractionId}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-2">{scene.visualPrompt}</p>

                        {/* Generate / Re-roll Button */}
                        <button
                          type="button"
                          data-testid={`generate-kf-${idx + 1}`}
                          disabled={busyAction === `${scene.id}-keyframe_start-gen`}
                          onClick={() =>
                            void handleGenerateSceneAsset(scene.id, 'keyframe_start')
                          }
                          className="w-full py-1.5 px-3 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 text-xs font-semibold cursor-pointer"
                        >
                          {busyAction === `${scene.id}-keyframe_start-gen`
                            ? 'Synthesizing via Nano Banana 2.1...'
                            : activeKfTake
                              ? 'Generate Fresh Keyframe Take'
                              : 'Generate Start Keyframe (Nano Banana 2.1)'}
                        </button>

                        {/* Stateful Conversational Turn Edit Input */}
                        {activeKfTake && (
                          <div className="pt-2 border-t border-slate-800/80 space-y-2">
                            <label className="block text-[11px] font-semibold text-sky-300">
                              Conversational Turn Edit (previous_interaction_id)
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                data-testid={`edit-kf-input-${idx + 1}`}
                                placeholder="e.g. Add golden sunset flare on fuselage..."
                                value={sceneEditPrompts[editKey] || ''}
                                onChange={(e) =>
                                  setSceneEditPrompts((prev) => ({
                                    ...prev,
                                    [editKey]: e.target.value,
                                  }))
                                }
                                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                              />
                              <button
                                type="button"
                                data-testid={`edit-kf-submit-${idx + 1}`}
                                disabled={!sceneEditPrompts[editKey]?.trim()}
                                onClick={() =>
                                  void handleGenerateSceneAsset(scene.id, 'keyframe_start', {
                                    promptOverride: sceneEditPrompts[editKey],
                                    conversationalEdit: true,
                                  })
                                }
                                className="px-3 py-1.5 rounded-lg bg-sky-500 text-slate-950 font-bold text-xs cursor-pointer disabled:opacity-40"
                              >
                                Edit
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Take History Selector */}
                        {kfTakes.length > 0 && (
                          <div className="pt-2 border-t border-slate-800/80">
                            <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                              Take History ({kfTakes.length} saved in Vault)
                            </label>
                            <select
                              aria-label={`Keyframe Take History Scene ${idx + 1}`}
                              value={scene.activeTakes.keyframe_start || ''}
                              onChange={(e) =>
                                void handleSwitchActiveTake(
                                  scene.id,
                                  'keyframe_start',
                                  e.target.value
                                )
                              }
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-200 font-mono"
                            >
                              {kfTakes.map((t, tIdx) => (
                                <option key={t.id} value={t.id}>
                                  Take #{kfTakes.length - tIdx} ({t.id}) — {t.prompt.slice(0, 38)}...
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* STAGE 4: Motion Video Synthesis (gemini-omni-1.1-flash) */}
        {activeStage === 4 && activeCampaign && (
          <div className="space-y-6">
            <div className="bg-[#0D1326] border border-slate-800/90 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Film className="w-4 h-4 text-sky-400" />
                  Stage 4 — Keyframe-Locked Motion Synthesis & Conversational Video Editing
                </h2>
                <p className="text-xs text-slate-400">
                  Powered by <code className="text-sky-300">gemini-omni-1.1-flash</code>. Locks
                  motion generation to each scene’s approved Nano Banana 2.1 start keyframe and
                  supports stateful conversational video refinement & tail extensions.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  data-testid="batch-generate-motion-btn"
                  disabled={busyAction === 'batch-motion_video'}
                  onClick={() => void handleBatchGenerate('motion_video')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  {busyAction === 'batch-motion_video'
                    ? 'Synthesizing All Motion Clips...'
                    : 'Synthesize All Motion Clips (Parallel)'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStage(5)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Next: Voiceover & Music Score (Stage 5) →
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {activeCampaign.scenes.map((scene, idx) => {
                const activeVidTake = getTakeById(scene.activeTakes.motion_video);
                const activeKfTake = getTakeById(scene.activeTakes.keyframe_start);
                const vidTakes = getSceneTakes(scene.id, 'motion_video');
                const editKey = `${scene.id}-motion_video`;

                return (
                  <div
                    key={scene.id}
                    className="bg-[#0D1326] border border-slate-800/90 rounded-2xl p-5 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">
                          0{idx + 1}. {scene.title}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {activeKfTake && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
                              Locked to KF {activeKfTake.id}
                            </span>
                          )}
                          {scene.stale.motion_video && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 font-semibold">
                              Stale / Out of Sync
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="aspect-video rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center relative">
                        {activeVidTake ? (
                          <video
                            src={activeVidTake.mediaUrl}
                            controls
                            loop
                            muted
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center p-4 text-xs text-slate-500">
                            No motion video synthesized yet
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-slate-400">{scene.cameraMotionDirective}</p>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          data-testid={`generate-motion-${idx + 1}`}
                          disabled={busyAction === `${scene.id}-motion_video-gen`}
                          onClick={() =>
                            void handleGenerateSceneAsset(scene.id, 'motion_video')
                          }
                          className="flex-1 py-1.5 px-3 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 text-xs font-semibold cursor-pointer"
                        >
                          {busyAction === `${scene.id}-motion_video-gen`
                            ? 'Synthesizing...'
                            : activeVidTake
                              ? 'Re-Synthesize Motion'
                              : 'Synthesize Motion (Omni 1.1)'}
                        </button>

                        {activeVidTake && (
                          <button
                            type="button"
                            data-testid={`extend-motion-${idx + 1}`}
                            disabled={busyAction === `${scene.id}-motion_video-ext`}
                            onClick={() =>
                              void handleGenerateSceneAsset(scene.id, 'motion_video', {
                                extendVideo: true,
                              })
                            }
                            className="py-1.5 px-3 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-semibold cursor-pointer"
                          >
                            +4s Extend
                          </button>
                        )}
                      </div>

                      {activeVidTake && (
                        <div className="pt-2 border-t border-slate-800/80 space-y-2">
                          <label className="block text-[11px] font-semibold text-sky-300">
                            Conversational Video Edit (previous_interaction_id)
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="e.g. Slow down camera dolly and add contrail vapor..."
                              value={sceneEditPrompts[editKey] || ''}
                              onChange={(e) =>
                                setSceneEditPrompts((prev) => ({
                                  ...prev,
                                  [editKey]: e.target.value,
                                }))
                              }
                              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
                            <button
                              type="button"
                              disabled={!sceneEditPrompts[editKey]?.trim()}
                              onClick={() =>
                                void handleGenerateSceneAsset(scene.id, 'motion_video', {
                                  promptOverride: sceneEditPrompts[editKey],
                                  conversationalEdit: true,
                                })
                              }
                              className="px-3 py-1.5 rounded-lg bg-sky-500 text-slate-950 font-bold text-xs cursor-pointer disabled:opacity-40"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      )}

                      {vidTakes.length > 0 && (
                        <div className="pt-2 border-t border-slate-800/80">
                          <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                            Motion Take History ({vidTakes.length})
                          </label>
                          <select
                            value={scene.activeTakes.motion_video || ''}
                            onChange={(e) =>
                              void handleSwitchActiveTake(
                                scene.id,
                                'motion_video',
                                e.target.value
                              )
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-200 font-mono"
                          >
                            {vidTakes.map((t, tIdx) => (
                              <option key={t.id} value={t.id}>
                                Take #{vidTakes.length - tIdx} ({t.durationSeconds || 6}s) —{' '}
                                {t.interactionId}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STAGE 5: Voiceover (gemini-3.8-flash-tts) & Music Score (lyria-3.5) */}
        {activeStage === 5 && activeCampaign && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 5 Cols: Custom Voice Design & Lyria 3.5 Campaign Soundtrack */}
            <div className="lg:col-span-5 space-y-6">
              <section className="bg-[#0D1326] border border-slate-800/90 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
                      <Mic className="w-4 h-4" />
                      Custom Narrator Voice Design (gemini-3.8-flash-tts)
                    </h2>
                    <p className="text-xs text-slate-400">
                      Create a bespoke Cymbal Aerospace narrator voice from a natural-language
                      persona description via <code className="text-sky-300">voices.create</code>.
                    </p>
                  </div>
                </div>

                <form onSubmit={(e) => void handleDesignVoice(e)} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Persona Display Name
                      </label>
                      <input
                        type="text"
                        value={voiceDisplayName}
                        onChange={(e) => setVoiceDisplayName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Voice Gender</label>
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
                      Voice Design Prompt
                    </label>
                    <textarea
                      rows={3}
                      value={voicePersonaPrompt}
                      onChange={(e) => setVoicePersonaPrompt(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-mono text-emerald-300">
                      Active Voice ID: {activeCampaign.voicePersona.voiceId}
                    </span>
                    <button
                      type="submit"
                      data-testid="design-voice-btn"
                      disabled={busyAction === 'voice-design'}
                      className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer"
                    >
                      {busyAction === 'voice-design'
                        ? 'Designing Voice...'
                        : 'Design & Audition Voice Persona'}
                    </button>
                  </div>
                </form>

                {activeCampaign.voicePersona.sampleAudioUrl && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="text-[11px] text-sky-300 font-semibold">
                      Designed Voice Sample Preview (audio/wav)
                    </div>
                    <audio
                      src={activeCampaign.voicePersona.sampleAudioUrl}
                      controls
                      className="w-full h-8"
                    />
                  </div>
                )}
              </section>

              {/* Lyria 3.5 Campaign Soundtrack Composer */}
              <section className="bg-[#0D1326] border border-slate-800/90 rounded-2xl p-5 space-y-4">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
                    <Music className="w-4 h-4" />
                    Keyframe-Conditioned Campaign Score (Lyria 3.5)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Passes up to 10 active storyboard keyframe images alongside your musical mood
                    prompt to <code className="text-sky-300">lyria-3.5</code> or{' '}
                    <code className="text-sky-300">lyria-3-clip-preview</code>.
                  </p>
                </div>

                <textarea
                  rows={2}
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

                <div className="flex gap-2">
                  <button
                    type="button"
                    data-testid="compose-lyria-35-btn"
                    disabled={busyAction === 'music-lyria-3.5'}
                    onClick={() => void handleGenerateMusic('lyria-3.5')}
                    className="flex-1 py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    {busyAction === 'music-lyria-3.5'
                      ? 'Composing via Lyria 3.5...'
                      : 'Compose Full Score (lyria-3.5)'}
                  </button>
                  <button
                    type="button"
                    disabled={busyAction === 'music-lyria-3-clip-preview'}
                    onClick={() => void handleGenerateMusic('lyria-3-clip-preview')}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 font-semibold text-xs cursor-pointer"
                  >
                    30s Clip (lyria-3-clip)
                  </button>
                </div>

                {activeCampaign.activeMusicTakeId && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-emerald-300 font-semibold">
                        Active Campaign Score ({activeCampaign.activeMusicTakeId})
                      </span>
                      <span className="text-slate-400 font-mono">-12dB Auto-Ducking Ready</span>
                    </div>
                    <audio
                      src={getTakeById(activeCampaign.activeMusicTakeId)?.mediaUrl}
                      controls
                      className="w-full h-8"
                    />
                  </div>
                )}
              </section>
            </div>

            {/* Right 7 Cols: Per-Scene TTS Narration Studio */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-[#0D1326] border border-slate-800/90 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <AudioLines className="w-4 h-4 text-sky-400" />
                    Per-Scene Narration Synthesis (speech_metadata Annotations)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Each scene’s voiceover is synthesized with{' '}
                    <code className="text-sky-300">gemini-3.8-flash-tts</code> and locked to its
                    scene start boundary.
                  </p>
                </div>
                <div className="flex items-center gap-2">
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
                  <button
                    type="button"
                    onClick={() => setActiveStage(6)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    Next: Brand Eval & Master Cut (Stage 6) →
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {activeCampaign.scenes.map((scene, idx) => {
                  const activeVoTake = getTakeById(scene.activeTakes.voiceover_audio);
                  return (
                    <div
                      key={scene.id}
                      className="bg-[#0D1326] border border-slate-800/90 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            Scene 0{idx + 1}: {scene.title}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-sky-300 border border-slate-800">
                            style: "{scene.vocalStyleDirective}"
                          </span>
                          {scene.stale.voiceover_audio && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 font-semibold">
                              Stale / Out of Sync
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 italic">"{scene.voiceoverScript}"</p>
                        {activeVoTake && (
                          <audio
                            src={activeVoTake.mediaUrl}
                            controls
                            className="w-full max-w-md h-8 mt-2"
                          />
                        )}
                      </div>

                      <button
                        type="button"
                        data-testid={`generate-vo-${idx + 1}`}
                        disabled={busyAction === `${scene.id}-voiceover_audio-gen`}
                        onClick={() =>
                          void handleGenerateSceneAsset(scene.id, 'voiceover_audio')
                        }
                        className="px-3.5 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 text-xs font-semibold shrink-0 cursor-pointer"
                      >
                        {busyAction === `${scene.id}-voiceover_audio-gen`
                          ? 'Synthesizing...'
                          : activeVoTake
                            ? `Re-Synthesize (${activeVoTake.durationSeconds || 4}s)`
                            : 'Synthesize Scene TTS'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STAGE 6: Automated Multimodal Brand Evaluation & FFmpeg Master Cut */}
        {activeStage === 6 && activeCampaign && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 6 Cols: Multimodal Brand Compliance Scorecard & One-Click Auto-Fix */}
            <div className="lg:col-span-6 space-y-6">
              <section className="bg-[#0D1326] border border-slate-800/90 rounded-2xl p-5 space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-sky-400" />
                      Multimodal Brand & Aerospace Compliance Scorecard
                    </h2>
                    <p className="text-xs text-slate-400">
                      Inspects generated keyframes, motion videos, and narration scripts via{' '}
                      <code className="text-sky-300">gemini-3.8-flash</code> Structured Outputs.
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid="run-brand-eval-btn"
                    disabled={busyAction === 'brand-eval'}
                    onClick={() => void handleRunBrandEvaluation()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shrink-0 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {busyAction === 'brand-eval'
                      ? 'Evaluating Assets...'
                      : 'Run Multimodal Brand Eval'}
                  </button>
                </div>

                {activeCampaign.latestBrandEvaluation ? (
                  <div className="space-y-5">
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-5">
                      <div
                        data-testid="brand-eval-overall-score"
                        className="w-20 h-20 rounded-2xl bg-sky-500/15 border border-sky-400/40 flex flex-col items-center justify-center shrink-0"
                      >
                        <span className="text-2xl font-black text-sky-300">
                          {activeCampaign.latestBrandEvaluation.overallScore}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400">
                          / 100 Score
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-white">Executive Audit Summary</div>
                        <p className="text-xs text-slate-300">
                          {activeCampaign.latestBrandEvaluation.executiveSummary}
                        </p>
                      </div>
                    </div>

                    {/* 4 Category Progress Bars */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        {
                          label: 'Visual Brand Identity',
                          score:
                            activeCampaign.latestBrandEvaluation.categoryScores.visualIdentity,
                        },
                        {
                          label: 'Aerospace Technical Realism',
                          score:
                            activeCampaign.latestBrandEvaluation.categoryScores.aerospaceRealism,
                        },
                        {
                          label: 'Narrative & Audio Cohesion',
                          score:
                            activeCampaign.latestBrandEvaluation.categoryScores
                              .narrativeAudioCohesion,
                        },
                        {
                          label: 'Regulatory Claim Compliance',
                          score:
                            activeCampaign.latestBrandEvaluation.categoryScores
                              .regulatoryCompliance,
                        },
                      ].map((cat) => (
                        <div
                          key={cat.label}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800"
                        >
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-slate-300 font-medium">{cat.label}</span>
                            <span className="font-mono font-bold text-sky-300">{cat.score}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-sky-400 rounded-full"
                              style={{ width: `${cat.score}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Findings & One-Click Auto-Fix */}
                    <div className="space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Scene-Pinpointed Audit Findings & One-Click Auto-Fix
                      </div>
                      {activeCampaign.latestBrandEvaluation.findings.map((finding) => (
                        <div
                          key={finding.id}
                          data-testid={`brand-finding-${finding.id}`}
                          className={`p-4 rounded-xl border space-y-2 ${
                            finding.resolved
                              ? 'bg-emerald-950/20 border-emerald-500/40'
                              : 'bg-slate-950 border-amber-500/40'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-900 text-sky-300 border border-slate-800">
                                Scene {finding.sceneNumber || 1} · {finding.modality}
                              </span>
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                  finding.resolved
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-amber-500/20 text-amber-300'
                                }`}
                              >
                                {finding.resolved ? 'Auto-Fixed & Verified' : finding.severity}
                              </span>
                            </div>

                            {!finding.resolved && (
                              <button
                                type="button"
                                data-testid={`autofix-btn-${finding.id}`}
                                disabled={busyAction === `autofix-${finding.id}`}
                                onClick={() => void handleAutoFixFinding(finding.id)}
                                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs cursor-pointer"
                              >
                                <Wand2 className="w-3.5 h-3.5" />
                                {busyAction === `autofix-${finding.id}`
                                  ? 'Applying Auto-Fix...'
                                  : 'One-Click Auto-Fix'}
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-slate-200">{finding.issue}</p>
                          <div className="text-[11px] font-mono text-sky-300 bg-slate-900/90 p-2 rounded border border-slate-800">
                            Remediation Prompt: "{finding.suggestedFixPrompt}"
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
                    Click <strong>Run Multimodal Brand Eval</strong> to inspect generated scene
                    keyframes, motion clips, and voiceovers against Cymbal Aerospace guardrails.
                  </div>
                )}
              </section>
            </div>

            {/* Right 6 Cols: FFmpeg Master Timeline Assembler & Final Cut Theater */}
            <div className="lg:col-span-6 space-y-6">
              <section className="bg-[#0D1326] border border-slate-800/90 rounded-2xl p-5 space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Play className="w-5 h-5 text-sky-400" />
                      FFmpeg Master Timeline Assembler & Final Cut Theater
                    </h2>
                    <p className="text-xs text-slate-400">
                      Aligns scene boundaries, pads trailing silence, and applies{' '}
                      <code className="text-sky-300">-12dB</code> audio ducking on the Lyria music
                      bed during speech.
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid="assemble-master-btn"
                    disabled={busyAction === 'assemble-master'}
                    onClick={() => void handleAssembleMasterCut()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs shrink-0 cursor-pointer"
                  >
                    <Film className="w-4 h-4" />
                    {busyAction === 'assemble-master'
                      ? 'Muxing Master MP4 via FFmpeg...'
                      : 'Assemble Final Master Cut (.MP4)'}
                  </button>
                </div>

                {/* Master Cut Video Player */}
                {activeCampaign.activeMasterTakeId && (
                  <div className="space-y-3">
                    <div className="aspect-video rounded-xl bg-slate-950 border border-emerald-500/40 overflow-hidden relative">
                      <video
                        data-testid="master-cut-video-player"
                        src={getTakeById(activeCampaign.activeMasterTakeId)?.mediaUrl}
                        controls
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex items-center justify-between bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl">
                      <div className="text-xs">
                        <span className="font-bold text-emerald-300">
                          Master Cut Ready ({activeCampaign.activeMasterTakeId})
                        </span>
                        {activeCampaign.masterStale && (
                          <span className="ml-2 text-amber-300 font-semibold">
                            (Upstream scene changed — re-assemble to refresh)
                          </span>
                        )}
                      </div>
                      <a
                        href={getTakeById(activeCampaign.activeMasterTakeId)?.mediaUrl}
                        download={`${activeCampaign.title.replace(/\s+/g, '_')}_Master.mp4`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 text-xs font-semibold"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download Master .MP4
                      </a>
                    </div>
                  </div>
                )}

                {/* Timeline Synchronization & Audio Ducking Plan */}
                {activeCampaign.latestTimelinePlan && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Scene Synchronization & -12dB Ducking Matrix
                      </span>
                      <span className="text-xs font-mono text-sky-300">
                        Total Runtime: {activeCampaign.latestTimelinePlan.totalDurationSeconds}s
                      </span>
                    </div>

                    <div className="space-y-2">
                      {activeCampaign.latestTimelinePlan.segments.map((seg) => (
                        <div
                          key={seg.sceneId}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between font-semibold">
                            <span className="text-white">
                              Scene 0{seg.sceneOrder}: {seg.sceneTitle}
                            </span>
                            <span className="font-mono text-sky-300">
                              {seg.startTimeSeconds}s → {seg.endTimeSeconds}s
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-mono">
                            <span>Video: {seg.videoDurationSeconds}s</span>
                            <span>Voiceover: {seg.voiceoverDurationSeconds}s</span>
                            {seg.silencePaddingSeconds > 0 && (
                              <span className="text-emerald-300">
                                +{seg.silencePaddingSeconds}s Silence Pad
                              </span>
                            )}
                            {seg.needsVideoExtension && (
                              <span className="text-amber-300 font-semibold">
                                Overflow +{seg.voiceoverOverflowSeconds}s (Extend Recommended)
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                        FFmpeg Audio Ducking Filtergraph
                      </div>
                      <code className="text-[11px] font-mono text-sky-300 break-all">
                        {activeCampaign.latestTimelinePlan.ffmpegFilterComplex}
                      </code>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Real-Time Server-Sent Events (SSE) Telemetry Bar */}
      <footer className="border-t border-slate-800/80 bg-[#0A0F1D] px-6 py-2.5">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-200">Live Gemini Interactions Stream:</span>
            {events[0] ? (
              <span className="text-sky-300 font-mono">
                [{events[0].modelId}] {events[0].message}
                {events[0].interactionId ? ` (${events[0].interactionId})` : ''}
                {events[0].tokenUsage ? ` · ${events[0].tokenUsage.totalTokens} tokens` : ''}
              </span>
            ) : (
              <span className="text-slate-500">
                Ready — all 5 Gemini multimodal model families connected.
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <Cpu className="w-3.5 h-3.5 text-sky-400" />
            <span>
              gemini-3.8-flash · gemini-nano-banana-2.1 · gemini-omni-1.1-flash ·
              gemini-3.8-flash-tts · lyria-3.5
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
