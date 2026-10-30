## Problem Statement

Aerospace marketing teams and creative directors at Cymbal Aerospace face a fragmented, slow, and error-prone production workflow when turning campaign briefs into broadcast-quality video spots. Today, teams must manually juggle separate tools for scriptwriting, storyboard sketching, keyframe image generation, motion video synthesis, voiceover recording, background music scoring, and brand/regulatory compliance reviews.

This fragmentation creates four critical pain points:
1. **Visual Discontinuity Across Scenes**: Generating individual scenes without shared visual anchors causes aircraft liveries, avionics hardware, and crew appearances to drift dramatically from shot to shot.
2. **Destructive Iteration & Lost Context**: Tweaking a single visual detail, camera movement, or vocal inflection usually requires re-rolling from scratch rather than conversationally editing the existing asset while preserving take history.
3. **Disconnected Audio-Visual Pacing**: Voiceover narration and musical scores are created blind to the visual storyboard and scene timing, leading to awkward cuts, mismatched moods, and manual audio ducking.
4. **Late-Stage Brand & Technical Compliance Failures**: Aerospace campaigns have strict visual identity rules, engineering realism standards, and regulatory claim guardrails. Discovering violations only after final video assembly forces expensive, manual re-renders.

## Solution

The **Cymbal Aerospace Marketing Studio** is a unified, full-stack creative production studio powered by the Google Gemini Interactions API (`@google/genai` >= 2.29.1). It combines a **Guided 6-Stage Studio Pipeline** with a **Non-Linear Scene Canvas**, enabling marketers and creative directors to move seamlessly from an initial campaign brief to a brand-verified, fully scored `.mp4` master cut:

1. **Stage 1 — Creative Brief & Brand Kit**: Comes pre-seeded with the official **Cymbal Aerospace Brand Kit** (color palette, typography/visual identity rules, aerospace technical realism standards, regulatory claim guardrails, and signature narrator Voice Design persona) plus **3 one-click starter campaign templates**, while supporting custom Brand Kits and Reusable Visual Reference Anchors.
2. **Stage 2 — AI Storyboard & Script (`gemini-3.8-flash`)**: Transforms the campaign brief and Brand Kit into a structured multi-scene storyboard containing scene descriptions, visual generation prompts, camera motion directives, narration scripts with vocal style cues, target durations, and linked reference anchors.
3. **Stage 3 — Keyframe & Reference Studio (`gemini-nano-banana-2.1`)**: Generates and manages reusable Brand/Subject Reference Anchors (e.g., Cymbal flagship aircraft, cockpit avionics, flight crew) and fuses up to 14 reference images into per-scene start (and optional end) keyframes. Supports stateful multi-turn conversational image editing via `previous_interaction_id` and preserves every take in a per-scene version history.
4. **Stage 4 — Motion Video Synthesis (`gemini-omni-1.1-flash`)**: Synthesizes high-consistency cinematic motion clips locked to each scene's approved start (and optional end) keyframes, supporting stateful `previous_interaction_id` conversational video editing and tail-end video extensions.
5. **Stage 5 — Voiceover & Music Scoring (`gemini-3.8-flash-tts` + `lyria-3.5` / `lyria-3-clip-preview`)**: Generates per-scene expressive narration using preset voices or custom **Voice Design** brand personas (`speech_metadata` annotations), and composes a unified campaign soundtrack via `lyria-3.5` / `lyria-3-clip-preview` conditioned directly on the storyboard keyframe images and musical mood prompt.
6. **Stage 6 — Automated Multimodal Brand Evaluation & Final Cut (`gemini-3.8-flash` + FFmpeg)**: Inspects the actual generated keyframes, motion videos, and voiceover/script against the active Brand Kit to produce a structured **0–100 Brand Compliance Scorecard** with **One-Click Scene Auto-Fix** actions, and stitches the multi-scene video, aligned voiceovers, and `-12dB` auto-ducked musical score into a downloadable `.mp4` master cut.

## User Stories

1. As a Creative Director, I want the studio to load with a pre-seeded Cymbal Aerospace Brand Kit and three one-click starter campaign templates (e.g., *Next-Gen Supersonic Avionics Launch*, *Zero-Emission Hydrogen Propulsion Spotlight*, *Orbital Telemetry Constellation*), so that I can immediately launch a realistic aerospace campaign without manual setup.
2. As a Brand Manager, I want to view, edit, or create custom Brand Kits defining visual identity rules, color palettes, aerospace engineering realism rules, regulatory claim prohibitions, and default Voice Design narrator descriptions, so that every campaign enforces our exact corporate standards.
3. As a Creative Director, I want to define or generate reusable Visual Reference Anchors (such as a specific aircraft fuselage livery, cockpit HUD, or spokesperson) using `gemini-nano-banana-2.1` or image uploads, so that all scenes in my campaign share consistent visual subjects.
4. As a Copywriter, I want to generate a structured multi-scene storyboard from my campaign brief using `gemini-3.8-flash` Structured Outputs, so that each scene automatically receives a visual prompt, camera motion directive, voiceover script, vocal delivery style, target duration, and attached Reference Anchors.
5. As a Creative Director, I want to add, reorder, edit, or delete storyboard scenes and adjust their scripts or prompts at any time on the Non-Linear Scene Canvas, so that I have full editorial control over the narrative arc.
6. As a Creative Director, I want any upstream edit to a scene's script or visual prompt to non-destructively badge that scene's existing keyframe, motion video, or voiceover as `Stale / Out of Sync` without deleting prior takes, so that I know which downstream assets need refreshing while never losing previous work.
7. As an Art Director, I want to generate per-scene start (and optional end) keyframes with `gemini-nano-banana-2.1` that automatically fuse the scene's linked Reference Anchor images, so that Cymbal Aerospace aircraft, hardware, and styling remain consistent across every shot.
8. As an Art Director, I want to generate all scene keyframes in parallel as a batch job with live progress updates, so that I do not have to click and wait for each scene sequentially.
9. As an Art Director, I want to conversationally refine any scene's keyframe (e.g., "change lighting to golden hour at 40,000 feet and add subtle Mach cone vapor") using stateful `previous_interaction_id` turns with `gemini-nano-banana-2.1`, so that the model edits the existing image in context rather than generating an unrelated composition.
10. As an Art Director, I want every generated or edited keyframe, motion clip, voiceover, and music track saved as an immutable Take in that scene's version history, so that I can compare takes side-by-side and switch the active take at any time.
11. As a Video Director, I want `gemini-omni-1.1-flash` to synthesize each scene's motion video clip directly from its approved start keyframe (and optional end keyframe for transitions), so that motion begins from the exact brand-approved composition.
12. As a Video Director, I want to conversationally edit any generated scene video using stateful `previous_interaction_id` turns with `gemini-omni-1.1-flash` (e.g., "slow down the camera dolly and intensify the jet exhaust glow"), so that I can iteratively polish motion without losing scene structure.
13. As a Video Director, I want to extend a scene's video clip using `gemini-omni-1.1-flash` video extension when a scene needs more screen time to match its narration, so that the visual cut never ends abruptly mid-sentence.
14. As an Audio Producer, I want to design a custom Cymbal Aerospace narrator voice persona from a text description using `gemini-3.8-flash-tts` Voice Design (or choose a preset voice), preview the voice, and apply it across all scenes in the campaign.
15. As an Audio Producer, I want to synthesize per-scene voiceover audio via `gemini-3.8-flash-tts` using structured `speech_metadata` style annotations (such as authoritative, calm, or inspiring aerospace narration), so that each scene's narration is expressive and locked to that scene's start boundary.
16. As an Audio Producer, I want to generate a cohesive campaign background score using `lyria-3.5` or `lyria-3-clip-preview` conditioned on both my musical mood prompt and the storyboard keyframe images as multimodal inputs, so that the soundtrack dynamically reflects the visual tone of the spot.
17. As a Brand Compliance Officer, I want to run an Automated Multimodal Brand Evaluation using `gemini-3.8-flash` with Structured Outputs that inspects the actual generated keyframes, motion videos, and voiceover scripts against Cymbal Aerospace brand rules, so that visual drift, unrealistic flight physics, or prohibited claims are caught automatically.
18. As a Brand Compliance Officer, I want the Brand Evaluation to display a 0–100 overall score broken down into four sub-scores (Visual Brand Identity, Aerospace Technical Realism, Narrative & Audio Cohesion, Regulatory & Claim Compliance) alongside scene-pinpointed findings.
19. As a Creative Director, I want every flagged finding in the Brand Evaluation scorecard to include a **One-Click Auto-Fix** button that dispatches the evaluator's recommended remediation prompt directly to the target asset's stateful `previous_interaction_id` chain (`gemini-nano-banana-2.1`, `gemini-omni-1.1-flash`, or `gemini-3.8-flash-tts`), creating a new fixed take and clearing the flag.
20. As a Video Editor, I want the studio to assemble the final downloadable `.mp4` master cut via server-side FFmpeg, automatically aligning per-scene audio/video durations (padding trailing silence if voiceover is shorter than video, or flagging/extending when voiceover exceeds video) and applying `-12dB` audio ducking to the Lyria music bed whenever voiceover speech is active.
21. As a Studio User, I want a real-time Server-Sent Events (SSE) activity & telemetry bar showing active Gemini model calls, per-scene job progress, interaction IDs, and token/latency metrics, so that I always have visibility into long-running multimodal generations.

## Implementation Decisions

### 1. Deep Module Architecture & Interfaces

The system is structured around five deep modules, each encapsulating substantial domain complexity behind a minimal, stable contract:

- **Module 1: `CampaignVault` (Persistence, Take Lineage & Non-Destructive Stale Engine)**
  - **Responsibility**: Manages the relational/JSON state of Brand Kits, Campaigns, Reference Anchors, Storyboard Scenes, Take Histories, Brand Evaluation Reports, and local disk storage of binary media assets (`.png`, `.mp4`, `.wav`, `.mp3`). Enforces non-destructive upstream cascade rules so modifying a scene script or selecting a new keyframe take automatically marks dependent downstream assets (`motion`, `voiceover`, `masterCut`) as `stale: true` without deleting historical takes.
  - **Public Interface**:
    - `seedDefaultBrandKitAndTemplates(): Promise<void>`
    - `listBrandKits(): Promise<BrandKit[]>` / `upsertBrandKit(input: BrandKitInput): Promise<BrandKit>`
    - `listCampaigns(): Promise<CampaignSummary[]>` / `getCampaign(id: string): Promise<CampaignDetail>`
    - `createCampaign(input: CreateCampaignInput): Promise<CampaignDetail>`
    - `upsertReferenceAnchor(campaignId: string, anchor: ReferenceAnchorInput): Promise<ReferenceAnchor>`
    - `saveStoryboardScenes(campaignId: string, scenes: SceneDraft[]): Promise<Scene[]>`
    - `updateScene(campaignId: string, sceneId: string, patch: ScenePatch): Promise<{ scene: Scene; cascadedStaleModalities: Modality[] }>`
    - `appendTake(params: AppendTakeInput): Promise<AssetTake>`
    - `setActiveTake(campaignId: string, sceneId: string, modality: Modality, takeId: string): Promise<Scene>`
    - `saveBrandEvaluation(campaignId: string, evaluation: BrandEvaluationReport): Promise<BrandEvaluationReport>`

- **Module 2: `GeminiStudioGateway` (Multimodal Interactions API Client)**
  - **Responsibility**: Wraps the official `@google/genai` (`>=2.29.1`) SDK using `client.interactions.create(...)` exclusively. Handles multimodal input assembly (inline base64 images, video, audio, text, and `speech_metadata` annotations), polymorphic `response_format` schemas, stateful multi-turn chaining via `previous_interaction_id`, Voice Design creation, and response extraction (`output_text`, `output_image`, `output_audio`, and video step extraction) plus token/latency telemetry capture.
  - **Model Routing Contract**:
    - Storyboard & Script Generation: `gemini-3.8-flash` with JSON Schema `response_format`
    - Reference Anchor & Keyframe Image Generation / Editing: `gemini-nano-banana-2.1` (with up to 14 reference images and stateful `previous_interaction_id` chaining)
    - Motion Video Synthesis, Editing & Extension: `gemini-omni-1.1-flash` (with start/end keyframe image inputs, video input for extensions, and stateful `previous_interaction_id` chaining)
    - Voice Design & Per-Scene Voiceover Synthesis: `gemini-3.8-flash-tts` (with `response_format: { type: "audio" }`, `speech_config`, and `speech_metadata` annotations)
    - Multimodal Campaign Music Scoring: `lyria-3.5` (full-length structured score) and `lyria-3-clip-preview` (30s spot score) conditioned on storyboard keyframe images + text prompt
    - Multimodal Brand Evaluation: `gemini-3.8-flash` inspecting generated scene images, video clips, and narration against Brand Kit rules with JSON Schema `response_format`
  - **Public Interface**:
    - `generateStoryboard(brief: CampaignBrief, brandKit: BrandKit, anchors: ReferenceAnchor[]): Promise<StoryboardGenerationResult>`
    - `generateOrEditImage(request: ImageInteractionRequest): Promise<MediaGenerationResult>`
    - `synthesizeOrEditVideo(request: VideoInteractionRequest): Promise<MediaGenerationResult>`
    - `designVoicePersona(request: VoiceDesignRequest): Promise<VoicePersonaResult>`
    - `synthesizeSceneVoiceover(request: VoiceoverInteractionRequest): Promise<MediaGenerationResult>`
    - `composeCampaignMusic(request: MusicInteractionRequest): Promise<MediaGenerationResult>`
    - `evaluateCampaignBrandCompliance(request: BrandEvalInteractionRequest): Promise<BrandEvaluationReport>`

- **Module 3: `StudioPipelineOrchestrator` (Concurrent Job Runner, SSE Telemetry & Auto-Fix Dispatcher)**
  - **Responsibility**: Orchestrates single-scene and parallel batch executions across scenes (e.g., "Generate All Keyframes", "Synthesize All Motion Clips", "Generate All Voiceovers"), coordinates stateful conversational edits (`previous_interaction_id`), executes **One-Click Brand Evaluation Auto-Fixes** by routing the evaluator's remediation instruction to the appropriate modality gateway and recording a new take, and broadcasts real-time job lifecycle events (`job.started`, `job.progress`, `job.completed`, `job.failed`) over Server-Sent Events (SSE).
  - **Public Interface**:
    - `runSceneStageJob(params: SceneStageJobInput): Promise<JobResult>`
    - `runBatchStageJob(params: BatchStageJobInput): Promise<BatchJobResult>`
    - `applyBrandFindingAutoFix(campaignId: string, findingId: string): Promise<AutoFixResult>`
    - `subscribeEvents(campaignId: string, listener: (event: StudioSSEEvent) => void): UnsubscribeFn`

- **Module 4: `MasterTimelineAssembler` (FFmpeg Synchronization, Pacing & Audio Ducking Engine)**
  - **Responsibility**: Probes actual media durations of each scene's active motion video clip (`.mp4`), active voiceover track (`.wav`), and campaign music score (`.mp3`/`.wav`). Computes a deterministic timeline plan:
    - Aligns each scene's voiceover start time to the exact start of that scene's video segment.
    - If a scene's voiceover is shorter than its video clip, pads trailing silence to match the video duration.
    - If a scene's voiceover exceeds its video clip duration, either extends/pads the visual tail frame or surfaces a timing warning with a one-click `gemini-omni-1.1-flash` video extension trigger.
    - Applies `-12dB` volume ducking to the background `lyria-3.5` music track during active voiceover segments and normalizes master output into a browser-streamable H.264/AAC `.mp4` file.
  - **Public Interface**:
    - `computeTimelinePlan(campaign: CampaignDetail): Promise<TimelineAssemblyPlan>`
    - `assembleMasterCut(campaign: CampaignDetail): Promise<MasterCutResult>`

- **Module 5: `StudioWorkspaceUI` (6-Stage Guided Pipeline & Non-Linear Scene Canvas SPA)**
  - **Responsibility**: React + Vite + Tailwind CSS studio interface providing:
    - Top 6-Stage Pipeline Navigation Bar with completion/stale indicators and SSE telemetry drawer.
    - Stage 1 Brief & Brand Kit Manager with 3 Cymbal Aerospace starter templates and Reference Anchor Studio.
    - Stage 2–5 Non-Linear Scene Grid where every scene card displays its Script, Start/End Keyframe, Motion Video player, Voiceover waveform/player, `Stale / Out of Sync` badges, Conversational Edit prompt bar (`previous_interaction_id`), and Take History selector.
    - Stage 6 Multimodal Brand Compliance Scorecard (0–100 radial gauge, 4 category progress bars, scene-linked findings with **One-Click Auto-Fix** buttons) and the synchronized Master Cut Theater Player + MP4 Export.

### 2. Data Schema & API Contracts

- **Stateful Interaction Lineage**: Every `AssetTake` record stores:
  - `id`, `campaignId`, `sceneId` (nullable for campaign-level music/master), `modality` (`anchor_image` | `keyframe_start` | `keyframe_end` | `motion_video` | `voiceover_audio` | `music_score` | `master_video`)
  - `modelId` (e.g., `gemini-nano-banana-2.1`, `gemini-omni-1.1-flash`, `gemini-3.8-flash-tts`, `lyria-3.5`)
  - `interactionId` (returned by `client.interactions.create`)
  - `parentInteractionId` (`previous_interaction_id` used when conversationally editing or extending a prior take)
  - `prompt`, `mediaUrl`, `mimeType`, `durationSeconds`, `tokenUsage`, `createdAt`
- **REST & SSE API Surface**:
  - `GET /api/bootstrap` — Returns pre-seeded Brand Kits, starter templates, and existing campaigns.
  - `POST /api/campaigns` / `GET /api/campaigns/:id` / `PATCH /api/campaigns/:id` — Campaign & brief lifecycle.
  - `POST /api/campaigns/:id/anchors` — Generate (`gemini-nano-banana-2.1`) or upload a Reference Anchor.
  - `POST /api/campaigns/:id/storyboard/generate` — Generate structured storyboard via `gemini-3.8-flash`.
  - `PATCH /api/campaigns/:id/scenes/:sceneId` — Update scene script/prompts and trigger non-destructive `stale` cascade.
  - `POST /api/campaigns/:id/scenes/:sceneId/generate` — Generate, conversationally edit (`previous_interaction_id`), or extend a scene's keyframe, motion video, or voiceover.
  - `POST /api/campaigns/:id/batch-generate` — Parallel generation across scenes for a given modality.
  - `POST /api/campaigns/:id/ActiveTake` — Switch the active take for any scene modality.
  - `POST /api/campaigns/:id/voice-design` — Create a custom narrator voice via `gemini-3.8-flash-tts`.
  - `POST /api/campaigns/:id/music/generate` — Generate keyframe-conditioned score via `lyria-3.5` / `lyria-3-clip-preview`.
  - `POST /api/campaigns/:id/brand-eval` — Run multimodal Brand Compliance Evaluation via `gemini-3.8-flash`.
  - `POST /api/campaigns/:id/brand-eval/findings/:findingId/autofix` — Execute One-Click Auto-Fix on a flagged scene asset.
  - `POST /api/campaigns/:id/assemble` — Run `MasterTimelineAssembler` to stitch video, voiceover, and `-12dB` ducked music into the final `.mp4`.
  - `GET /api/campaigns/:id/events` — SSE stream for real-time job progress and model telemetry.

## Testing Decisions

- **Philosophy — Test External Behavior Through Public Interfaces Only**:
  - Tests must verify observable inputs, outputs, state transitions, and side effects at the public boundaries of the deep modules—never internal private helpers or implementation details.
- **Modules Under Behavioral Test (Vitest)**:
  1. **`CampaignVault` Behavioral Tests**:
     - Verifies default Cymbal Aerospace Brand Kit and starter template seeding.
     - Verifies take lineage recording (`interactionId`, `parentInteractionId`), switching active takes, and preserving historical takes.
     - Verifies the **Non-Destructive Stale Cascade**: editing a scene's visual prompt or selecting a new keyframe take marks downstream `motion_video` and `master_video` as `stale: true` while leaving prior takes intact; editing a scene's voiceover script marks `voiceover_audio` and `master_video` as `stale: true` without marking `keyframe_start` stale.
  2. **`GeminiStudioGateway` Contract & Request Formatting Tests**:
     - Verifies that each modality builds the exact `@google/genai` Interactions API payload (`model`, `input` array ordering with reference images before text prompts, `previous_interaction_id` propagation for stateful edits, `response_format` JSON schemas for `gemini-3.8-flash`, `speech_metadata` annotations for `gemini-3.8-flash-tts`, and multimodal image + text inputs for `lyria-3.5`).
  3. **`StudioPipelineOrchestrator` & Auto-Fix Behavioral Tests**:
     - Verifies parallel batch execution across multiple scenes and SSE progress event emission (`job.started` -> `job.completed`).
     - Verifies that `applyBrandFindingAutoFix` looks up the active take's `interactionId` for the flagged scene/modality, invokes the gateway with `previous_interaction_id` and the remediation prompt, appends the new take as active, and marks the finding resolved.
  4. **`MasterTimelineAssembler` Synchronization & Ducking Tests**:
     - Verifies timeline calculation when scene voiceover duration is shorter than, equal to, or longer than scene video duration, and verifies that FFmpeg filtergraph generation applies `-12dB` volume ducking on the music bed during active speech intervals and produces a valid `.mp4` output file.
  5. **End-to-End API & UI Verification**:
     - Supertest API integration tests covering the full 6-stage campaign lifecycle and live browser verification of the React studio workspace.

## Out of Scope

Based on explicit negative decisions from the Grill Session:
- **Legacy/Deprecated Gemini SDKs & Models**: Never use `@google/generative-ai`, `google-generativeai`, `client.models.generateContent`, `gemini-2.5-*`, `gemini-2.0-*`, `gemini-1.5-*`, or shut-down `veo-3.1-*-preview` endpoints. All model calls must use `@google/genai` (`>=2.29.1`) `client.interactions.create`.
- **Traditional Multi-Track NLE Scrubbing Complexity**: We are not building a frame-level Premiere/CapCut keyframe curve editor or manual waveform razor-blade tool; editing happens through the 6-Stage Studio Pipeline, Non-Linear Scene Cards, and stateful conversational turns (`previous_interaction_id`).
- **Destructive Asset Overwrites**: Editing prompts or regenerating assets must never overwrite or delete prior generated takes on disk.
- **Uninvited External Connector Side-Effects**: No automatic publishing to external social media platforms, YouTube, or email/SharePoint connectors.
- **Multi-Tenant Cloud Auth / Billing Portals**: The studio runs as a self-contained local workspace application backed by local SQLite/JSON persistence and local media vault storage.

## Further Notes

- **Graceful Hardware & API Resilience**: Server-side FFmpeg assembly should use `ffmpeg-static` (or system `ffmpeg` fallback) so video stitching, silence padding, and `-12dB` audio ducking work reliably out of the box on macOS/Linux without manual OS package configuration.
- **Aesthetic Direction**: The UI should embody an executive **Cymbal Aerospace Mission Control & Creative Studio** aesthetic—deep obsidian/slate surfaces, precision telemetry badges, high-contrast Mach-blue and amber status accents, and clean side-by-side take comparison viewers.
