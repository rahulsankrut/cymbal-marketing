# Stage 3 Reference Anchor Studio & Keyframe Fusion (gemini-nano-banana-2.1) with Stateful Turn Editing

## Parent PRD

`issues/prd.md`

## Type

AFK

## What to build

Build the end-to-end Stage 3 Keyframe & Reference Studio slice across `GeminiStudioGateway.generateOrEditImage` (`gemini-nano-banana-2.1`), `StudioPipelineOrchestrator` parallel batch execution and SSE telemetry (`/api/campaigns/:id/events`), `CampaignVault` immutable Take History and disk media storage, and the Stage 3 UI. Users can generate or upload Reusable Visual Reference Anchors (e.g., Cymbal flagship aircraft, cockpit HUD, flight crew), generate per-scene start/end keyframes that fuse up to 14 linked Reference Anchor images, run parallel "Generate All Keyframes" batch jobs with live SSE progress, conversationally refine any scene keyframe using stateful `previous_interaction_id` chaining, and compare/switch active takes in the per-scene Take History drawer.

## Acceptance criteria

- [x] Users can create Reference Anchors via `gemini-nano-banana-2.1` or image upload and link them to storyboard scenes
- [x] Scene keyframe generation passes linked Reference Anchor images followed by the scene visual prompt to `gemini-nano-banana-2.1` via `client.interactions.create`
- [x] Conversational image edits pass `previous_interaction_id` of the active keyframe take and record a new immutable `AssetTake` in `CampaignVault` without overwriting prior takes
- [x] Parallel batch keyframe generation across all scenes streams real-time SSE job progress and token/latency telemetry to the UI activity bar
- [x] Behavioral tests for `gemini-nano-banana-2.1` multi-image reference fusion, `previous_interaction_id` propagation, and Take History switching pass

## Blocked by

- Blocked by `issues/002-ai-storyboard-and-stale-cascade.md`

## User stories addressed

- User story 3
- User story 7
- User story 8
- User story 9
- User story 10
- User story 21
