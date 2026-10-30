# Stage 6 FFmpeg Master Timeline Assembler, -12dB Audio Ducking & Final Cut Theater Export

## Parent PRD

`issues/prd.md`

## Type

HITL

## What to build

Build the end-to-end Stage 6 Final Cut Assembly slice across `MasterTimelineAssembler` (server-side FFmpeg using `ffmpeg-static` / system `ffmpeg`), `/api/campaigns/:id/assemble`, and the Stage 6 Master Cut Theater Player UI. `MasterTimelineAssembler` probes the durations of each scene's active motion clip and active TTS voiceover, aligns each scene's voiceover start time to its video segment boundary (padding trailing silence when voiceover is shorter than video, or offering one-click `gemini-omni-1.1-flash` video extension / visual tail hold when voiceover exceeds video), applies `-12dB` volume ducking to the `lyria-3.5` background score whenever speech is active, and muxes a browser-streamable H.264/AAC `.mp4` master cut with one-click download and human creative review.

## Acceptance criteria

- [x] `MasterTimelineAssembler.computeTimelinePlan` accurately probes per-scene video and voiceover durations and detects any scene where voiceover exceeds video duration (surfacing a one-click Omni 1.1 Flash video extension option or tail-frame hold)
- [x] `MasterTimelineAssembler.assembleMasterCut` stitches all scene videos, aligns per-scene voiceovers with silence padding, applies `-12dB` audio ducking to the Lyria music bed during active narration intervals, and outputs a valid H.264/AAC `.mp4` master file
- [x] Stage 6 UI displays the synchronized Master Cut Theater Player, scene boundary timeline markers, duration sync status badges, and a downloadable `.mp4` export button
- [x] Behavioral tests for `computeTimelinePlan` duration alignment, `-12dB` audio ducking filtergraph execution, and valid `.mp4` file generation pass

## Blocked by

- Blocked by `issues/004-omni-flash-motion-synthesis.md`
- Blocked by `issues/005-tts-voiceover-and-lyria-scoring.md`

## User stories addressed

- User story 20
- User story 21
