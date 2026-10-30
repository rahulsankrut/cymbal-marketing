# Cymbal Aerospace Marketing Studio — Architectural & UX Research (`research.md`)

> **Smart-Zone Context Cache**: This document caches key architectural facts, live Vertex AI (`vertex-ai-demos-468803`) endpoint constraints, reference repository patterns (`/Users/rahulsankrut/oss-genmedia-refs/*`), and **Iteration #2 UI/UX Simplification Research** so future sessions stay inside the `<100K`-token Smart Zone.

---

## 1. Iteration #2 Focus: UI & UX Simplification (`client-brief.md`)

> **Iteration #2 Brief ([`client-brief.md`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/client-brief.md))**:
> *"Lets focus on User interface and experience, the UI has lot of information and users will be overwhelmed. We need to make it simple"*

### 1.1 Cognitive Load Audit of Current [`src/client/App.tsx`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/src/client/App.tsx)
An audit of [`src/client/App.tsx`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/src/client/App.tsx) (`1,098` lines) against the `design-critique`, `google-material-3-web-prototype`, and `workspace-design-system-web-prototype` skills and Google's [`storycraft`](file:///Users/rahulsankrut/oss-genmedia-refs/storycraft/app/page.tsx) reference app identified **5 primary sources of visual overwhelm**:

| # | Overwhelm Bottleneck in Current `App.tsx` | Why It Overwhelms Users | Reference Pattern (`storycraft` / Material 3 Progressive Disclosure) |
| :--- | :--- | :--- | :--- |
| **1** | **6 Heavy Multi-Line Stage Cards in Top Header** | Each of the 6 tabs renders a 3-line card with stage numbers, subtitles, and raw model ID badges (`gemini-3.8-flash`, `gemini-nano-banana-2.1`, `gemini-omni-1.1-flash`, `3.8-flash-tts + lyria-3.5`), consuming ~25% of vertical viewport height. | **Compact Pill Stepper (`storycraft/top-nav.tsx`)**: Single-line pill navigation (`1. Brief` → `2. Storyboard & Visuals` → `3. Audio & Score` → `4. Final Cut & Review`, or a clean 1-line 6-step pill bar) with model badges hidden or shown only in a subtle tooltip/drawer. |
| **2** | **Fragmented Scene Editing Across Stages 2, 3, 4 & 5** | Users have to jump across 4 separate full-page grids (Stage 2 Prompts, Stage 3 Keyframes, Stage 4 Motion Video, Stage 5 Voiceover) to work on the same 3 scenes, re-reading the same scene cards 4 times. | **Unified Visual Scene Card + On-Demand Scene Drawer (`storycraft/scene-card.tsx` & `edit-scene-modal.tsx`)**: Show clean 16:9 visual cards with a simple `Image / Video` preview toggle, spoken narration subtitle, and hover/quick actions; move multi-textarea prompt editing, conversational turn edits (`previous_interaction_id`), and Take History dropdowns into a slide-over **Scene Inspector Drawer / Modal** on click. |
| **3** | **Wall of Open Textareas on Every Scene Card** | Stage 2 renders 3 multi-line `<textarea>` boxes (*Visual Prompt*, *Camera Motion*, *Voiceover Script*) + 1 title `<input>` inside every scene card simultaneously (12 open form inputs on screen for 3 scenes) plus a 5-input "Add Scene" bar at the bottom. | **Read-First Storyboard Cards**: Display the scene title, duration badge, 2-line visual summary, and spoken narration line cleanly; open the full prompt textareas only when the user clicks **"Edit Scene"** or **"Magic Edit"**. |
| **4** | **Always-Expanded Brand Kit & Reference Anchor Rules in Stage 1** | Stage 1 dumps 3 template cards, 4 brief inputs, 5 hex color cards, and 8 full-sentence visual/regulatory rules on screen simultaneously. | **Clean Brief Workspace + Collapsible Brand Guardrails Pill**: Focus Stage 1 on the **Creative Pitch & 1-Click Starter Presets**, with a compact **Brand Kit Summary Bar** (color dots + tagline) that expands into full rules & custom brand kit creation only on click. |
| **5** | **Raw Engineering Telemetry Exposed in Main Views** | Scene cards display raw interaction IDs (`ID: take-xxx`), Stage 6 displays raw FFmpeg filtergraphs (`[1:a]adelay=0|0...`), and the footer streams raw model IDs. | **Developer / Telemetry Progressive Disclosure**: Keep the main canvas focused on creative outcomes (Video Player, Compliance Score Ring, 1-Click Auto-Fix) and tuck FFmpeg filtergraphs, interaction IDs, and SSE logs behind an expandable **"Studio Telemetry & Technical Details"** toggle. |

---

## 2. Current Studio Architecture (5 Deep Modules)

Our backend and state architecture remains anchored in 5 Deep Modules, which already expose clean REST + SSE contracts (`src/server/index.ts`) and require **zero breaking backend changes** to support a dramatically simpler UI:

| Deep Module | Implementation Path | Core Responsibility |
| :--- | :--- | :--- |
| **`CampaignVault`** | [`src/server/vault/campaignVault.ts`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/src/server/vault/campaignVault.ts) | Durable JSON/disk state (`.data/vault.json`) and content-addressed binary media storage (`.data/media/`). Preserves non-destructive take history (`takes[]`) with `previousInteractionId` lineage and automatically cascades `stale: true` flags downstream (`prompt -> keyframe -> video -> master`, `voiceover -> master`) when an upstream asset changes. |
| **`GeminiStudioGateway`** | [`src/server/gemini/geminiStudioGateway.ts`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/src/server/gemini/geminiStudioGateway.ts) | Single boundary over `@google/genai` (`^2.31.0`) and Vertex AI (`vertex-ai-demos-468803`). Routes each modality to its verified global or regional endpoint, enforces JSON Schemas, folds negative prompts, chains `previous_interaction_id`, and wraps raw 24kHz L16 PCM TTS audio in a 44-byte RIFF/WAVE header. |
| **`StudioPipelineOrchestrator`** | [`src/server/orchestrator/studioPipelineOrchestrator.ts`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/src/server/orchestrator/studioPipelineOrchestrator.ts) | Caller-optimized 6-stage facade (`runStoryboardStage`, `generateAnchorImage`, `runSceneStageJob`, `runBatchStageJob`, `designVoicePersonaStage`, `generateCampaignMusicScore`, `runBrandEvaluationStage`, `applyBrandFindingAutoFix`, `runMasterAssemblyStage`) with `pLimit` concurrency and real-time SSE telemetry (`job.started`, `job.completed`, `job.failed`). |
| **`MasterTimelineAssembler`** | [`src/server/assembler/masterTimelineAssembler.ts`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/src/server/assembler/masterTimelineAssembler.ts) | Probes actual scene `.mp4` and `.wav` durations, flags voiceover overflow warnings vs. silence padding, and executes FFmpeg master `.mp4` concatenation with `-12dB` (`volume=0.251`) music ducking during active narration windows. |
| **`StudioWorkspaceUI`** | [`src/client/App.tsx`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/src/client/App.tsx) | React 19 + Tailwind CSS v4 studio frontend. **Primary target of Iteration #2 simplification** (decomposing the monolithic `App.tsx` into calm, progressive-disclosure views and an on-demand Scene Inspector drawer/modal). |

---

## 3. Verified Google Cloud & Vertex AI Credentials (`p1-credentials`)

* **Authentication Mode**: Google Cloud Application Default Credentials (`gcloud auth application-default login`) verified active against project `vertex-ai-demos-468803`.
* **Workspace `.env` Configuration** ([`.env`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/.env)):
  * `GOOGLE_GENAI_USE_VERTEXAI=1`
  * `GOOGLE_CLOUD_PROJECT=vertex-ai-demos-468803`
  * `GOOGLE_CLOUD_LOCATION=global`
  * `VERTEX_LYRIA_LOCATION=us-central1`
* **Live Model Routing Matrix**:
  * **Stage 2 Storyboarding & Stage 6 Multimodal Brand Eval**: `gemini-3.8-flash` (`location: "global"`, `client.interactions.create` with JSON Schema).
  * **Stage 1/3 Reference Anchors & Scene Keyframes**: `gemini-nano-banana-2.1` / `gemini-3.1-flash-image-preview` (`location: "global"`, `client.models.generateContent` with `responseModalities: ["IMAGE"]`).
  * **Stage 4 Motion Video Synthesis & Stateful Edits**: `gemini-omni-1.1-flash-preview` (`location: "global"`, `client.interactions.create` with `response_format: { type: "video" }` and `previous_interaction_id`).
  * **Stage 5A Narrator Voice Design & Per-Scene TTS**: `gemini-2.5-flash-tts` (`location: "global"`, `client.models.generateContent` with `responseModalities: ["AUDIO"]` + 44-byte RIFF/WAVE header wrapper).
  * **Stage 5B Instrumental Music Scoring**: `lyria-002` (`location: "us-central1"`, regional Vertex AI `:predict`).

---

## 4. Cloned Reference Repositories & Skills Summary

1. **`storycraft` ([`/Users/rahulsankrut/oss-genmedia-refs/storycraft`](file:///Users/rahulsankrut/oss-genmedia-refs/storycraft/README.md))**:
   * **Slim Pill TopNav** ([`top-nav.tsx`](file:///Users/rahulsankrut/oss-genmedia-refs/storycraft/app/features/shared/components/layout/top-nav.tsx)): Centered rounded-full step pill with completion checkmarks and zero clutter.
   * **Visual-First Scene Card** ([`scene-card.tsx`](file:///Users/rahulsankrut/oss-genmedia-refs/storycraft/app/features/storyboard/components/scene-card.tsx)): 16:9 media frame + hover quick-action buttons (`Regenerate`, `Magic Edit`, `Generate Video`, `Expand`) + `Scene N` pill + 3-line description + on-demand `EditSceneModal` and `ConversationalEditModal`.
2. **`genmedia-creative-studio` ([`/Users/rahulsankrut/oss-genmedia-refs/genmedia-creative-studio`](file:///Users/rahulsankrut/oss-genmedia-refs/genmedia-creative-studio/README.md))**:
   * Closed-loop *"Generate → Analyze → Refine"* Brand Alignment Scorecard (`models/guideline_analysis.py`) and Gemini Omni adapter (`models/omni.py`).
3. **`dreamboard` ([`/Users/rahulsankrut/oss-genmedia-refs/dreamboard`](file:///Users/rahulsankrut/oss-genmedia-refs/dreamboard/README.md)) & `vigenair` ([`/Users/rahulsankrut/oss-genmedia-refs/vigenair`](file:///Users/rahulsankrut/oss-genmedia-refs/vigenair/README.md))**:
   * YouTube ABCD storyboard structure, verbatim subject consistency, and coherent A/V segment alignment.
