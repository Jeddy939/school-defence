# Safe deployment to edustochia.com

## Student data: what is safe and what is not

- Game progress is stored in each student's browser as `localStorage.schoolyard_save`.
- Vercel does not hold or back up these saves. A deployment or Vercel rollback does not copy, migrate, or delete them.
- Keep the game on the exact `https://edustochia.com` origin. Changing the domain, protocol, browser profile, device, or clearing site data makes the old save unavailable.
- This build preserves incompatible or malformed saves when the menu checks them or a load fails. Only an explicit **New Game** clears an incompatible save.
- A Vercel rollback restores application code, not browser data. Never tell students to clear site data as a deployment fix.

## Release gate

Run from the project root:

```powershell
npm ci
npm run typecheck
npm run build
npm run test:smoke
```

Do not continue if any command fails. Confirm `git status --short` contains only the intended release files. The current working tree may include local screenshots and notes; Vercel's upload must follow `.vercelignore` and must not include secrets such as `.env.local`.

## Preview first

Create a preview deployment without changing production:

```powershell
npx vercel deploy --yes
```

Record the returned preview URL. On that URL, verify:

1. Menu, mission briefing, HUD, pause overlay, and mobile layout render correctly.
2. Start a game, play long enough to create a save, reload, and continue it.
3. Complete the smoke-test flow: select/move, gather, build, recruit, and start a wave.
4. Browser console has no new errors.

Preview URLs have a different origin, so they cannot see real `edustochia.com` browser saves. Save compatibility must also be covered by the automated smoke test and a controlled production-origin check after promotion.

## Promote the tested artifact

When the preview passes, promote that exact deployment rather than rebuilding:

```powershell
npx vercel promote <preview-deployment-url> --yes
```

This atomically changes the production alias. Do not run `vercel --prod --force`; rebuilding would create an artifact different from the one tested.

## Production check

Open `https://edustochia.com` in a staff-controlled browser profile that already has a valid save:

1. Confirm **Continue Game** is available.
2. Continue and verify resources, units, buildings, wave, difficulty, and camera position.
3. Reload once and verify the save still continues.
4. Test a new game only in a separate browser profile, because **New Game** intentionally replaces progress.
5. Inspect the active deployment and recent logs:

```powershell
npx vercel inspect edustochia.com
npx vercel logs edustochia.com
```

## Rollback

If production checks fail, immediately restore the previous deployment:

```powershell
npx vercel rollback --yes
```

Then verify `https://edustochia.com` again. Existing compatible browser saves remain in place. If the new build wrote a newer save schema, old code may not understand it; this release does not change `SAVE_VERSION` (still version 2), which avoids that rollback hazard.

## Classroom safety note

Before a future save-schema change, add an in-app export/import or server-side account sync. Until then there is no central backup of student progress, so keep schema migrations backward compatible and rehearse them with copied browser data before promotion.
