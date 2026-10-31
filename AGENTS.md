# Cymbal Aerospace Marketing & Video Studio — Living System Map (`AGENTS.md`)

## 1. Google Cloud & Gemini API Guardrails (Mandatory)
- **Current SDK Only**: Always use `@google/genai` (`>=2.29.1`). Never use deprecated `@google/generative-ai`.
- **Vertex AI Application Default Credentials (ADC)**:
  - Default runtime (`npm start`) executes with `GOOGLE_GENAI_USE_VERTEXAI=1`, `GOOGLE_CLOUD_PROJECT=vertex-ai-demos-468803`, and `GOOGLE_CLOUD_LOCATION=us-central1` (plus `global` endpoint routing inside [`GeminiStudioGateway`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/src/server/gemini/geminiStudioGateway.ts) for preview models).
  - Never invent silent fallback mock clients or canned 24-byte dummy video stubs in production code (`src/`).
- **Approved Studio Model Roster**:
  - **Stage 2 Storyboarding & Stage 6 Multimodal Brand Evaluation**: `gemini-3.8-flash` (Vertex AI fallback `gemini-2.5-flash`) with JSON Schema `response_format`.
  - **Stage 3 Keyframes & Reference Anchors**: `gemini-nano-banana-2.1` (Vertex AI `gemini-2.5-flash-image`, up to 14 reference images placed *before* the text prompt; multi-turn edits chained via `previous_interaction_id`).
  - **Stage 4 Motion Video Synthesis & Extension**: `gemini-omni-1.1-flash` (Vertex AI `veo-3.0-generate-001` LRO polling, conditioned on start/end keyframes or source video; multi-turn edits chained via `previous_interaction_id`).
  - **Stage 5 Narrator Voice Design & Per-Scene TTS**: `gemini-3.8-flash-tts` (`gemini-2.5-flash-preview-tts` on Vertex AI with `voiceConfig.prebuiltVoiceConfig` and FFmpeg `atempo` speaking-rate adjustment, defaulting to `1.25x` commercial pace).
  - **Stage 5 Keyframe-Conditioned Music Scoring**: `lyria-3.5` and `lyria-3-clip-preview` (`lyria-002` on Vertex AI Predict API) conditioned on approved keyframe images and structured soundtrack prompts.

---

## 2. Five Deep Modules (Ousterhout Architecture)

### 1. [`CampaignVault`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/src/server/vault/campaignVault.ts) & [`seedData.ts`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/src/server/vault/seedData.ts)
- Owns durable JSON state (`.data/vault-state.json`), non-destructive media take files on disk (`.data/media/`), and upstream-to-downstream `stale` flag cascading:
  - Editing `visualPrompt` marks `keyframe_start`, `motion_video`, and `masterStale` as `true`.
  - Editing `cameraMotionDirective` or switching active keyframe take marks `motion_video` and `masterStale` as `true`.
  - Editing `voiceoverScript` marks `voiceover_audio` and `masterStale` as `true`.
- `seedDefaultBrandKitAndTemplates()` refreshes `db.starterTemplates` on startup with 3 simple, 1-sentence executive-friendly use cases:
  - `tpl-kids-paper-plane-rocket` (*Kids Level: Paper Plane to Rocket Ship*)
  - `tpl-college-cubesat-launch` (*College Level: Campus Satellite Launch*)
  - `tpl-exec-supersonic-3hr` (*Executive Level: New York to London in 3 Hours*)

### 2. [`GeminiStudioGateway`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/src/server/gemini/geminiStudioGateway.ts)
- Encapsulates all `@google/genai` `interactions.create`, `voices.create`, `models.generateVideos`, and Vertex AI `lyria-002` calls behind a clean domain interface:
  - `generateStructuredStoryboard(params)`
  - `generateReferenceAnchorImage(params)`
  - `generateSceneKeyframe(params)`
  - `generateSceneMotionClip(params)`
  - `designNarratorVoice(params)`
  - `synthesizeSceneVoiceover(params)` — accepts `speakingRate?: number` (default `1.25`) and applies FFmpeg `atempo` so synthesized `.wav` voiceovers are brisk and energetic without pitch shift.
  - `generateCampaignMusicScore(params)`
  - `evaluateCampaignBrandCompliance(params)`

### 3. [`StudioPipelineOrchestrator`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/src/server/orchestrator/studioPipelineOrchestrator.ts)
- Caller-optimized facade coordinating `CampaignVault`, `GeminiStudioGateway`, and `MasterTimelineAssembler` with `Promise.all` parallel batch execution (`batchGenerateSceneAssets`), `previous_interaction_id` lineage lookup, One-Click Brand Eval Auto-Fix (`applyBrandEvaluationAutoFixes`), and SSE lifecycle telemetry (`job.started`, `job.completed`, `job.failed`).

### 4. [`MasterTimelineAssembler`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/src/server/assembler/masterTimelineAssembler.ts)
- `buildTimelinePlan(campaignId)`: Computes per-scene timeline segments, silence padding vs. voiceover overflow warnings, and the `-12dB` (`volume=0.251`) FFmpeg music ducking filtergraph during active narration windows.
- `assembleMasterCut(campaignId)`: Writes the final master `.mp4` directly to disk (`libx264`, `yuv420p`, `aac`, `-movflags +faststart`, `maxBuffer: 128 MB`), concatenating real scene motion `.mp4` clips (or keyframe `.png` fallback), real per-scene `.wav` voiceovers (with `atempo` speedup when voiceover exceeds target duration), and ducked `.wav` soundtrack.

### 5. [`StudioWorkspaceUI`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/src/client/App.tsx), [`SceneInspectorModal`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/src/client/components/SceneInspectorModal.tsx) & [`studioViewModel`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/src/client/viewModel/studioViewModel.ts)
- Pure, zero-DOM ViewModel selectors and option constants in [`studioViewModel.ts`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/src/client/viewModel/studioViewModel.ts):
  - `SIMPLIFIED_STEPS`, `mapBackendStageToStep`, `computeSimplifiedStepReadiness`, `computeTotalStaleCount`
  - `buildCalmBriefViewState(campaign, starterTemplates)` — Step 1 (`1. Brief`) without Brand Guardrails or Custom Kit clutter.
  - `DEFAULT_STORYBOARD_PREVIEW_MODE = 'video'`, `buildVisualSceneCards(campaign, previewMode)`, `buildSceneInspectorModalState(campaign, sceneId)` — Step 2 (`2. Storyboard & Visuals`) with **Motion Clips primary**, **Keyframes toggle**, `0` open textareas on the grid, and on-demand [`SceneInspectorModal`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/src/client/components/SceneInspectorModal.tsx).
  - `VOICE_PRESET_OPTIONS`, `VOICE_SPEED_OPTIONS` (`1.25x` default), `VOICE_STYLE_OPTIONS`, `MUSIC_GENRE_OPTIONS`, `MUSIC_TEMPO_OPTIONS`, `MUSIC_INSTRUMENT_OPTIONS`, `composeSoundtrackPromptFromSelections`, `buildStreamlinedAudioViewState(campaign)` — Step 3 (`3. Voice & Soundtrack`) dropdown controls + editable prompts.
  - `buildFinalCutTheaterViewState(campaign)` — Step 4 (`4. Final Cut`) pure `16:9` `<video>` theater without Brand Eval or raw FFmpeg filtergraph strings.

---

## 3. REST API & Verification Commands
- **Key Routes ([`src/server/index.ts`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/src/server/index.ts))**: `GET /api/bootstrap`, `POST /api/campaigns`, `PATCH /api/campaigns/:id`, `POST /api/campaigns/:id/storyboard/generate`, `POST /api/campaigns/:id/scenes/:sceneId/generate`, `POST /api/campaigns/:id/batch-generate`, `POST /api/campaigns/:id/voice-design`, `POST /api/campaigns/:id/music/generate`, `POST /api/campaigns/:id/assemble`, `GET /api/campaigns/:id/events` (SSE).
- **Build & Test**: Run `npm run build && npm test` (10 Vitest suites, 16 behavioral tests, TypeScript `--noEmit`, and Vite production bundle).
