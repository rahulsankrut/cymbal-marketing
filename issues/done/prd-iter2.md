# Product Requirements Document (PRD) — Iteration #2: UI & UX Simplification

## Problem Statement

While Iteration #1 delivered a complete multimodal marketing and video generation pipeline backed by live Vertex AI models (`gemini-3.8-flash`, `gemini-nano-banana-2.1`, `gemini-omni-1.1-flash-preview`, `gemini-2.5-flash-tts`, and `lyria-002`) and FFmpeg master assembly, the initial user interface overwhelmed users with excessive cognitive load and visual clutter:

1. **Overcrowded 6-Card Header Navigation**: The top header rendered 6 multi-line stage cards with subtitles and raw model ID badges, consuming nearly a quarter of the viewport height.
2. **Fragmented Scene Workflow Across 4 Tabs**: Users had to jump between 4 separate full-page tabs (Storyboard, Keyframes, Motion Synthesis, Voiceover) to view and iterate on the same 3 scenes.
3. **Wall of Open Textareas on Every Scene Card**: The Storyboard view rendered 3 multi-line textareas and 1 title input inside every scene card simultaneously (12 open form inputs for 3 scenes), plus a 5-input inline "Add Scene" form at the bottom.
4. **Always-Expanded Brand Guardrails & Custom Kit Forms**: Step 1 displayed 5 hex color swatch cards, 8 compliance bullet points, and a custom brand kit form alongside the creative brief editor.
5. **Raw Engineering Telemetry Exposed in Main Views**: Scene cards displayed raw interaction IDs, Step 6 displayed raw FFmpeg filtergraphs (`ffmpegFilterComplex`) and dense Brand Evaluation scorecards, and the footer streamed raw model IDs.

## Solution

Transform the Cymbal Aerospace Studio frontend into **Option A: 4-Step Storycraft Pill Flow + On-Demand Scene Inspector Modal**, applying progressive disclosure so users experience a calm, visual-first creative studio:

1. **Compact 4-Step Pill Navigation Header**:
   - Replace the 6 multi-line stage cards with a sleek, single-line pill bar: **`1. Brief`** → **`2. Storyboard & Visuals`** → **`3. Voice & Soundtrack`** → **`4. Final Cut`**.
   - Remove raw model ID badges and raw `interactionId` strings from primary cards.
2. **Step 1 — Focused Campaign Brief (`1. Brief`)**:
   - Present **3 Simple, 1-Sentence Starter Presets** (`Paper Plane to Rocket Ship`, `CubeSat Orbital Weather Launch`, and `New York to London in 3 Hours`) and a focused **Creative Brief Card** (Campaign Title, Target Audience, Creative Pitch, Soundtrack Mood, and primary **"Generate Storyboard →"** CTA).
   - Remove Brand Guardrails, color swatch grids, compliance rule lists, and the Custom Brand Kit form from the UI.
3. **Step 2 — Unified Visual Storyboard & On-Demand Scene Inspector (`2. Storyboard & Visuals`)**:
   - Merge Keyframes and Motion Video clips into a single **Visual-First Scene Grid** with **`Motion Clips (Primary)`** (`DEFAULT_STORYBOARD_PREVIEW_MODE = 'video'`) selected by default and **`Keyframes`** as a secondary toggle in the toolbar, plus 1-click batch actions (*"Synthesize All Motion Clips"*, *"Generate All Keyframes"*).
   - Render each Scene Card with **zero open textareas**: show only the `16:9` motion video / keyframe preview (falling back to the scene's `posterImageUrl` keyframe if a motion clip hasn't been generated yet), scene order & duration badge, stale indicator pill (if out of sync), scene title, 2-line spoken voiceover quote, 1-click generate button, and an **"Edit Scene"** button.
   - Tuck Reference Anchors behind a collapsible **"Reference Anchors"** toggle drawer so they only appear when needed.
   - Open a focused **Scene Inspector Modal** when the user clicks **"Edit Scene"**, housing the Visual Prompt, Camera Motion Directive, Voiceover Script, Conversational Turn Edit (`previous_interaction_id`), `+4s Extend`, and Take History selector.
4. **Step 3 — Streamlined Audio Studio (`3. Voice & Soundtrack`)**:
   - Present a clean 2-column layout:
     - **Left Column — Scene Voiceover Narration**: Includes quick dropdown selectors for **Narrator Voice Preset** (`VOICE_PRESET_OPTIONS`, default `Kore`), **Speaking Speed / Pace** (`VOICE_SPEED_OPTIONS`, default `1.25x — Fast & Energetic` with live browser `playbackRate` sync and backend FFmpeg `atempo` speedup), and **Vocal Delivery Style** (`VOICE_STYLE_OPTIONS`), right alongside the editable **Voice Direction Prompt** input (`voice-prompt-input`), a primary *"Synthesize All Voiceovers"* button, per-scene `<audio>` players, and a collapsible *"Customize Voice Persona"* drawer.
     - **Right Column — Campaign Soundtrack**: Includes quick dropdown selectors for **Soundtrack Style / Genre** (`MUSIC_GENRE_OPTIONS`), **Tempo & Energy** (`MUSIC_TEMPO_OPTIONS`), and **Instrumentation** (`MUSIC_INSTRUMENT_OPTIONS`) that compose into the editable **Soundtrack Prompt** textarea (`soundtrack-prompt-textarea`) via `composeSoundtrackPromptFromSelections`, plus a 1-click *"Compose Soundtrack"* button and `<audio>` player.
5. **Step 4 — Pure Final Cut Theater (`4. Final Cut`)**:
   - Present a centered `16:9` **Master `.MP4` Video Player** (`<video controls playsInline preload="metadata">`), 1-click **"Assemble Final Master Cut (.MP4)"** and **"Download Master .MP4"** actions, and a clean scene duration summary list.
   - Write the assembled Master `.MP4` directly to disk (`libx264`, `yuv420p`, `aac`, `-movflags +faststart`, `maxBuffer: 128 MB`) stitching real scene motion `.mp4` videos, brisk per-scene `.wav` voiceovers, and `-12dB` ducked `.wav` soundtrack so the Final Cut plays natively in all browsers.
   - Remove the Brand Compliance Scorecard and raw FFmpeg filtergraph strings (`ffmpegFilterComplex`) from the UI.

## User Stories

1. As a marketing creator, I want a single-line 4-step pill navigation bar (`1. Brief`, `2. Storyboard & Visuals`, `3. Voice & Soundtrack`, `4. Final Cut`), so that I can immediately understand the studio flow without reading 6 technical model cards.
2. As a marketing creator, I want Step 1 (`1. Brief`) to show only the 1-click starter presets and the core campaign brief fields without brand guardrail lists or hex swatch tables, so that I can focus on my creative pitch without visual clutter.
3. As a marketing creator, I want Step 2 (`2. Storyboard & Visuals`) to display clean, visual-first Scene Cards with zero open textareas on the main grid, so that I can scan my storyboard like a real filmstrip.
4. As a marketing creator, I want a `Keyframes` / `Motion Clips` preview mode toggle in the Step 2 toolbar, so that I can view and generate both static scene keyframes and motion video clips on the same unified Storyboard canvas without switching top-level tabs.
5. As a marketing creator, I want Reference Anchors in Step 2 to be collapsed by default behind a `"Reference Anchors"` toggle button, so that anchor management does not push my scene cards below the fold.
6. As a marketing creator, I want clicking `"Edit Scene"` or `"Magic Edit"` on any Scene Card to open a focused Scene Inspector Modal containing the Visual Prompt, Camera Motion Directive, Voiceover Script, Conversational Turn Edit input, `+4s Extend` action, and Take History selector, so that detailed editing happens one scene at a time.
7. As a marketing creator, I want adding a new scene in Step 2 to open a compact modal or collapsible drawer rather than displaying a permanent 5-column form at the bottom of the page.
8. As a marketing creator, I want Step 3 (`3. Voice & Soundtrack`) to foreground 1-click Per-Scene Voiceover synthesis and 1-click Campaign Soundtrack composition while tucking advanced Voice Persona prompt fields inside a collapsible toggle, so that audio scoring feels effortless.
9. As a marketing creator, I want Step 4 (`4. Final Cut`) to focus purely on the `16:9` Master `.MP4` Video Player, 1-click Master Cut assembly, direct `.MP4` download, and clean scene duration summary—without exposing Brand Evaluation scorecards or raw FFmpeg filtergraph code.
10. As a marketing creator, I want upstream-to-downstream `"Out of Sync / Stale"` indicators to remain clearly visible as concise badges when I edit a scene's prompt or script in the Scene Inspector Modal, so that I still know which assets need regeneration.

## Implementation Decisions

- **Deep Frontend View-Model & Modular UI Architecture (`StudioWorkspaceUI`)**:
  - Extract a pure, testable view-model helper module (`studioViewModel`) that maps `CampaignDetail` into the 4-step simplified workflow state (step readiness, active scene inspector state, unified `image`/`video` card display state, stale badge counts, and filtered scene take lists) and can be unit-tested deterministically without DOM fragility.
  - Decompose the monolithic root UI component into focused, progressive-disclosure sub-components:
    - Compact 4-Step Header & Pill Navigation
    - Step 1: Calm Brief & Starter Presets View (with Brand Guardrails & Custom Brand Kit UI removed)
    - Step 2: Unified Visual Storyboard Canvas (with `Keyframes` / `Motion Clips` toggle, Collapsible Reference Anchors Drawer, and On-Demand `SceneInspectorModal`)
    - Step 3: Streamlined Voice & Soundtrack View (with collapsible Voice Persona customization)
    - Step 4: Pure Final Cut Theater View (with Brand Eval Scorecard and raw FFmpeg filtergraph UI removed)
- **Backend & Google Cloud Vertex AI Preservation**:
  - Retain all existing backend REST endpoints, `CampaignVault` non-destructive take history and stale cascade logic, `GeminiStudioGateway` live Vertex AI integrations (`vertex-ai-demos-468803`), `StudioPipelineOrchestrator`, and `MasterTimelineAssembler` (`-12dB` audio ducking) with zero breaking changes.
  - Maintain strict fail-fast credential verification via Application Default Credentials (`GOOGLE_GENAI_USE_VERTEXAI=1`, `GOOGLE_CLOUD_PROJECT=vertex-ai-demos-468803`) with zero silent fallback stubs in production code.

## Testing Decisions

- **Behavioral Testing Philosophy**:
  - Tests must verify external behavior through public module interfaces (`studioViewModel` and REST/Orchestrator integration contracts) rather than internal implementation details.
- **Separation of Test Doubles vs. Production Code**:
  - Unit and integration tests in `tests/` may pass explicit test doubles into `GeminiStudioGateway` or test `studioViewModel` state transitions directly, whereas production code in `src/` must never contain silent mock clients or canned responses.
- **Modules Under Test**:
  - `studioViewModel` (4-step navigation mapping, unified `image`/`video` card display mode, on-demand Scene Inspector modal state, collapsible Reference Anchors/Voice Persona state, and removal of Brand Guardrails / Brand Eval / FFmpeg filtergraph exposure).
  - Existing 7 backend/pipeline test suites (`slice001` through `slice007`) must continue to pass 100%.

## Out of Scope

- **Brand Guardrails & Custom Brand Kit UI in Step 1**: Explicitly removed from the UI in Iteration #2 per user direction during the Grill Session.
- **Multimodal Brand Compliance Scorecard UI in Step 4**: Explicitly removed from the Final Cut view so Step 4 is a pure Final Cut Theater.
- **Raw Engineering Telemetry in UI**: Raw `ffmpegFilterComplex` strings, raw `interactionId` badges on scene cards, and multi-model ID badges in the top navigation bar are excluded from the UI.

## Further Notes

- The 3 throwaway Google Material 3 UX prototypes remain accessible at `/prototypes/index.html` for design reference.

## Fast-Lane Prompt Updates
- 2026-10-30: Simplified Step 1 presets into Kids / College / Executive 1-sentence use cases (`seedData.ts`), made Motion Clips primary by default (`DEFAULT_STORYBOARD_PREVIEW_MODE = 'video'`) with Keyframes toggle in Step 2 (`studioViewModel.ts`, `App.tsx`), added Voice Preset / Speed (`1.25x` default + FFmpeg `atempo`) / Style and Soundtrack Genre / Tempo / Instruments dropdowns alongside prompt inputs in Step 3 (`geminiStudioGateway.ts`, `studioViewModel.ts`, `App.tsx`), and fixed `MasterTimelineAssembler.assembleMasterCut` to write `-movflags +faststart` `.mp4` directly to disk (`128 MB` `maxBuffer`, stitching real scene motion videos + voiceovers + ducked music) so Step 4 Final Cut plays in-browser.
- 2026-10-30: Removed internal Kids / College / Executive labels from UI preset titles and dropdown menus (`seedData.ts`, `studioViewModel.ts`), and fixed custom Brief edits (`updateCampaignMeta`, `saveStoryboardScenes`, `computeSimplifiedStepReadiness`, `POST /api/campaigns/:id/storyboard/generate`, `App.tsx`) to immediately reset downstream stage completion (`currentStage = 1`, clearing old scenes, audio, master cut, and leftover preset anchors) and atomically pass the edited brief into `generateStoryboard`.
- 2026-10-30: Fixed Final Cut `.mp4` voice speed override (`masterTimelineAssembler.ts`, `geminiStudioGateway.ts`, `studioPipelineOrchestrator.ts`, `app.ts`, `App.tsx`) by removing duplicate/overflow `atempo` compounding during master timeline assembly, passing the selected `speakingRate` atomically during scene/batch voiceover generation and voice design, and auto-refreshing the Final Cut `.mp4` when entering Step 4 with updated voiceovers.
- 2026-10-30: Added real `.mp4` `mvhd` atom duration probing in `MasterTimelineAssembler.probeDurationSeconds` and `CampaignVault.appendTake` so 10-second scene motion clips (`10.03s`) are never truncated to `6s` (`18s` total) during Final Cut `.mp4` assembly (`30.13s` full runtime).
