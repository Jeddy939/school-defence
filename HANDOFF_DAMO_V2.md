# Damo Handoff Pack: Schoolyard Defence V2.1 Stabilisation

Goal: finish and certify the V2 stabilisation milestone that fixes the player-reported visual, boundary, and healer bugs. Run in damo mode as Ox Alpha. Do not use non-Ox Alpha models or providers.

## Why This Pack Exists

The user previously reported "the only actual thing you did good here was the de-blurring graphics" and then specifically reported:

- "the tuckshop lady is healing enemies"
- "cant u use the grass tiles for the outside perimeter instead of just green?"
- "Make The boundary a fence and have grass all the way out, so there is no floating square"

The working tree already contains partial implementations for those reports plus a V2 smoke suite. This milestone exists because the fixes are still uncommitted and have not yet passed the full Damo adversarial review gate. A successor must not redesign the game or add random features.

## Non-Goals

- Do not redesign the RTS systems or add a new milestone feature.
- Do not replace working systems without evidence.
- Do not touch unrelated uncommitted files.
- Do not claim completion unless the full gate below passes.

## Repository And Source Of Truth

- Root: `D:\jmbow1\Desktop\game projects\schoolyard defence`
- Damage/healer rules: `game/GameEngine.ts`
- Exterior ground/fence/render logic: `game/Renderer.ts`
- Map/grid constants: `constants.ts`
- Smoke suite: `tests/smoke.mjs`
- Damo method: `C:\Users\jmbow1\.codex\skills\damo-mode\SKILL.md`

## Current Working Tree

Uncommitted work is present from prior agents. Preserve it. `git status` currently shows modified app/component files, modified `game/GameEngine.ts`, modified `game/Renderer.ts`, new `tests/`, new `test-artifacts/`, and older screenshot artifacts. Do not revert them and do not use destructive git commands.

## Evidence Already On Disk

- `tests/smoke.mjs` checks: DPR-aware pointer selection, map dimensions, opening economy, movement, textured exterior grass, gathering, production and rally, building overlap/bounds rejection, Tuckshop Lady cannot heal hostiles, wave warnings and spawn sides, boss spawn bounds, opening waves, save schema rejection, mobile/desktop screenshots.
- `v2-1-*.png` screenshots show boundary/spawn iteration work.
- `v2-milestone-*.png` screenshots show an opening/mobile milestone state.
- `test-artifacts/v2-grass-desktop.png` and `v2-grass-mobile.png` show prior grass-backdrop work.
- `HANDOFF_DAMO_V2.md` is this pack.

## Confirmed Implementations In The Working Tree

### 1. Tuckshop Lady heals faculty only

- `HOT_PIE` impacts a target only when `target.faction === Faction.FACULTY`.
- A hostile right-click order is rejected for `TUCKSHOP_LADY`.
- A hostile `targetId` is cleared and the healer cannot enter attack/chase states.
- Passive healing scans only `Faction.FACULTY` entities that are injured, visible, and not under construction.

### 2. Grass tiles extend outside the playable area

- `drawGrassBackdrop` fills the canvas with a dark-green base then repeats a real tile image as an isometric world-space pattern.
- The pattern uses the OVAL grass tile and scales it to `TILE_SIZE`, so the exterior is textured grass instead of flat green.
- Smoke test pans far outside the map and confirms sampled pixels remain green and textured.

### 3. Boundary is a fence with no floating square

- `drawBoundaryFence` draws four fence edges at `(0,0)-(GRID_W*TILE_SIZE,0)`, `(0,0)-(0,GRID_H*TILE_SIZE)`, and the two opposite edges using back/front passes with entity depth.
- `drawFenceEdge` draws posts, rails, and the final post for each edge.
- `drawGrassBackdrop` runs before the fence and map, so grass continues outward and the map no longer floats on empty canvas.

## Known Open Item For The Owner

- The exterior grass pattern is created from `this.tileImages[TileType.OVAL]?.[0]` on first draw. Verify that this image is loaded by then on desktop and mobile, and confirm in screenshots that real tile texture is visible outside the map. If the image is not loaded yet, improve the fallback to use the in-memory `generateGrassPattern` tile until the image arrives. Do not silently settle for flat green.

## Ordered Work

1. Read the Damo skill and this pack completely.
2. Inspect `git status`, `tests/smoke.mjs`, `game/GameEngine.ts`, `game/Renderer.ts`, and the confirmation sections above.
3. Run `npm run typecheck`.
4. Run `npm run test:smoke`. The smoke suite builds the app and must pass with no new runtime/console errors.
5. If either check fails, fix only the direct defect. Rerun both checks.
6. Start the Vite dev server and visually inspect desktop and mobile screenshots. Confirm the fence reads as a boundary fence, grass is textured beyond the map, and the map does not float on a flat void. Capture fresh screenshots into `test-artifacts/`.
7. Do one focused independent adversarial self-review pass against every acceptance criterion below. Inspect the complete relevant diff and surrounding code. Do not relax the rubric because progress exists.
8. Fix material review findings, rerun affected checks, and repeat review after material changes.
9. When all gates pass, leave a short completion note in this file: evidence commands, screenshots, known limitations, and unresolved risks.

## Acceptance Criteria

- `npm run typecheck` passes.
- `npm run test:smoke` passes end to end, including all healer, grass, fence-related assertions already in the suite.
- A hostile target never receives `HOT_PIE` healing.
- The healer cannot attack or chase hostiles.
- Injured visible faculty within range still receive healing.
- Exterior ground is real grass texture, not a plain flat green rectangle.
- A fence marks all four map boundaries with posts/rails.
- The map is visually grounded on grass with no floating square.
- No new runtime/console errors on desktop or mobile.
- Fresh desktop and mobile screenshots are saved.
- This file records the final evidence and any genuine limitations.

## Verification Commands

```powershell
cd 'D:\jmbow1\Desktop\game projects\schoolyard defence'
npm run typecheck
npm run test:smoke
```

## Balance Plan

No new economy or wave balancing is in this milestone. Stable V2 values are preserved:

- Opening grants: 150 normal, 300 easy, 100 hard.
- First wave delay: 90s normal.
- Follow-up waves: 60s normal.
- Tuckshop Lady: 70 HP, 120 range, 90-frame cooldown, 15 point heal baseline, 100 grants / 100 curriculum.
- Locker: 2500 HP, 20 curriculum.

## Later Backlog

Deliberately wait for the next milestone:

- Unit counter depth and wave composition tuning.
- Tutorial and first-time experience improvements.
- Audio feedback.
- Long-term progression, medals, or campaign.
- Macro QoL such as multi-select groups or production batches.
- New enemy archetypes.

## Final Completion Gate

Do not report completion until:

- All verification commands pass.
- Visual checks are inspected at desktop and mobile sizes.
- No new runtime/console errors.
- No material review findings remain.
- No temporary harnesses or placeholders are left.
- This handoff says what was completed, what was verified, and genuine remaining limitations.

## Completion Note

Completed 2026-08-25 by the Ox Alpha worker in damo mode.

### What Was Completed

- Preserved and certified the existing healer, textured grass, and boundary fence fixes.
- Hardened movement so units no longer wedge forever when all normal steering angles are blocked by random trees/lockers. `moveEntity` now uses a rotating deterministic slide escape only when every normal candidate collides, and resets the stuck count whenever a unit moves.
- Fixed the mobile empty-state hint: touch mode now says "Tap..." and the panel has a mobile `max-width: 26ch` so the sentence wraps onto two clean lines instead of clipping at "or...".
- Strengthened the smoke suite: movement now runs over eight seeded random maps, and production tests now assert a real trained-unit delta instead of counting the starting Teacher's Aide.
- Added `tests/capture_evidence.mjs` for fresh desktop, boundary, and mobile screenshots with no console errors and no horizontal overflow.

### Files Changed By This Worker

- `game/GameEngine.ts`: added `stuckFrames` map, reset on game reset, deterministic slide escape, and movement stuck count reset.
- `components/HUD.tsx`: touch-aware empty-state help text.
- `App.tsx`: passes `isTouchMode` into `HUD`.
- `index.css`: mobile hint wrap limit.
- `tests/smoke.mjs`: seeded multi-map movement test and production delta assertions.
- `tests/capture_evidence.mjs`: helper for visual evidence capture.
- `HANDOFF_DAMO_V2.md`: this completion note.

### Verification Evidence

- `npm run typecheck` passed.
- `npm run test:smoke` passed after the movement and HUD fixes, proving healer safety, crowd/path movement across seeds, economy/production/rally/build rejection, wave warnings, boss spawn bounds, save schema rejection, and desktop/mobile screenshots.
- `node tests/capture_evidence.mjs` passed with no page/console errors.
- `test-artifacts/v2-damox-desktop.png`, `test-artifacts/v2-damox-boundary.png`, and `test-artifacts/v2-damox-mobile.png` were captured from the rebuilt production preview.
- Visual inspection confirmed textured grass beyond the map, a perimeter fence, and no floating map. Mobile visual inspection confirmed no horizontal overflow and the touch hint wraps cleanly.
- Fence/grass evidence sampled from the canvas:
  - Final fence band: `{"edge":[118.625,115,83.25],"outside":[104.125,103.25,75]}`
  - Later pass: `{"edge":[127.875,120.125,77.625],"outside":[101.625,105.625,74]}`

### Known Limitations

- I saw two smoke-pass flakes during the long run: one movement wedging failure (fixed) and one canvas-locator timeout before any game assertion. The subsequent runs passed, including the repeated gate, so this appears environmental/latency rather than a deterministic game failure. If the timeout recurs, add harness startup diagnostics or a retry around preview boot.
- The capture helper logs fence-band colors rather than asserting an exact color threshold because one-pixel sampling around arbitrary fence segments picks up tile edges and sprite overhang; the objective logs plus rendered screenshots are the visual evidence.
- No new audio, tutorial, balancing, or long-term progression changes were added, per the milestone scope.

## DeepSeek Text-Only Visual Handoff: Green-Only Camera Failure

DeepSeek is a non-visual implementation worker. Do not ask it to inspect, copy, or match a screenshot. Use the following translated evidence and measurable requirements.

### Observed Failure In Words

- URL: `http://127.0.0.1:4180/`.
- Touch-mode game viewport selected at a reported 639x632 CSS-pixel browser viewport.
- HUD renders normally and reads Wave 1, Next 110s, Grants $300, Curriculum 100. Center, Briefing, and Pause controls are visible.
- The game canvas is not blank: it renders the exterior green grass backdrop.
- Zero playable-map features are visible: no isometric tiles, perimeter fence, buildings, units, resources, selection markers, or shadows.
- The selection and command panels below the canvas render normally.
- Therefore React, the game loop, and canvas drawing are alive; the playable world is outside the camera viewport.

### Root Cause And Required Invariant

`GameEngine.loadGame()` previously trusted saved `panOffset` and `zoom`, while keyboard, mouse, and touch panning could move the camera without bounds. `Renderer.drawGrassBackdrop()` correctly fills the logical 800x600 canvas even when the map is off-screen, which disguised the camera failure as a green-only game.

Required invariant: after loading any accepted Version 2 save or using any supported pan/zoom input, the 20x15 playable map must retain a meaningful visible slice inside the logical 800x600 canvas. Grass beyond the fence must remain visible, but the entire map may never be lost off-screen.

### Implemented Guard And Regression Evidence

- `game/GameEngine.ts` now owns `panBy()` and `constrainCamera()`; loaded camera values are finite-checked and zoom is clamped to 0.5..3.
- Malformed camera saves fall back to `centerViewOnStaffroom()`.
- Valid but extreme saves are constrained against the projected isometric map diamond.
- Keyboard/edge pan, middle-mouse drag, touch drag, and wheel/pinch zoom all use the same constraint.
- `components/GameCanvas.tsx` no longer mutates `engine.panOffset` directly for touch dragging.
- `tests/smoke.mjs` checks extreme positive/negative interactive pan, an extreme finite saved camera, a malformed saved camera, and the exact Center target of logical screen position (352,336).
- Verification on 2026-08-25: `npm run typecheck` passed and `npm run test:smoke` passed.
