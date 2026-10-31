# Issue 014: Phase 7 Deep Architecture RFC — Deepen `StudioViewModel` Across All 4 Simplified Steps

- **Status**: Completed
- **Iteration**: #2 — UI and UX Simplification
- **Phase**: 7 (Deep Architecture & Memory — Ousterhout Module Deepening)

## 1. Shallow Seam Identified (`p7-explore`)
While Steps 1, 2, and 4 delegate their state projection to pure functions in `src/client/viewModel/studioViewModel.ts` (`buildCalmBriefViewState`, `buildVisualSceneCards`, `buildSceneInspectorModalState`, `buildFinalCutTheaterViewState`), Step 3 (`3. Voice & Soundtrack`) and the header `totalStaleCount` badge still compute take lookups (`getTakeById(scene.activeTakes.voiceover_audio)`, `getTakeById(activeCampaign.activeMusicTakeId)`) and stale aggregations inline inside `src/client/App.tsx`.

## 2. Comparison of 3 Interface Designs (`p7-compare`)
1. **Design 1 — Minimalist (`buildStudioWorkspaceSnapshot`)**:
   - Single monolithic function computing all 4 steps at once on every render. Simple signature, but wastes work computing inactive steps.
2. **Design 2 — Flexible (Selector Factory Pipeline)**:
   - Parameterized selector combinators with custom filter/projection callbacks. Over-engineered for a 4-step studio flow.
3. **Design 3 — Caller-Optimized Per-Step ViewModels (Selected)**:
   - Add `buildStreamlinedAudioViewState(campaign)` and `computeTotalStaleCount(campaign)` alongside the Step 1, Step 2, and Step 4 builders in `src/client/viewModel/studioViewModel.ts`. Every step in `App.tsx` makes a single call to its step ViewModel builder, and 100% of step state projections are unit-testable in Node without a DOM.

## 3. Acceptance Criteria (`p7-rfc`)
- [x] Add `buildStreamlinedAudioViewState` and `computeTotalStaleCount` to `src/client/viewModel/studioViewModel.ts`.
- [x] Wire `buildStreamlinedAudioViewState` and `computeTotalStaleCount` into `src/client/App.tsx`.
- [x] Add unit test coverage in `tests/slice012-streamlined-audio-and-final-cut-theater.test.ts`.
- [x] Persist the 5 Deep Modules & Iteration #2 4-step progressive-disclosure architecture in `AGENTS.md`.
