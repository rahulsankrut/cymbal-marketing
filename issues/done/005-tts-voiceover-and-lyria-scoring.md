# Stage 5 Voice Design & Per-Scene Narration (gemini-3.8-flash-tts) + Keyframe-Conditioned Music Score (lyria-3.5)

## Parent PRD

`issues/prd.md`

## Type

AFK

## What to build

Build the end-to-end Stage 5 Voiceover & Music Scoring slice across `GeminiStudioGateway.designVoicePersona`, `synthesizeSceneVoiceover` (`gemini-3.8-flash-tts`), and `composeCampaignMusic` (`lyria-3.5` / `lyria-3-clip-preview`), `CampaignVault` audio take persistence, and the Stage 5 Audio Studio UI. Enable users to design a custom Cymbal Aerospace narrator voice from a persona prompt (or select a preset voice), generate per-scene expressive narration WAVs using `speech_metadata` style annotations locked to each scene's script, and compose a cohesive campaign soundtrack conditioned on both the musical mood prompt and up to 10 storyboard keyframe images as multimodal inputs.

## Acceptance criteria

- [x] Users can design and preview a custom narrator persona via `gemini-3.8-flash-tts` Voice Design or select a preset voice for the campaign
- [x] Per-scene voiceover synthesis calls `gemini-3.8-flash-tts` with `response_format: { type: "audio" }`, `speech_config`, and structured `speech_metadata` style annotations, storing the resulting `.wav` take and duration per scene
- [x] Campaign music generation calls `lyria-3.5` or `lyria-3-clip-preview` with up to 10 active storyboard keyframe images alongside the musical mood prompt to produce a visually conditioned soundtrack take
- [x] Stage 5 UI provides per-scene voiceover players, batch "Synthesize All Voiceovers" execution, campaign soundtrack composer/player, and audio Take History selection
- [x] Behavioral tests for `gemini-3.8-flash-tts` voice design/synthesis and `lyria-3.5` multimodal image-conditioned music payloads pass

## Blocked by

- Blocked by `issues/003-nano-banana-keyframes-and-anchors.md`

## User stories addressed

- User story 10
- User story 14
- User story 15
- User story 16
- User story 21
