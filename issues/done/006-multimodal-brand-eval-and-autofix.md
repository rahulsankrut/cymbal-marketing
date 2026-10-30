# Stage 6 Multimodal Brand Compliance Scorecard (gemini-3.8-flash) & One-Click Scene Auto-Fix

## Parent PRD

`issues/prd.md`

## Type

AFK

## What to build

Build the end-to-end Stage 6 Automated Multimodal Brand Evaluation & Auto-Fix slice connecting `GeminiStudioGateway.evaluateCampaignBrandCompliance` (`gemini-3.8-flash` with JSON Schema `response_format`), `StudioPipelineOrchestrator.applyBrandFindingAutoFix`, and the Stage 6 Brand Compliance Scorecard UI. The evaluator inspects the campaign's actual generated keyframes, motion videos, and voiceover scripts/audio against the active Cymbal Aerospace Brand Kit rules, returning a 0–100 overall score, 4 category sub-scores (Visual Brand Identity, Aerospace Technical Realism, Narrative & Audio Cohesion, Regulatory & Claim Compliance), and scene-pinpointed findings. Clicking **One-Click Auto-Fix** on any finding automatically dispatches the evaluator's remediation prompt into the flagged asset's stateful `previous_interaction_id` chain (`gemini-nano-banana-2.1`, `gemini-omni-1.1-flash`, or `gemini-3.8-flash-tts`), saves the new take as active, and marks the finding resolved.

## Acceptance criteria

- [x] `evaluateCampaignBrandCompliance` sends the active scene keyframes, motion clips, and narration scripts alongside the Brand Kit rules to `gemini-3.8-flash` and returns a validated `BrandEvaluationReport` (0–100 overall score, 4 sub-scores, and findings with `sceneId`, `modality`, `severity`, `issue`, and `suggestedFixPrompt`)
- [x] `applyBrandFindingAutoFix` looks up the flagged scene modality's active take `interactionId`, calls the corresponding modality gateway with `previous_interaction_id` and `suggestedFixPrompt`, sets the resulting take as active, and marks the finding resolved
- [x] Stage 6 UI renders the 0–100 radial scorecard, 4 category breakdowns, scene-linked finding cards, and interactive **One-Click Auto-Fix** buttons with live SSE progress
- [x] Behavioral tests for multimodal Brand Evaluation schema parsing and `applyBrandFindingAutoFix` stateful `previous_interaction_id` routing pass

## Blocked by

- Blocked by `issues/004-omni-flash-motion-synthesis.md`
- Blocked by `issues/005-tts-voiceover-and-lyria-scoring.md`

## User stories addressed

- User story 17
- User story 18
- User story 19
