# Stage 2 AI Storyboard Generator (gemini-3.8-flash) & Non-Destructive Stale Cascade Engine

## Parent PRD

`issues/prd.md`

## Type

AFK

## What to build

Build the end-to-end Stage 2 Storyboard & Script vertical slice connecting `GeminiStudioGateway.generateStoryboard` (`@google/genai` >= 2.29.1 calling `gemini-3.8-flash` with JSON Schema `response_format`), `CampaignVault` scene persistence and non-destructive `stale` cascade logic, `/api/campaigns/:id/storyboard/generate` and `PATCH /api/campaigns/:id/scenes/:sceneId`, and the Non-Linear Scene Canvas UI. Users can generate a multi-scene storyboard from their brief and Brand Kit, add/reorder/edit/delete scenes, and see downstream modalities (`keyframe_start`, `motion_video`, `voiceover_audio`, `master_video`) automatically badged as `Stale / Out of Sync` whenever an upstream prompt or script is modified—without deleting historical takes.

## Acceptance criteria

- [x] `GeminiStudioGateway.generateStoryboard` calls `client.interactions.create` with `model: "gemini-3.8-flash"` and structured JSON schema `response_format` to produce scenes with visual prompt, camera motion directive, narration script, vocal style, target duration, and reference anchor tags
- [x] Users can add, reorder, edit, and delete storyboard scenes on the Non-Linear Scene Canvas
- [x] Editing a scene's visual prompt marks downstream `keyframe_start`, `motion_video`, and `master_video` as `stale: true` while preserving existing takes; editing a scene's narration script marks `voiceover_audio` and `master_video` as `stale: true` without marking keyframes stale
- [x] Behavioral tests for `GeminiStudioGateway.generateStoryboard` payload formatting and `CampaignVault` non-destructive stale cascades pass

## Blocked by

- Blocked by `issues/001-brand-kit-and-campaign-tracer.md`

## User stories addressed

- User story 4
- User story 5
- User story 6
