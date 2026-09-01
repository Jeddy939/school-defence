# Agentic ChatGPT Sprite Generation Workflow

This runbook reproduces the browser-controlled workflow used to generate missing
sprite sheets through the ChatGPT web app. It assumes the prompt files already
exist under `prompts/sprites/animation-set/<unit>` and that each prompt file name
matches the output job name, for example `attack-north.txt` writes
`latest-attack-north.png`.

## 1. Start Chrome For Agent Control

Use normal Chrome with a persistent debug profile. This avoids Playwright's
fresh-browser verification blocks and lets you log in manually once.

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\ChromeDebug" https://chatgpt.com/
```

Log in to ChatGPT in that Chrome window. Leave the window open.

Check that the agent can attach:

```powershell
try {
  (Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:9222/json/version' -TimeoutSec 5).StatusCode
} catch {
  $_.Exception.Message
}
```

Expected result: `200`.

## 2. Find Missing Sprite Jobs

Before every run, calculate missing outputs from disk. Do not trust memory or
the last chat message.

```powershell
@'
from pathlib import Path

root = Path(r'D:\jmbow1\Desktop\game projects\schoolyard defence')
prompt_root = root / 'prompts' / 'sprites' / 'animation-set'
gen_root = root / 'generated' / 'chatgpt-sprites'
unit_map = {'teacher-aide': 'teacher-aide-rtspixel'}

missing_any = False
for unit_dir in sorted([p for p in prompt_root.iterdir() if p.is_dir()]):
    unit = unit_dir.name
    out_unit = unit_map.get(unit, unit)
    raw = gen_root / out_unit / 'raw'
    prompts = sorted(p.stem for p in unit_dir.glob('*.txt'))
    present = [job for job in prompts if (raw / f'latest-{job}.png').exists()]
    missing = [job for job in prompts if job not in present]
    if missing:
        missing_any = True
        print(f'{unit}\t{len(present)}/{len(prompts)} present\tmissing: {", ".join(missing)}')

if not missing_any:
    print('No missing latest-<job>.png files for prompts/sprites/animation-set units.')
'@ | python -
```

Pick the first missing unit and start at its first missing job.

## 3. Ensure No Controller Is Already Running

Only run one sprite controller against ChatGPT at a time.

```powershell
Get-CimInstance Win32_Process |
  Where-Object {
    $_.CommandLine -match 'chatgpt_sprite_browser_controller|chatgpt:sprites' -and
    $_.ProcessId -ne $PID
  } |
  Select-Object ProcessId,Name,CommandLine |
  Format-List
```

If a stale controller is polling a blocked or closed page, stop it:

```powershell
$procs = Get-CimInstance Win32_Process |
  Where-Object {
    $_.CommandLine -match 'chatgpt_sprite_browser_controller|chatgpt:sprites' -and
    $_.ProcessId -ne $PID
  }

foreach ($p in $procs) {
  $proc = Get-Process -Id $p.ProcessId -ErrorAction SilentlyContinue
  if ($proc) { Stop-Process -Id $p.ProcessId -Force }
}
```

## 4. Reset ChatGPT To A Fresh Page

Fresh chats reduce stuck image elements and old-image detection problems.

```powershell
@'
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page =
    context.pages().find((p) => p.url().includes('chatgpt.com')) ||
    context.pages()[0] ||
    await context.newPage();

  await page.goto('https://chatgpt.com/', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForTimeout(2000);
  console.log('Reset page:', page.url());
  await browser.close();
})();
'@ | node -
```

## 5. Launch A Batch

Use slow polling and a delay between prompts. These settings are less noisy and
make it easier to catch rate limits.

Example for one unit:

```powershell
$unit = 'tuckshop-lady'
$promptDir = "prompts/sprites/animation-set/$unit"
$jobs = 'attack-south,death-north,death-south,idle-north,idle-south,portrait,walk-north,walk-south'

$logDir = 'D:\jmbow1\Desktop\game projects\schoolyard defence\generated\chatgpt-runlogs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$out = Join-Path $logDir "$unit-$stamp.out.log"
$err = Join-Path $logDir "$unit-$stamp.err.log"

$args = @(
  'run', 'chatgpt:sprites', '--',
  '--unit', $unit,
  '--prompt-dir', $promptDir,
  '--jobs', $jobs,
  '--cdp-url', 'http://127.0.0.1:9222',
  '--auto-login-wait',
  '--timeout-minutes', '20',
  '--login-wait-minutes', '5',
  '--poll-seconds', '8',
  '--stable-polls', '2',
  '--delay-seconds', '20'
)

$proc = Start-Process `
  -FilePath 'npm.cmd' `
  -ArgumentList $args `
  -WorkingDirectory 'D:\jmbow1\Desktop\game projects\schoolyard defence' `
  -RedirectStandardOutput $out `
  -RedirectStandardError $err `
  -WindowStyle Hidden `
  -PassThru

[PSCustomObject]@{
  ProcessId = $proc.Id
  OutLog = $out
  ErrLog = $err
} | Format-List
```

For `teacher-aide`, use the output unit name `teacher-aide-rtspixel` but the
prompt directory `prompts/sprites/animation-set/teacher-aide`:

```powershell
--unit teacher-aide-rtspixel --prompt-dir prompts/sprites/animation-set/teacher-aide
```

## 6. Monitor The Run

Poll saved files and the current log every few minutes.

```powershell
$unit = 'tuckshop-lady'

Get-ChildItem "generated/chatgpt-sprites/$unit/raw" -Filter 'latest-*.png' -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 12 Name,Length,LastWriteTime |
  Format-Table -AutoSize

Get-ChildItem generated/chatgpt-runlogs -Filter "$unit-*.out.log" |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1 |
  ForEach-Object { Get-Content -Path $_.FullName -Tail 120 }

Get-ChildItem generated/chatgpt-runlogs -Filter "$unit-*.err.log" |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1 |
  ForEach-Object {
    if ((Get-Item $_.FullName).Length -gt 0) {
      Get-Content -Path $_.FullName -Tail 80
    } else {
      'stderr empty'
    }
  }
```

The controller is healthy when the log moves through:

```text
[job] Waiting for ChatGPT input...
[job] Sending prompt...
[job] Waiting for generated image...
[job] Saved ...
```

## 7. Handle Limits

If the ChatGPT page says the image limit has been reached, inspect the page and
record the retry time.

```powershell
@'
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = context.pages().find((p) => p.url().includes('chatgpt.com')) || context.pages()[0];

  const state = await page.evaluate(() => {
    const text = document.body.innerText || '';
    return text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => /limit|retry|try again|reached|hour|minute/i.test(line))
      .slice(-40);
  });

  console.log(state.join('\n'));
  await browser.close();
})();
'@ | node -
```

Then stop the controller. Resume later from the first missing job shown by the
missing-file scan.

## 8. Handle Stuck Or Closed Pages

If a job waits too long and no new `latest-<job>.png` appears, inspect the page.
A common stuck state is a generated image element with `naturalWidth: 0`, which
means ChatGPT created an image placeholder that never finished loading.

Stop the controller, reset ChatGPT to a fresh page, and rerun from that job only.

If stderr says:

```text
page.waitForTimeout: Target page, context or browser has been closed
```

Chrome CDP closed. Restart Chrome with the remote-debugging command in step 1,
verify status `200`, reset ChatGPT, and resume from the first missing job.

## 9. Save Manually Generated Images

If a human generated an image in ChatGPT manually, save the visible large image
into the expected job slot with `--save-existing`.

Example:

```powershell
npm run chatgpt:sprites -- `
  --unit eshay `
  --prompt-dir prompts/sprites/animation-set/eshay `
  --jobs death-south `
  --cdp-url http://127.0.0.1:9222 `
  --save-existing
```

Use this only when the visible ChatGPT image is definitely the requested job.

## 10. Finish Criteria

The generation phase is complete when this prints no missing jobs:

```powershell
@'
from pathlib import Path

root = Path(r'D:\jmbow1\Desktop\game projects\schoolyard defence')
prompt_root = root / 'prompts' / 'sprites' / 'animation-set'
gen_root = root / 'generated' / 'chatgpt-sprites'
unit_map = {'teacher-aide': 'teacher-aide-rtspixel'}

missing_any = False
for unit_dir in sorted([p for p in prompt_root.iterdir() if p.is_dir()]):
    unit = unit_dir.name
    out_unit = unit_map.get(unit, unit)
    raw = gen_root / out_unit / 'raw'
    prompts = sorted(p.stem for p in unit_dir.glob('*.txt'))
    present = [job for job in prompts if (raw / f'latest-{job}.png').exists()]
    missing = [job for job in prompts if job not in present]
    if missing:
        missing_any = True
        print(f'{unit}\t{len(present)}/{len(prompts)} present\tmissing: {", ".join(missing)}')

if not missing_any:
    print('No missing latest-<job>.png files for prompts/sprites/animation-set units.')
'@ | python -
```

Also confirm no controller is still running:

```powershell
Get-CimInstance Win32_Process |
  Where-Object {
    $_.CommandLine -match 'chatgpt_sprite_browser_controller|chatgpt:sprites' -and
    $_.ProcessId -ne $PID
  } |
  Select-Object ProcessId,Name,CommandLine |
  Format-List
```

## 11. Extract, QA, And Add To Game

Generation only creates raw sheets. To stage and import a unit:

```powershell
npm run sprites:extract -- --unit <unit>
npm run sprites:check -- --unit <unit>
npm run sprites:add -- --unit <unit>
```

For `teacher-aide`, use:

```powershell
npm run sprites:extract -- --unit teacher-aide-rtspixel
npm run sprites:check -- --unit teacher-aide-rtspixel
npm run sprites:add -- --unit teacher-aide-rtspixel
```

Review the generated QA contact sheets before `sprites:add`. Use
`--allow-unapproved` only after manually accepting any QA flags.

## Agent Rules

- Scan disk before starting and after every interruption.
- Run one controller at a time.
- Prefer smaller resume batches over rerunning a full unit.
- Use fresh ChatGPT chats between units or after any stuck image.
- Stop immediately on visible Plus image limits.
- Resume from the first missing `latest-<job>.png`, not from the last prompt sent.
- Do not wire raw generated sheets into `game/Renderer.ts`; extract and QA them
  first.
