## Parent PRD

`issues/prd.md`

## Type

AFK

## What to build

Unify Keyframes and Motion Video synthesis into a single visual-first **Step 2 (`2. Storyboard & Visuals`)** canvas with progressive disclosure:
1. Add a `Keyframes` / `Motion Clips` preview mode toggle in the Step 2 toolbar alongside 1-click batch actions (`Generate All Keyframes`, `Generate All Motion Clips`), a collapsible `Reference Anchors` toggle drawer, and a collapsible `+ Add Scene` drawer.
2. Render each Scene Card on the main grid with **zero open textareas**: show only the `16:9` image/video preview (based on the active preview mode), scene number & duration pill, concise stale indicator badge (if out of sync), scene title, 2-line spoken voiceover quote, 1-click primary generate button, and an `Edit Scene` / `Magic Edit` button (without raw `interactionId` strings on the card).
3. Build the on-demand `SceneInspectorModal` (`src/client/components/SceneInspectorModal.tsx`) that opens when a user clicks `Edit Scene` or `Magic Edit` on a Scene Card, housing the Visual Prompt, Camera Motion Directive, Voiceover Script, Conversational Turn Edit input (`previous_interaction_id`), `+4s Extend` button, and Take History selector for that single scene.

## Acceptance criteria

- [ ] Main Storyboard grid in Step 2 renders 0 open `<textarea>` elements when the Scene Inspector Modal is closed.
- [ ] Switching the toolbar toggle between `Keyframes` (`image`) and `Motion Clips` (`video`) switches Scene Card previews and primary generate actions between `keyframe_start` and `motion_video`.
- [ ] Reference Anchors are collapsed by default behind a `"Reference Anchors"` toggle button and expand on click.
- [ ] Clicking `"Edit Scene"` or `"Magic Edit"` on any Scene Card opens `SceneInspectorModal` for that scene with full prompt editing, conversational turn editing (`previous_interaction_id`), `+4s Extend`, and Take History selection.
- [ ] Behavioral unit tests in `tests/slice011-unified-storyboard-and-scene-modal.test.ts` pass.

## Blocked by

- Blocked by `issues/010-4step-pill-nav-and-calm-brief-tracer.md`

## User stories addressed

- User story 3
- User story 4
- User story 5
- User story 6
- User story 7
- User story 10
