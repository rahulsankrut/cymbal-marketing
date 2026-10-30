# 009: Refactor — Deepen `StudioPipelineOrchestrator` into a Unified 6-Stage Caller-Optimized Facade

- **Type**: AFK
- **Blocked by**: 008-phase6-review-and-qa-hardening
- **Covers**: Phase 7 Ousterhout Deep-Module Refactor (`improve-codebase-architecture`)

## 1. Architectural Friction & Seam Analysis
During Phase 7 exploration, we identified an orchestration seam split between [`src/server/app.ts`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/src/server/app.ts) and [`src/server/orchestrator/studioPipelineOrchestrator.ts`](file:///Users/rahulsankrut/Desktop/Cybmal%20Aerospace%20Marketing/src/server/orchestrator/studioPipelineOrchestrator.ts):
- **Cluster**: `app.ts`, `StudioPipelineOrchestrator`, `GeminiStudioGateway`, `MasterTimelineAssembler`, and `CampaignVault`.
- **Why they were coupled**: Stages 3, 4, and part of 5 routed through `StudioPipelineOrchestrator`, while Stage 2 (`storyboard/generate`), Stage 5 Voice Design (`voice-design`), Stage 6 Brand Evaluation (`brand-eval`), and Stage 6 Master Assembly (`assemble`) coordinated `vault`, `gateway`, `assembler`, and SSE `job.started` / `job.completed` / `job.failed` emissions inline inside Express route handlers in `app.ts`.
- **Test impact**: Behavioral tests that wanted to verify full 6-stage orchestration and SSE lifecycle events had to go through Express HTTP routes for Stages 2 and 6 instead of testing `StudioPipelineOrchestrator` directly at its module boundary.

## 2. Comparison of 3 Radical Interface Designs
1. **Design 1 (Minimalist Command Dispatcher)**:
   - Single `orchestrator.dispatch(cmd: StudioCommand): Promise<StudioCommandResult>` entry point.
   - *Pros*: Smallest surface area (1 method).
   - *Cons*: Callers lose method-level IDE autocomplete and must narrow union return types at every call site.
2. **Design 2 (Flexible Middleware Pipeline)**:
   - Composable `StageStep<TIn, TOut>` middleware chain with pluggable `beforeStage`, `onTelemetry`, and `afterVaultCommit` hooks.
   - *Pros*: Maximum extensibility for third-party plugins.
   - *Cons*: Over-engineered for a focused 6-stage creative studio; introduces unnecessary indirection.
3. **Design 3 (Caller-Optimized Stage Facade — Selected)**:
   - Explicit stage-aligned methods on `StudioPipelineOrchestrator` (`runStoryboardStage`, `generateAnchorImage`, `runSceneStageJob`, `runBatchStageJob`, `designVoicePersonaStage`, `generateCampaignMusicScore`, `runBrandEvaluationStage`, `applyBrandFindingAutoFix`, `runMasterAssemblyStage`) backed by an internal `withStageTelemetry()` lifecycle wrapper and optional `MasterTimelineAssembler` dependency.
   - *Pros*: Makes every Express route in `app.ts` a 3-line delegation, guarantees uniform `job.started` / `job.completed` / `job.failed` SSE telemetry across all 6 stages, and lets tests exercise any stage directly on `StudioPipelineOrchestrator`.

## Acceptance Criteria
- [x] `StudioPipelineOrchestrator` encapsulates all 6 stages (`runStoryboardStage`, `designVoicePersonaStage`, `runBrandEvaluationStage`, `runMasterAssemblyStage`, plus existing Stage 3–5 methods) with unified `job.started` / `job.completed` / `job.failed` SSE emission.
- [x] `src/server/app.ts` delegates Stage 2 Storyboard, Stage 5 Voice Design, Stage 6 Brand Eval, and Stage 6 Master Assembly directly to `StudioPipelineOrchestrator`.
- [x] `AGENTS.md` created at workspace root documenting the 5 Deep Modules and `@google/genai` Interactions API guardrails.
- [x] All behavioral test suites (`npm test`) and TypeScript builds (`npm run build`) pass with zero errors.
