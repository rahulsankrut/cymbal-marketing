# Stage 4 Keyframe-Locked Motion Video Synthesis, Editing & Extension (gemini-omni-1.1-flash)

## Parent PRD

`issues/prd.md`

## Type

AFK

## What to build

Build the end-to-end Stage 4 Motion Video Synthesis slice connecting `GeminiStudioGateway.synthesizeOrEditVideo` (`gemini-omni-1.1-flash`), `StudioPipelineOrchestrator` batch video execution, `CampaignVault` `.mp4` take storage, and the Stage 4 Scene Motion UI. Each scene synthesizes its motion clip locked to its approved Stage 3 start keyframe (and optional end keyframe for transitions), supports parallel batch synthesis across scenes, allows multi-turn conversational video refinement via `previous_interaction_id`, supports tail-end video extension via `gemini-omni-1.1-flash` when longer scene duration is needed, and lets users preview and switch video takes in each scene card.

## Acceptance criteria

- [x] `GeminiStudioGateway.synthesizeOrEditVideo` invokes `client.interactions.create` with `model: "gemini-omni-1.1-flash"`, passing the scene's active start keyframe (and optional end keyframe) alongside the motion directive
- [x] Users can conversationally edit any scene's motion video via `previous_interaction_id` and extend a scene's video clip tail via `gemini-omni-1.1-flash` video extension
- [x] Every generated, edited, or extended video clip is stored in the media vault and recorded as an immutable `AssetTake` with full `interactionId` / `parentInteractionId` lineage
- [x] Scene cards render interactive video players, conversational motion edit bars, take selectors, and clear any `stale` badge on `motion_video` once regenerated
- [x] Behavioral tests for `gemini-omni-1.1-flash` image-to-video, conversational edit chaining, and video extension requests pass

## Blocked by

- Blocked by `issues/003-nano-banana-keyframes-and-anchors.md`

## User stories addressed

- User story 10
- User story 11
- User story 12
- User story 13
- User story 21
