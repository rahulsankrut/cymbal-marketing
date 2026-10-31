# Cymbal Aerospace Marketing & Video Studio — Architectural Rules (`AGENTS.md`)

## 1. Gemini API & SDK Guardrails (Mandatory)
- **Current SDK Only**: Always use `@google/genai` (`>=2.29.1`) and `client.interactions.create(...)` / `client.voices.create(...)`.
- **Forbidden Legacy APIs & Models**: Never use `@google/generative-ai`, `client.models.generateContent`, `gemini-2.5-*`, `gemini-2.0-*`, `gemini-1.5-*`, or `veo-3.1-*`.
- **Approved Studio Model Roster**:
  - **Stage 2 Storyboarding & Stage 6 Multimodal Brand Evaluation**: `gemini-3.8-flash` with JSON Schema `response_format`.
  - **Stage 3 Keyframes & Reference Anchors**: `gemini-nano-banana-2.1` (up to 14 reference images placed *before* the text prompt; multi-turn edits chained via `previous_interaction_id`).
  - **Stage 4 Motion Video Synthesis & Extension**: `gemini-omni-1.1-flash` (conditioned on start/end keyframes or source video; multi-turn edits chained via `previous_interaction_id`).
  - **Stage 5 Narrator Voice Design & Per-Scene TTS**: `gemini-3.8-flash-tts` (`client.voices.create` with `type: 'prompted'` and `client.interactions.create` with `speech_metadata` style annotations).
  - **Stage 5 Keyframe-Conditioned Music Scoring**: `lyria-3.5` and `lyria-3-clip-preview` conditioned on up to 10 approved keyframe images.

## 2. Five Deep Modules (Ousterhout Architecture)
1. **[`CampaignVault`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/src/server/vault/campaignVault.ts)**: Owns durable campaign state, non-destructive take history on disk (`.data/media/`), and upstream-to-downstream `stale` flag cascading.
2. **[`GeminiStudioGateway`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/src/server/gemini/geminiStudioGateway.ts)**: Encapsulates all `@google/genai` `interactions.create` and `voices.create` calls and resilient local FFmpeg/PCM fallback synthesis when `GEMINI_API_KEY` is unset.
3. **[`StudioPipelineOrchestrator`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/src/server/orchestrator/studioPipelineOrchestrator.ts)**: Caller-optimized 6-stage facade coordinating `CampaignVault`, `GeminiStudioGateway`, `MasterTimelineAssembler`, parallel batch jobs, `previous_interaction_id` lineage, One-Click Brand Eval Auto-Fix, and SSE lifecycle telemetry (`job.started`, `job.completed`, `job.failed`).
4. **[`MasterTimelineAssembler`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/src/server/assembler/masterTimelineAssembler.ts)**: Probes scene video/voiceover durations, computes silence padding vs. voiceover overflow warnings, and executes FFmpeg master `.mp4` concatenation with `-12dB` (`volume=0.251`) music ducking during narration windows.
5. **[`StudioWorkspaceUI`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/src/client/App.tsx) & [`studioViewModel`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/src/client/viewModel/studioViewModel.ts)**: 4-Step Storycraft Progressive-Disclosure React + Tailwind UI (`1. Brief` → `2. Storyboard & Visuals` → `3. Voice & Soundtrack` → `4. Final Cut`) backed by pure, zero-DOM ViewModel selectors (`buildCalmBriefViewState`, `buildVisualSceneCards`, `buildSceneInspectorModalState`, `buildStreamlinedAudioViewState`, `buildFinalCutTheaterViewState`) and an on-demand [`SceneInspectorModal`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/src/client/components/SceneInspectorModal.tsx) so the main storyboard grid has zero open textareas and zero raw model ID/FFmpeg filtergraph clutter.
