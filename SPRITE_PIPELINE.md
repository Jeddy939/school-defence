# Sprite Pipeline

Generated sprite sheets are inconsistent. Do not wire a new sprite directly into
`game/Renderer.ts` until it has passed this process.

## Required Steps

1. Extract frames into `public/sprites/<unit-name>`.
2. Run:

   ```powershell
   python scripts\audit_sprite_assets.py
   ```

3. Open the generated contact sheets in `generated/sprite-audit/<unit-name>`.
4. Check every animation row manually:
   - The action matches the folder name.
   - The direction matches the folder name.
   - The character is not clipped at the top, left, or right.
   - The frame does not include body parts or props from neighboring cells.
   - The baseline feels stable across the animation.
   - Mirrored directions are only used when the pose still reads correctly.
5. Check `generated/sprite-audit/sprite-audit-report.json` for flags:
   - `content-touches-side-or-top-edge` means the frame is probably too tightly
     cropped or scaled.
   - `multiple-large-components` means there may be a stray sprite part, or a
     valid separated prop that needs manual approval.
   - `empty-frame` means extraction failed.
6. Only after visual approval should the renderer preload and draw that sprite
   set.

## Sprite Agents

Use these three agents when new generated sheets land in the sprite library:

```powershell
npm run sprites:extract -- --unit teacher-aide-rtspixel
npm run sprites:check -- --unit teacher-aide-rtspixel
npm run sprites:add -- --unit teacher-aide-rtspixel
```

`sprites:extract` scans `generated/chatgpt-sprites/<unit>/raw` and
`generated/openai-sprites/<unit>/raw`, removes chroma-green backgrounds, cuts
known north/south sheet layouts, normalizes frame anchors, and writes staging
frames under `generated/extracted-sprites/<unit>`. It does not touch the game.

`sprites:check` audits the staged frames, writes contact sheets under
`generated/sprite-qa/<unit>`, and blocks game import if it finds visible green,
thin sliced frames, edge clipping, or likely neighboring-cell fragments.

`sprites:add` only copies QA-approved staged frames into `public/sprites/<unit>`
and then runs the normal game sprite audit. Use `--allow-unapproved` only when
you have manually inspected the QA contact sheets and accepted the flags.

## Current Rule

If an AI sheet does not keep directions consistent, create or update the
extractor so the direction mapping is explicit for that sheet. Do not assume row
1 is south, row 2 is south-east, etc. unless the contact sheet confirms it.

## Automated OpenAI Source Generation

Use the API-driven generator instead of browser-controlling ChatGPT:

```powershell
python scripts\generate_year7_sprite_sources.py --dry-run
python scripts\generate_year7_sprite_sources.py --jobs attack_back attack_front portrait
```

Set `OPENAI_API_KEY` in the shell or `.env.local` first. The generator saves raw
outputs under `generated/openai-sprites/year-7/raw`, writes the exact prompts
under `generated/openai-sprites/year-7/prompts`, normalizes border-connected
green-screen pixels to `#00FF00`, and composes the two Year 7 attack sheets into
a five-row source sheet ordered as `S, SE, E, NE, N`.

The generated source still must pass extraction and audit before renderer use.

## Browser-Controlled ChatGPT Generation

If using the ChatGPT web app instead of the API, run the Playwright controller:

```powershell
npm run chatgpt:sprites
```

On the first run, log into ChatGPT in the browser window that opens, then press
Enter in the terminal when the message box is visible. The controller sends the
three built-in Year 7 prompts sequentially, waits for a new large generated
image after each prompt, and saves the image bytes to:

`generated/chatgpt-sprites/year-7/raw`

It also writes `latest-attack_back.<ext>`, `latest-attack_front.<ext>`, and
`latest-portrait.<ext>` in that folder so the newest outputs are easy to find.
The login profile is stored under `generated/chatgpt-browser-profile`.

For prompt files, put one prompt in each `.txt` file and run with a unit plus a
prompt directory. For example, Teacher's Aide prompts live in
`prompts/sprites/teacher-aide`:

```powershell
npm run chatgpt:sprites -- --unit teacher-aide-rtspixel --prompt-dir prompts/sprites/teacher-aide
python scripts\extract_teacher_aide_prompt_sheets.py
python scripts\audit_sprite_assets.py
```

If Playwright's own browser gets blocked by ChatGPT verification, start normal
Chrome yourself with remote debugging and attach to it:

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\ChromeDebug"
npm run chatgpt:sprites -- --unit teacher-aide-rtspixel --prompt-dir prompts/sprites/teacher-aide --cdp-url http://127.0.0.1:9222 --auto-login-wait
```

The `--unit` value controls the generated output folder, not the renderer by
itself. Runtime assignment still happens through the extractor writing frames
into the folder the renderer already uses, such as
`public/sprites/teacher-aide-rtspixel`.

## Visual Review Rule

The best process is hybrid, not AI-only:

1. Automated audit rejects obvious problems.
2. Contact sheets are reviewed visually by Codex or a human.
3. Runtime screenshots confirm scale, health-bar placement, and camera-edge
   clipping.

AI visual inspection is useful for catching wrong directions, clipped heads, and
neighboring-frame artifacts, but it should not be the only gate. The deterministic
audit catches repeatable pixel-level problems; the visual pass catches semantic
problems such as "this is facing the wrong way" or "this action reads badly".

For each new unit, inspect:

- `generated/sprite-audit/<unit>/idle__*.png`
- `generated/sprite-audit/<unit>/walk__*.png`
- `generated/sprite-audit/<unit>/attack__*.png`
- an in-game screenshot with the unit selected, damaged, and moving in each
  diagonal direction

## Prompt Rule For Future Sheets

Ask for one action per sheet, five rows exactly in this order:

`S, SE, E, NE, N`

Ask for equal-size cells, wide spacing, true transparent PNG, no checkerboard,
no labels, no cropped heads, and no neighboring-frame overlap.
