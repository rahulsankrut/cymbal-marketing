# Issue 013: Phase 6 QA Polish — 4-Step Campaign Switcher Label & Reference Anchor Categories

- **Status**: In Progress
- **Iteration**: #2 — UI and UX Simplification
- **Phase**: 6 (Review & Live Browser QA)
- **Type**: AFK (Vertical QA Polish Slice)

## Problem discovered in Phase 6 Code Review & Live Browser QA
1. The header campaign switcher `<select>` in `src/client/App.tsx` still displays `(Stage X/6)` instead of `(Step X/4)` via `mapBackendStageToStep`, and `activeStage` is typed as `StudioStageNumber` instead of `SimplifiedStepNumber`.
2. `newAnchorCategory` in `src/client/App.tsx` uses `'aircraft' | 'cockpit' | 'crew' | 'logo' | 'environment'` instead of matching `ReferenceAnchor['category']` (`'aircraft' | 'avionics' | 'character' | 'environment'`).

## Acceptance Criteria
- [x] Header campaign switcher displays `{c.title} (Step {stepNum}/4)` using `mapBackendStageToStep`.
- [x] `activeStage` is typed as `SimplifiedStepNumber`.
- [x] `newAnchorCategory` matches `ReferenceAnchor['category']` (`aircraft`, `avionics`, `character`, `environment`).
- [x] Automated test in `tests/slice010-4step-nav-and-calm-brief.test.ts` verifies `App.tsx` does not contain `(Stage ` / `/6)` and uses `mapBackendStageToStep`.
