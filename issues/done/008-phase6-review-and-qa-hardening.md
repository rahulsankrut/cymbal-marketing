# 008: Phase 6 Code Review & Live Browser QA Hardening

- **Type**: AFK
- **Blocked by**: 007-ffmpeg-master-timeline-assembly
- **Covers**: Phase 6 Fresh-Context Code Review Findings (Major-1..3, Minor-1..4) & Live Browser QA Polish

## Goal
Resolve all actionable findings surfaced during Phase 6 automated code review and live browser QA across `CampaignVault`, `GeminiStudioGateway`, `StudioPipelineOrchestrator`, `MasterTimelineAssembler`, and `StudioWorkspaceUI`.

## Acceptance Criteria
- [x] `MasterTimelineAssembler.assembleMasterCut` stitches real vault `.mp4`/`.wav` take files on disk when valid FFmpeg-probed media streams exist, falling back to `lavfi` synthesis for unit-test dummy buffers.
- [x] `StudioPipelineOrchestrator` emits `job.failed` SSE events whenever a gateway operation throws an error.
- [x] `CampaignVault.updateScene` cascades `masterStale = true` when `endFramePrompt` changes, `setActiveTake` clears the corresponding modality stale flag, and `currentStage` advances as pipeline stages complete.
- [x] `GeminiStudioGateway.readVaultMediaAsBase64` sanitizes file names with `path.basename` to prevent path traversal, and `app.ts` supports both `/api/campaigns/:id/active-take` and `/api/campaigns/:id/ActiveTake`.
- [x] `App.tsx` checks `if (!res.ok)` across all API handlers before updating `activeCampaign`, includes `keyframe_end` in `totalStaleCount`, updates `currentStage` in the header selector, and provides a `+ New Reference Anchor` creation form in Stage 3.
