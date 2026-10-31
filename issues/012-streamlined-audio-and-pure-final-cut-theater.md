## Parent PRD

`issues/prd.md`

## Type

AFK

## What to build

Complete the Iteration #2 UI/UX simplification across **Step 3 (`3. Voice & Soundtrack`)**, **Step 4 (`4. Final Cut`)**, and the application footer:
1. In Step 3 (`3. Voice & Soundtrack`), display a clean 2-column layout with 1-click `"Synthesize All Voiceovers"` and per-scene audio players on the left (with advanced Voice Persona prompt fields tucked inside a collapsible `"Customize Voice Persona"` toggle) and 1-click `"Compose Soundtrack"` with audio player on the right.
2. In Step 4 (`4. Final Cut`), render a **Pure Final Cut Theater**: a centered `16:9` Master `.MP4` Video Player, 1-click `"Assemble Final Master Cut (.MP4)"` and `"Download Master .MP4"` buttons, and a clean scene duration summary list.
3. Remove the Multimodal Brand Compliance Scorecard UI, raw FFmpeg filtergraph strings (`ffmpegFilterComplex`), and noisy multi-model ID lists from Step 4 and the studio footer.

## Acceptance criteria

- [ ] Step 3 (`3. Voice & Soundtrack`) collapses the Voice Persona design form by default behind a `"Customize Voice Persona"` toggle while keeping 1-click scene TTS and soundtrack synthesis immediately accessible.
- [ ] Step 4 (`4. Final Cut`) renders the centered Master `.MP4` Video Player, 1-click Assemble & Download buttons, and clean scene duration summary without rendering the Brand Compliance Scorecard or raw `ffmpegFilterComplex` filtergraph code.
- [ ] Behavioral unit tests in `tests/slice012-streamlined-audio-and-final-cut-theater.test.ts` pass.

## Blocked by

- Blocked by `issues/010-4step-pill-nav-and-calm-brief-tracer.md`

## User stories addressed

- User story 8
- User story 9
