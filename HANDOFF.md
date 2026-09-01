# Schoolyard Defence - Browser Codex Handoff

## Project overview

Schoolyard Defence is a React 19 + TypeScript + Vite isometric RTS game set in an Australian school. The player manages faculty units, buildings, grants, and curriculum while defending the staffroom from escalating student waves. The project also includes a browser-driven ChatGPT sprite generation pipeline and runs on Vercel as `edustochia.com`.

## Current objective

Hand the repository state cleanly from local Codex to browser Codex for a continuation pass, then continue the current game work (menu polish plus V2 stabilisation) in browser Codex. The immediate next task is to have a capable browser reviewer, running as Sol, independently review the uncommitted menu/save-preservation changes and certify the handoff. No new feature work has been started in this handoff pass.

## Completed work

- Full Version 2 release exists at commit `0857c63`.
- V2 stabilisation completed and smoke-tested: Tuckshop Lady heals faculty only, textured exterior grass, fence boundary instead of floating flat square, deterministic movement escape, camera constraints, production spawn fix replication notes, save-schema preservation, and desktop/mobile screenshots.
- Home-menu rebuild completed and verified: exact full-artwork hotspot menu, 1.5-second artwork-only intro, live difficulty dossier, conditional Continue Campaign, Sprite Debug entry, Options/Manual/Achievements/Exit placeholder actions, mobile action fallback, focus/accessibility pass, and desktop/tablet/mobile captures.
- `design-qa.md` records the visual QA and final pass result.
- `HANDOFF_DAMO_V2.md` records the V2 stabilisation completion evidence.

## Current implementation state

The working tree contains real uncommitted changes in these files:

- `App.tsx` - hotspot menu deep-link state, menu intro timer, difficulty dialog with focus management, Continue/Sprite Debug/utility actions, save-preservation call on new game.
- `game/GameEngine.ts` - `inspectSave()`, `clearIncompatibleSave()`, preservation of schema-incompatible saves on menu/load; explicit clear only on new game.
- `index.css` - full menu visual system, hotspot hit areas, mobile fallback actions, difficulty dossier, status notice.
- `tests/smoke.mjs` - save-rejection tests updated to prove incompatible saves are preserved rather than deleted.

`components/GameOverlay.tsx`, `components/MissionBriefing.tsx`, and `constants.ts` appear modified in `git status` but contain only CRLF/line-ending differences; their content is unchanged.

## Exact continuation instructions

1. Run `git fetch origin --prune` and confirm the branch is in sync.
2. Run the full gate: `npm ci`, `npm run typecheck`, `npm run build`, `npm run test:smoke`.
3. Review the full unpublished diff versus `origin/main` (`git diff origin/main`). Confirm the hotspot menu, save-preservation behavior, and V2 changes are coherent and complete.
4. Run the browser interaction pass (menu verification and hotspot capture scripts under `scripts/`) and confirm no console errors.
5. When the independent review is complete and all checks pass, commit the intended project state on the handoff branch and push it. Do not merge to `main`, force-push, or open a PR without user authorisation.
6. Record the final review result and any findings in `HANDOFF.md` or `design-qa.md`.

## Relevant files

- `App.tsx` - main app/menu state and hotspot actions.
- `game/GameEngine.ts` - game loop, save inspection/preservation, camera and movement stabilisation, spawn logic.
- `game/Renderer.ts`, `constants.ts` - map, fence, grass, and render pipeline.
- `index.css` - entire menu design system.
- `tests/smoke.mjs` - full browser smoke suite.
- `scripts/menu_verify.mjs`, `scripts/menu_verify2.mjs`, `scripts/menu_recapture.mjs` - menu interaction and accessibility verification.
- `public/menu/schoolyard-defence-menu.png` and `public/menu/war-room-backdrop.png` - selected full artwork and backdrop.
- `design-qa.md` - visual QA record.
- `SAFE_DEPLOYMENT.md` - Vercel promotion/rollback and save-data safety.
- `HANDOFF_DAMO_V2.md` - V2 stabilisation detail.

## Setup and run commands

```powershell
npm ci
npm run dev
```

The game runs at `http://127.0.0.1:5173/` by default. `npm run preview` serves the production build.

## Test and verification commands

```powershell
npm run typecheck
npm run build
npm run test:smoke
```

Menu interaction and accessibility capture:

```powershell
node scripts/menu_recapture.mjs
node scripts/menu_verify2.mjs
```

Current results: `npm run typecheck` passed, `npm run build` passed, `npm run test:smoke` passed ("Version 2 smoke test passed").

## Environment-variable names required

- `OPENAI_API_KEY` - required by sprite generation scripts (`OPENAI_API_KEY` is read at runtime; never store the value in this repo).
- `GEMINI_API_KEY` - referenced by `vite.config.ts` as `process.env.GEMINI_API_KEY`; supply it in the environment, not in source.

No secrets, tokens, API keys, or private configuration files should be committed. `.env.local` is ignored and must stay local.

## Known issues and risks

- The smoke suite may occasionally flake on canvas/network timeouts during long runs; rerun before treating a failure as a regression.
- Portrait layouts show unused vertical space by design because the selected artwork is 16:9 and uncropped. A portrait illustration would be required to eliminate the dead space.
- `design-qa.md` has already recorded the final visual QA as passed for the current menu build.

## Git branch, commit, and remote details

- Branch: `main`
- Local commit: `0857c63` ("Release Schoolyard Defence Version 2")
- Remote: `origin` = `https://github.com/Jeddy939/school-defence.git`
- Branch tracking: `main` is in sync with `origin/main` (fetch verified; not ahead or behind)
- Working tree: contains the real uncommitted changes described above plus local screenshot, test-artifact, and generated files. `.vercelignore` and `.gitignore` keep build output, generated assets, `test-artifacts/`, and `.env.local` local.
- Deployment: Vercel project `schoolyard-defence`, current menu build verified via `https://teacherdefence.edustochia.com`.

