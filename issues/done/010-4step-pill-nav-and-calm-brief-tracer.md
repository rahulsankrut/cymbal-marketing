## Parent PRD

`issues/prd.md`

## Type

AFK

## What to build

Implement the end-to-end Tracer Bullet for Iteration #2 UI/UX Simplification (`Option A: 4-Step Storycraft Flow`):
1. Create the `studioViewModel` module (`src/client/viewModel/studioViewModel.ts`) that maps backend `CampaignDetail` into the 4-step simplified workflow (`1. Brief`, `2. Storyboard & Visuals`, `3. Voice & Soundtrack`, `4. Final Cut`), computes step completion status, and filters out raw model ID badges and brand guardrail clutter.
2. Replace the 6 multi-line stage cards in the top header with a sleek, centered 4-Step Pill Navigation bar (`1. Brief`, `2. Storyboard & Visuals`, `3. Voice & Soundtrack`, `4. Final Cut`).
3. Simplify Step 1 (`1. Brief`) so it renders only the 1-Click Starter Presets and the focused Creative Brief Card (Campaign Title, Target Audience, Executive Creative Pitch, Musical Mood, and `"Generate Storyboard →"` CTA), completely removing the Brand Guardrails list, color swatch grid, and Custom Brand Kit form from the UI.

## Acceptance criteria

- [ ] `studioViewModel` exposes pure, unit-tested functions mapping `CampaignDetail` to the 4-step navigation model (`1. Brief`, `2. Storyboard & Visuals`, `3. Voice & Soundtrack`, `4. Final Cut`) and step readiness states.
- [ ] Top header renders the compact 4-step pill navigation without 3-line model ID badges.
- [ ] Step 1 (`1. Brief`) displays 1-click starter presets and the creative brief editor while omitting Brand Guardrails, hex color swatch grids, and Custom Brand Kit creation forms.
- [ ] Behavioral unit tests in `tests/slice010-4step-nav-and-calm-brief.test.ts` pass.

## Blocked by

- None - can start immediately

## User stories addressed

- User story 1
- User story 2
- User story 10
