# Cymbal Aerospace Marketing Studio — Architectural & Ecosystem Research (`research.md`)

> **Smart-Zone Context Cache**: This document synthesizes architectural patterns, prompt engineering frameworks, FFmpeg audio/video assembly techniques, and live Vertex AI (`vertex-ai-demos-468803`) endpoint constraints discovered across:
> 1. **Cloned Google GenMedia Reference Repositories** (`/Users/rahulsankrut/oss-genmedia-refs/{genmedia-creative-studio,dreamboard,storycraft,vigenair}`)
> 2. **Internal Ad & Marketing Skills** (`/Users/rahulsankrut/Desktop/Ad Marketing Skills/*` & built-in Gemini API skills)
> 3. **Current Codebase & Live Vertex AI Empirical Verification** (`/Users/rahulsankrut/Desktop/Cybmal Aerospace Marketing`)

---

## 1. Current Studio Architecture (5 Deep Modules)

Our application implements a 6-stage Guided Marketing & Video Studio Pipeline + Non-Linear Scene Canvas using Ousterhout's Deep Module pattern:

| Deep Module | Implementation Path | Core Responsibility |
| :--- | :--- | :--- |
| **`CampaignVault`** | [`src/server/vault/campaignVault.ts`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/src/server/vault/campaignVault.ts) | Durable JSON/disk state (`.data/vault.json`) and content-addressed binary media storage (`.data/media/`). Preserves non-destructive take history (`takes[]`) with `previousInteractionId` lineage and automatically cascades `stale: true` flags downstream (`prompt -> keyframe -> video -> master`, `voiceover -> master`) when an upstream asset changes. |
| **`GeminiStudioGateway`** | [`src/server/gemini/geminiStudioGateway.ts`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/src/server/gemini/geminiStudioGateway.ts) | Single boundary over `@google/genai` (`^2.31.0`) and Vertex AI (`vertex-ai-demos-468803`). Routes each modality to its verified global or regional endpoint, enforces JSON Schemas, folds negative prompts, chains `previous_interaction_id`, and wraps raw 24kHz L16 PCM TTS audio in a 44-byte RIFF/WAVE header. |
| **`StudioPipelineOrchestrator`** | [`src/server/orchestrator/studioPipelineOrchestrator.ts`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/src/server/orchestrator/studioPipelineOrchestrator.ts) | Caller-optimized 6-stage facade (`runStoryboardStage`, `generateAnchorImage`, `runSceneStageJob`, `runBatchStageJob`, `designVoicePersonaStage`, `generateCampaignMusicScore`, `runBrandEvaluationStage`, `applyBrandFindingAutoFix`, `runMasterAssemblyStage`) with `pLimit` concurrency and real-time SSE telemetry (`job.started`, `job.completed`, `job.failed`). |
| **`MasterTimelineAssembler`** | [`src/server/assembler/masterTimelineAssembler.ts`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/src/server/assembler/masterTimelineAssembler.ts) | Probes actual scene `.mp4` and `.wav` durations, flags voiceover overflow warnings vs. silence padding, and executes FFmpeg master `.mp4` concatenation with `-12dB` (`volume=0.251`) music ducking during active narration windows. |
| **`StudioWorkspaceUI`** | [`src/client/App.tsx`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/src/client/App.tsx) | 6-stage Aerospace Mission Control React 19 + Tailwind CSS v4 interface with live SSE status bar, take-history drawer, `Out of Sync` stale badges, 1-click Brand Eval Auto-Fix, and Final Cut Theater. |

---

## 2. Live Vertex AI (`vertex-ai-demos-468803`) Empirical Endpoint Matrix

Live probing against Google Cloud project `vertex-ai-demos-468803` via Application Default Credentials (`GOOGLE_GENAI_USE_VERTEXAI=1`) established the exact model IDs, regional routing, and payload formats required in production:

| Studio Stage | Modality | Model ID | Vertex AI Location | SDK Call Pattern & Payload Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Stage 2 & Stage 6** | Storyboard Synthesis & Multimodal Brand Evaluation | `gemini-3.8-flash` | `global` | `client.interactions.create({ model: 'gemini-3.8-flash', input: [...], response_format: JSON_SCHEMA })`. Supports interleaved `[image, video, audio, text]` parts in `input` and enforces strict JSON Schema output. |
| **Stage 1 & Stage 3** | Reference Anchors & Scene Keyframes | `gemini-nano-banana-2.1` *(API alias: `gemini-3.1-flash-image-preview` / `gemini-3-pro-image-preview`)* | `global` | On Vertex AI, `interactions.create` only registers text/omni models; image generation uses `client.models.generateContent({ model: 'gemini-3.1-flash-image-preview', contents, config: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio } } })`. Returns ~2.26 MB `inlineData` (`image/png`). Negative prompts must be folded into text (`"Avoid the following in the image: ..."`). |
| **Stage 4** | Motion Video Synthesis (`i2v`, `ref2v`, `edit`, `extend`) | `gemini-omni-1.1-flash` *(Vertex ID: `gemini-omni-1.1-flash-preview`)* | `global` | `client.interactions.create({ model: 'gemini-omni-1.1-flash-preview', input: [...mediaBeforeText, { type: 'text', text }], previous_interaction_id, response_format: { type: 'video' } })`. Returns ~2.9 MB `output_video.data` (`video/mp4`) and `interaction.id` for multi-turn conversational video edits. |
| **Stage 5A** | Narrator Voice Design & Per-Scene TTS | `gemini-3.8-flash-tts` *(Vertex ID: `gemini-2.5-flash-tts` / `gemini-2.5-pro-tts`)* | `global` | `client.models.generateContent({ model: 'gemini-2.5-flash-tts', contents, config: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } } })`. Returns raw 24kHz 16-bit mono PCM (`audio/L16;codec=pcm;rate=24000`), which **must** be wrapped with a 44-byte RIFF/WAVE header (`wrapRawPcm16MonoInWav`) for browser `<audio>` and FFmpeg compatibility. |
| **Stage 5B** | Instrumental Music Scoring | `lyria-3.5` *(Vertex ID: `lyria-002`)* | `us-central1` | Regional Vertex AI `:predict` endpoint (`publishers/google/models/lyria-002:predict` on `us-central1`). Returns ~6.3 MB 48kHz stereo WAV in `predictions[0].bytesBase64Encoded`. **Constraint**: Prompts that resemble copyrighted/recited lyrics trigger HTTP 400 recitation blocks; prompts must describe original acoustic/electronic instrumentation, tempo, and mood. |

---

## 3. Cloned Google GenMedia Reference Repositories (`/Users/rahulsankrut/oss-genmedia-refs/`)

### 3.1 `genmedia-creative-studio` (`GoogleCloudPlatform/genmedia-creative-studio`)
* **Path**: [`/Users/rahulsankrut/oss-genmedia-refs/genmedia-creative-studio`](file:///Users/rahulsankrut/oss-genmedia-refs/genmedia-creative-studio/README.md)
* **Key Modules Inspected**:
  * [`models/guideline_analysis.py`](file:///Users/rahulsankrut/oss-genmedia-refs/genmedia-creative-studio/models/guideline_analysis.py) & [`experiments/brand_consistency/README.md`](file:///Users/rahulsankrut/oss-genmedia-refs/genmedia-creative-studio/experiments/brand_consistency/README.md)
  * [`models/character_consistency.py`](file:///Users/rahulsankrut/oss-genmedia-refs/genmedia-creative-studio/models/character_consistency.py)
  * [`models/omni.py`](file:///Users/rahulsankrut/oss-genmedia-refs/genmedia-creative-studio/models/omni.py)
  * [`models/image_models.py`](file:///Users/rahulsankrut/oss-genmedia-refs/genmedia-creative-studio/models/image_models.py), [`models/gemini_tts.py`](file:///Users/rahulsankrut/oss-genmedia-refs/genmedia-creative-studio/models/gemini_tts.py), [`models/lyria.py`](file:///Users/rahulsankrut/oss-genmedia-refs/genmedia-creative-studio/models/lyria.py)
* **Architectural & Prompting Insights**:
  1. **Brand Alignment Scorecard (BAS), Davidsonian Scene Graph (DSG) & General Quality/Mistakes (GQM)**:
     * Rather than asking an LLM for an subjective 0–100 score directly, `guideline_analysis.py` decomposes both the source prompt and the Brand Kit PDF/guidelines into **atomic binary Yes/No questions** (`criterion_id`, `question`, `justification`, `expected_answer: "yes"`), categorized into:
       * **DSG (Davidsonian Scene Graph)**: Entity presence, attributes, spatial relationships, and actions requested in the prompt.
       * **GQM (General Quality & Mistakes)**: Structural artifacts, physics/anatomy errors, or text-rendering glitches.
       * **BAS (Brand Alignment Scorecard)**: Color palette fidelity, tone/style adherence, logo placement, and regulatory prohibitions.
     * It then runs a closed-loop **"Generate → Analyze → Refine"** workflow (analogous to our Stage 6 Brand Evaluation + 1-Click Auto-Fix loop).
  2. **Gemini Omni (`gemini-omni-1.1-flash-preview`) Production Patterns (`models/omni.py`)**:
     * Initializes `genai.Client(vertexai=True, project=PROJECT_ID, location="global", http_options=types.HttpOptions(timeout=600_000))`.
     * Supports 4 explicit modes: `t2v` (text-to-video), `i2v` (first-frame/last-frame interpolation), `ref2v` (up to 7 reference subject/style images), and `edit` (multi-turn `previous_interaction_id` refinement).
     * **Pre-Flight Media Validation**: Runs `find_missing_required_media()` before opening any billable interaction call so missing keyframes or reference assets fail fast locally.
     * **Prompt Decoration (`_modify_prompt_for_omni`)**: Appends non-default aspect ratio (`"The video's aspect ratio is 9:16."`) and explicit duration (`"The video's duration is 8 seconds."`) directly to the text prompt sent to `interactions.create`.
  3. **Character & Subject Consistency (`models/character_consistency.py`)**:
     * Uses Gemini (`temperature=0.1`) to extract a forensic composite description of a reference subject/aircraft/character before generating scene keyframes.
     * Folds negative prompts directly into the Nano Banana prompt via `_fold_negative_prompt`:
       ```text
       <scene prompt>

       Avoid the following in the image: <negative_prompt>
       ```
     * Generates candidate frames and uses a low-temperature (`temperature=0.2`) multimodal judge to select the candidate with highest subject fidelity before sending it to video synthesis.

### 3.2 `dreamboard` (`google-marketing-solutions/dreamboard`)
* **Path**: [`/Users/rahulsankrut/oss-genmedia-refs/dreamboard`](file:///Users/rahulsankrut/oss-genmedia-refs/dreamboard/README.md)
* **Key Modules Inspected**:
  * [`backend/app/prompts/text_prompts_library.py`](file:///Users/rahulsankrut/oss-genmedia-refs/dreamboard/backend/app/prompts/text_prompts_library.py)
  * [`backend/app/prompts/image_prompts_library.py`](file:///Users/rahulsankrut/oss-genmedia-refs/dreamboard/backend/app/prompts/image_prompts_library.py)
* **Architectural & Prompting Insights**:
  1. **YouTube ABCD Framework Built Into Storyboard Generation**:
     * Every generated story and scene breakdown in `text_prompts_library.py` explicitly enforces Google's **YouTube ABCD Framework**:
       * **A — Attention**: Hook the viewer immediately in Scene 1 with high-contrast visual motion and pacing.
       * **B — Branding**: Integrate brand identity, signature color tokens, and product presence naturally and early.
       * **C — Connection**: Ground technical features in human emotion and relatable mission outcomes.
       * **D — Direction**: Close the final scene with an unmistakable, low-friction Call to Action (CTA).
  2. **Full Subject Description Repetition Across Scenes**:
     * Because each keyframe generation call is stateless across separate scenes (unless chained via `previous_interaction_id` or reference images), `dreamboard` mandates repeating the **full physical description** of recurring subjects/products in every scene's `imagePrompt` rather than using pronouns or shorthand ("the jet", "same spokesperson").
  3. **Strict Separation of Static Image Prompts vs. Kinetic Video Prompts**:
     * `imagePrompt` describes composition, lens focal length, lighting, and a frozen moment in time (never camera movement).
     * `videoPrompt` describes **only** camera trajectory (`dolly in`, `tracking shot`, `crane up`), subject kinematics, and atmospheric motion starting from the approved keyframe.

### 3.3 `storycraft` (`storycraft`)
* **Path**: [`/Users/rahulsankrut/oss-genmedia-refs/storycraft`](file:///Users/rahulsankrut/oss-genmedia-refs/storycraft/README.md)
* **Key Modules Inspected**:
  * [`lib/ai-config.ts`](file:///Users/rahulsankrut/oss-genmedia-refs/storycraft/lib/ai-config.ts)
  * [`lib/api/gemini.ts`](file:///Users/rahulsankrut/oss-genmedia-refs/storycraft/lib/api/gemini.ts)
  * [`lib/utils/ffmpeg.ts`](file:///Users/rahulsankrut/oss-genmedia-refs/storycraft/lib/utils/ffmpeg.ts)
* **Architectural & Engineering Insights**:
  1. **Dynamic Frame-Evaluated Audio Ducking in FFmpeg (`lib/utils/ffmpeg.ts`)**:
     * Probes each scene's voiceover duration via `ffprobe` (cached in an LRU `Map` keyed by file path + mtime).
     * Positions scene voiceovers along the master timeline using `adelay=<ms>|<ms>` per scene and mixes them via `amix`.
     * Applies dynamic music ducking during active narration windows using FFmpeg's frame-evaluated volume expression:
       ```text
       [music]volume=eval=frame:volume='if(between(t,s1,e1)+between(t,s2,e2), 0.251, 1.0)'[ducked_music]
       ```
     * Applies a smooth `afade=t=out:st=<end-2>:d=2` fade-out at the end of the master timeline.
  2. **Centralized Model Registry (`lib/ai-config.ts`)**:
     * Keeps all model IDs, fallback chains, and capability flags in a single typed configuration module so model upgrades never require hunting through route handlers or UI components.

### 3.4 `vigenair` (`google-marketing-solutions/vigenair`)
* **Path**: [`/Users/rahulsankrut/oss-genmedia-refs/vigenair`](file:///Users/rahulsankrut/oss-genmedia-refs/vigenair/README.md)
* **Key Modules Inspected**:
  * [`service/extractor/extractor.py`](file:///Users/rahulsankrut/oss-genmedia-refs/vigenair/service/extractor/extractor.py)
  * [`service/combiner/combiner.py`](file:///Users/rahulsankrut/oss-genmedia-refs/vigenair/service/combiner/combiner.py)
* **Architectural & Engineering Insights**:
  1. **Coherent A/V Segment Boundaries**:
     * Ensures video cuts and scene transitions never clip active voiceover sentences mid-word by aligning visual shot boundaries with voiceover timestamps (directly matching our `MasterTimelineAssembler` duration probe and `voiceoverOverflowWarning` / `silencePaddingSec` checks).
  2. **Multi-Aspect-Ratio Smart Framing & Blanking Fill**:
     * Supports adapting a single `16:9` master campaign into `9:16` (Vertical Social) and `1:1` (Square Feed) via either dynamic subject-tracking crop or **Blanking Fill** (blurred/styled background canvas behind the crisp foreground frame).
  3. **C2PA Content Credentials Signing**:
     * Signs exported master `.mp4` assets with **C2PA (`c2pa-python` / ECDSA P-256)** cryptographic manifests declaring AI generation provenance (`trainedAlgorithmicMedia`) for enterprise ad-network compliance.

---

## 4. Internal Ad & Marketing Skills (`/Users/rahulsankrut/Desktop/Ad Marketing Skills/`)

Inspection of the 6 specialized marketing skills on disk yielded domain-specific frameworks directly applicable to Cymbal Aerospace campaigns:

1. **`ai-video-generation` ([`SKILL.md`](file:///Users/rahulsankrut/Desktop/Ad%20Marketing%20Skills/ai-video-generation/SKILL.md))**:
   * **4-Phase Direct-Response Video Retention Arc**:
     * **Phase 1 — Pattern Interrupt Hook (`0:00–0:03`)**: High-velocity visual disruption + bold opening telemetry or question in the first 3 seconds.
     * **Phase 2 — Problem Agitation (`0:03–0:10`)**: Highlight legacy aerospace/operational bottlenecks (thermal drag, fuel burn, turnaround delays).
     * **Phase 3 — Unique Mechanism & Technical Proof (`0:10–0:22`)**: Showcase the proprietary Cymbal Aerospace innovation (adaptive morphing winglet, Mach 2.2 laminar flow, 42% lower acoustic footprint).
     * **Phase 4 — De-Risked CTA (`0:22–0:30`)**: Clear executive call-to-action (e.g., *"Schedule Your Farnborough Flight Deck Briefing"*).
   * **Cinematic Camera & Optical Vocabulary**: Recommends explicit lens + movement pairing (`35mm anamorphic pan`, `85mm f/1.4 shallow DOF close-up`, `low-angle tracking dolly`, `volumetric golden-hour rim light`).
2. **`ad-compliance-audit` ([`SKILL.md`](file:///Users/rahulsankrut/Desktop/Ad%20Marketing%20Skills/ad-compliance-audit/SKILL.md))**:
   * **3-Tier Compliance Risk Matrix**:
     * `critical` (**Red / Block**): Unsubstantiated superlative claims (*"100% zero emissions"*, *"FAA guaranteed"*), military/weaponized imagery, or ITAR/export-controlled schematics.
     * `warning` (**Yellow / Auto-Fixable**): Palette drift from `#0A2540` / `#00A3E0` / `#FF6B00`, missing quantitative claim substantiation, or pacing/voiceover overflow.
     * `info` (**Green / Polish**): Minor typographic or cadence optimizations.
3. **`ad-campaign-orchestrator`, `ad-campaign-strategy`, `ad-copy-multi-channel`, `ad-creative-studio`**:
   * Emphasize **Message Match** across the entire funnel (Brief -> Storyboard -> Visual Keyframes -> Voiceover Script -> Final CTA) so the visual hook in Scene 1 directly pays off the headline claim in the Brief.

---

## 5. High-Leverage Opportunities for Future Iterations

If we start **Iteration #2** in the `[AI Workflow Tracker](sidecar://ai-coding-workflow/workflow-tracker/)`, the highest-value enhancements from this research are:

1. **DSG + BAS + YouTube ABCD Rubric in Stage 6 (`GeminiStudioGateway.evaluateCampaignBrand`)**:
   * Augment Stage 6 Multimodal Brand Evaluation with `genmedia-creative-studio`'s binary Yes/No **Davidsonian Scene Graph (DSG)** + **Brand Alignment Scorecard (BAS)** breakdown and `dreamboard`/`vigenair`'s **YouTube ABCD** sub-scores (`Attention`, `Branding`, `Connection`, `Direction`).
2. **Verbatim Subject Anchor Injection in Stage 2 (`GeminiStudioGateway.generateStoryboard`)**:
   * Adopt `dreamboard`'s rule of extracting a forensic composite description of the primary aircraft/subject and automatically injecting it into every scene's `imagePrompt` alongside the folded negative prompt (`_fold_negative_prompt`).
3. **Multi-Aspect-Ratio Blanking Fill & Smart Re-Framing in Stage 6 (`MasterTimelineAssembler`)**:
   * Add a 1-click **"Export Multi-Channel Social Pack (`16:9` + `9:16` + `1:1`)"** button in Stage 6 using `vigenair`'s FFmpeg Blanking Fill filtergraph (`split[original][copy];[copy]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:10[bg];[bg][original]overlay=(W-w)/2:(H-h)/2`).
4. **C2PA Provenance Manifest Signing**:
   * Attach a C2PA content credentials manifest to exported master `.mp4` files recording the exact Vertex AI model lineage (`gemini-3.8-flash`, `gemini-nano-banana-2.1`, `gemini-omni-1.1-flash-preview`, `gemini-2.5-flash-tts`, `lyria-002`) and `interactionId` chain.
