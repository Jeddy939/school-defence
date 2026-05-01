#!/usr/bin/env node
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const ROOT = process.cwd();
const DEFAULT_PROFILE_DIR = path.join(ROOT, "generated", "chatgpt-browser-profile");
const DEFAULT_UNIT = "year-7";
const CHATGPT_URL = "https://chatgpt.com/";

const JOBS = {
  attack_back: {
    filename: "year7-attack-back",
    prompt: `Create a production-ready 2D pixel-art animation sprite sheet for an isometric RTS game.

CAMERA:
Camera is positioned from the SOUTH (RTS view).

DIRECTION RULES (STRICT):
- NORTH (row 1): full back view, no face visible, backpack fully visible and centered
- NORTH-EAST (row 2): back-right angle, mostly back visible, slight right turn, no clear face
- EAST (row 3): full right-side profile, only one eye visible, body sideways, backpack visible behind

If face is visible in NORTH -> incorrect
If body is not clearly angled in NE -> incorrect

---

CHARACTER:
Year 7 schoolkid game unit
- messy brown spiky hair
- white untucked school shirt
- navy shorts
- white socks
- sneakers
- oversized olive-green backpack
- chaotic, angry expression (only visible where appropriate)

---

STYLE:
- pixel-art RTS sprite
- late-90s pre-rendered look
- crisp readable pixels
- strong silhouette
- consistent proportions

---

BACKGROUND:
- solid bright chroma green (#00FF00)
- no checkerboard
- no gradients

---

LAYOUT:
- 3 rows total (top to bottom):
  NORTH, NORTH-EAST, EAST
- 3 columns:
  1. wind-up
  2. backpack swing impact with small spark
  3. recovery
- consistent spacing
- centered sprites
- fixed foot anchor

---

ANIMATION:
Non-graphic cartoon backpack swing animation
- frame 1: wind-up
- frame 2: swing with small impact spark
- frame 3: recovery

---

OUTPUT:
- one sprite sheet
- no text
- no UI
- directions must be correct`,
  },
  attack_front: {
    filename: "year7-attack-front",
    prompt: `Create a production-ready 2D pixel-art animation sprite sheet for an isometric RTS game.

CAMERA:
Camera is positioned from the SOUTH (RTS view).

DIRECTION RULES (STRICT):
- SOUTH-EAST (row 1): front-right angle, chest partially visible, right shoulder closer to camera, face slightly turned
- SOUTH (row 2): full front view, both eyes visible, shoulders symmetrical, backpack mostly hidden behind

If face is not visible in SOUTH -> incorrect
If SE looks side-on instead of angled -> incorrect

---

CHARACTER:
Year 7 schoolkid game unit
- messy brown spiky hair
- white untucked school shirt
- navy shorts
- white socks
- sneakers
- oversized olive-green backpack
- angry, chaotic expression

---

STYLE:
- pixel-art RTS sprite
- late-90s pre-rendered look
- crisp readable pixels
- strong silhouette
- consistent proportions

---

BACKGROUND:
- solid bright chroma green (#00FF00)
- no checkerboard
- no gradients

---

LAYOUT:
- 2 rows total (top to bottom):
  SOUTH-EAST, SOUTH
- 3 columns:
  1. wind-up
  2. backpack swing impact with small spark
  3. recovery
- consistent spacing
- centered sprites
- fixed foot anchor

---

ANIMATION:
Non-graphic cartoon backpack swing animation
- frame 1: wind-up
- frame 2: swing with small impact spark
- frame 3: recovery

---

OUTPUT:
- one sprite sheet
- no text
- no UI
- directions must be correct`,
  },
  portrait: {
    filename: "year7-portrait",
    prompt: `Create a production-ready 2D pixel-art portrait animation sprite sheet for an isometric RTS game.

CHARACTER:
Year 7 schoolkid game unit
- messy brown spiky hair
- white untucked school shirt collar visible
- oversized olive-green backpack straps visible near shoulders
- expressive, chaotic schoolyard attitude
- same character identity, palette, and proportions across every frame

---

STYLE:
- pixel-art RTS portrait
- late-90s pre-rendered look
- crisp readable pixels
- strong silhouette
- consistent head size and camera angle
- head-and-shoulders framing

---

BACKGROUND:
- solid bright chroma green (#00FF00)
- no checkerboard
- no gradients

---

LAYOUT:
- 4 rows total (top to bottom):
  1. IDLE, 4 frames
  2. TALK, 4 frames
  3. ANGRY, 4 frames
  4. HURT OR STARTLED, 2 frames
- frames in each row run left to right
- consistent spacing
- centered portraits
- no cropped hair, chin, or shoulders

---

ANIMATION:
- idle row: subtle blink and breathing variation
- talk row: mouth movement, same head angle
- angry row: stronger brows and yelling mouth, non-graphic
- hurt/startled row: recoiling expression, non-graphic

---

OUTPUT:
- one portrait sprite sheet
- no text
- no UI
- no speech bubbles
- consistent character`,
  },
};

function parseArgs(argv) {
  const args = {
    unit: DEFAULT_UNIT,
    jobs: null,
    promptDir: null,
    profileDir: DEFAULT_PROFILE_DIR,
    outputDir: null,
    timeoutMs: 10 * 60 * 1000,
    loginWaitMs: 15 * 60 * 1000,
    delayMs: 1500,
    pollSeconds: 2,
    stablePolls: 3,
    autoLoginWait: false,
    headless: false,
    keepOpen: false,
    cdpUrl: null,
    saveExisting: false,
    url: CHATGPT_URL,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    const next = () => argv[++index];

    if (value === "--jobs") args.jobs = next().split(",").map((item) => item.trim()).filter(Boolean);
    else if (value === "--unit") args.unit = next();
    else if (value === "--prompt-dir") args.promptDir = path.resolve(next());
    else if (value === "--profile-dir") args.profileDir = path.resolve(next());
    else if (value === "--output-dir") args.outputDir = path.resolve(next());
    else if (value === "--timeout-minutes") args.timeoutMs = Number(next()) * 60 * 1000;
    else if (value === "--login-wait-minutes") args.loginWaitMs = Number(next()) * 60 * 1000;
    else if (value === "--delay-seconds") args.delayMs = Number(next()) * 1000;
    else if (value === "--poll-seconds") args.pollSeconds = Number(next());
    else if (value === "--stable-polls") args.stablePolls = Number(next());
    else if (value === "--auto-login-wait") args.autoLoginWait = true;
    else if (value === "--headless") args.headless = true;
    else if (value === "--keep-open") args.keepOpen = true;
    else if (value === "--cdp-url") args.cdpUrl = next();
    else if (value === "--save-existing") args.saveExisting = true;
    else if (value === "--url") args.url = next();
    else if (value === "--list") args.list = true;
    else if (value === "--help" || value === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${value}`);
  }

  args.outputDir ??= path.join(ROOT, "generated", "chatgpt-sprites", args.unit, "raw");

  return args;
}

function printHelp() {
  console.log(`Usage:
  npm run chatgpt:sprites
  node scripts/chatgpt_sprite_browser_controller.mjs --jobs attack_back,attack_front,portrait
  node scripts/chatgpt_sprite_browser_controller.mjs --unit teacher-aide-rtspixel --prompt-dir prompts/sprites/teacher-aide

Options:
  --unit <name>             Unit/output folder name. Default: year-7
  --prompt-dir <path>       Load one job per .txt prompt file in this folder
  --jobs <csv>              Jobs to run. Default: all built-in or prompt-dir jobs
  --profile-dir <path>      Persistent browser profile. Default: generated/chatgpt-browser-profile
  --output-dir <path>       Image output directory. Default: generated/chatgpt-sprites/<unit>/raw
  --timeout-minutes <n>     Max wait per image. Default: 10
  --login-wait-minutes <n>  Max wait for you to log in. Default: 15
  --delay-seconds <n>       Delay between prompts. Default: 1.5
  --poll-seconds <n>        Seconds between image checks. Default: 2
  --stable-polls <n>        Matching image checks before saving. Default: 3
  --auto-login-wait         Poll for the message box instead of waiting for terminal input
  --cdp-url <url>           Attach to an existing Chrome remote debugging session
  --save-existing           Save existing large images instead of sending prompts
  --url <url>               ChatGPT URL to open. Default: https://chatgpt.com/
  --keep-open               Leave the browser open after completion
  --list                    List available jobs
`);
}

function jobNameFromPromptFile(fileName) {
  return path.basename(fileName, path.extname(fileName));
}

async function loadPromptDirJobs(promptDir) {
  const entries = await fs.readdir(promptDir, { withFileTypes: true });
  const promptFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".txt"))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (promptFiles.length === 0) {
    throw new Error(`No .txt prompt files found in ${promptDir}`);
  }

  const jobs = {};
  for (const file of promptFiles) {
    const promptPath = path.join(promptDir, file.name);
    const jobName = jobNameFromPromptFile(file.name);
    jobs[jobName] = {
      filename: jobName,
      prompt: (await fs.readFile(promptPath, "utf8")).trim(),
      promptPath,
    };
  }

  return jobs;
}

async function loadAvailableJobs(args) {
  if (args.promptDir) {
    return loadPromptDirJobs(args.promptDir);
  }

  return JOBS;
}

function selectedJobNames(args, availableJobs) {
  const names = args.jobs ?? Object.keys(availableJobs);

  for (const jobName of names) {
    if (!availableJobs[jobName]) {
      throw new Error(`Unknown job "${jobName}". Valid jobs: ${Object.keys(availableJobs).join(", ")}`);
    }
  }

  return names;
}

async function waitForEnter(message) {
  const rl = readline.createInterface({ input, output });
  try {
    await rl.question(message);
  } finally {
    rl.close();
  }
}

function timestamp() {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

async function getPromptBox(page, timeout = 15000) {
  const selectors = [
    'textarea[data-testid="prompt-textarea"]',
    "textarea#prompt-textarea",
    'div#prompt-textarea[contenteditable="true"]',
    '[contenteditable="true"][data-testid="prompt-textarea"]',
    'textarea[placeholder*="Message"]',
    '[contenteditable="true"]',
  ];

  const start = Date.now();
  while (Date.now() - start < timeout) {
    for (const selector of selectors) {
      const locator = page.locator(selector).last();
      if ((await locator.count()) === 0) continue;
      if (await locator.isVisible().catch(() => false)) return locator;
    }
    await page.waitForTimeout(500);
  }

  return null;
}

async function ensureChatReady(page, args) {
  let promptBox = await getPromptBox(page, 12000);
  if (promptBox) return promptBox;

  console.log("ChatGPT is not ready yet. Log in or clear any popups in the browser window.");
  if (args.autoLoginWait) {
    const start = Date.now();
    while (Date.now() - start < args.loginWaitMs) {
      promptBox = await getPromptBox(page, 5000);
      if (promptBox) return promptBox;
      await page.waitForTimeout(2000);
    }
    throw new Error(`Could not find the ChatGPT message box after ${Math.round(args.loginWaitMs / 60000)} minutes.`);
  }

  await waitForEnter("Press Enter here once the ChatGPT message box is visible...");

  promptBox = await getPromptBox(page, 60000);
  if (!promptBox) {
    throw new Error("Could not find the ChatGPT message box.");
  }

  return promptBox;
}

async function largeImages(page) {
  return page.evaluate(() => {
    return Array.from(document.images)
      .map((img, index) => {
        const rect = img.getBoundingClientRect();
        const src = img.currentSrc || img.src;
        return {
          index,
          src,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          renderedWidth: rect.width,
          renderedHeight: rect.height,
          complete: img.complete,
          visible:
            rect.width >= 128 &&
            rect.height >= 128 &&
            rect.bottom >= 0 &&
            rect.right >= 0 &&
            rect.top <= window.innerHeight &&
            rect.left <= window.innerWidth,
        };
      })
      .filter((item) => {
        if (!item.src) return false;
        if (!item.complete) return false;
        if (item.naturalWidth < 512 || item.naturalHeight < 512) return false;
        return item.renderedWidth >= 128 && item.renderedHeight >= 128;
      });
  });
}

async function waitForNewImage(page, beforeSources, timeoutMs, pollMs, stablePolls) {
  const start = Date.now();
  let candidate = null;
  let stableCount = 0;

  while (Date.now() - start < timeoutMs) {
    const images = await largeImages(page);
    const newest = images.reverse().find((image) => !beforeSources.has(image.src));

    if (newest?.src && newest.src === candidate?.src) {
      stableCount += 1;
    } else {
      candidate = newest ?? null;
      stableCount = candidate ? 1 : 0;
    }

    if (candidate && stableCount >= stablePolls) {
      return candidate;
    }

    await page.waitForTimeout(pollMs);
  }

  throw new Error(`Timed out after ${Math.round(timeoutMs / 60000)} minutes waiting for a generated image.`);
}

async function setPrompt(locator, prompt) {
  await locator.click();
  await locator.fill("");
  await locator.fill(prompt);
}

async function submitPrompt(page) {
  const sendSelectors = [
    'button[data-testid="send-button"]',
    'button[aria-label="Send message"]',
    'button[aria-label="Send prompt"]',
    'button[aria-label*="Send"]',
  ];

  for (const selector of sendSelectors) {
    const button = page.locator(selector).last();
    if ((await button.count()) === 0) continue;
    if (!(await button.isVisible().catch(() => false))) continue;
    if (!(await button.isEnabled().catch(() => false))) continue;
    await button.click();
    return;
  }

  await page.keyboard.press("Enter");
}

async function fetchImageBytes(page, image) {
  return page.evaluate(async (src) => {
    const response = await fetch(src);
    if (!response.ok) {
      throw new Error(`Image fetch failed: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }

    return {
      base64: btoa(binary),
      contentType: blob.type || response.headers.get("content-type") || "image/png",
    };
  }, image.src);
}

function extensionFor(contentType) {
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  return "png";
}

async function saveGeneratedImage(page, image, jobName, job, runStamp, outputDir) {
  const data = await fetchImageBytes(page, image);
  const extension = extensionFor(data.contentType);
  const bytes = Buffer.from(data.base64, "base64");
  const outputPath = path.join(outputDir, `${job.filename}-${runStamp}.${extension}`);
  const latestPath = path.join(outputDir, `latest-${jobName}.${extension}`);
  const metadataPath = path.join(outputDir, `${job.filename}-${runStamp}.json`);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, bytes);
  await fs.copyFile(outputPath, latestPath);
  await fs.writeFile(
    metadataPath,
    JSON.stringify(
      {
        job: jobName,
        outputPath,
        latestPath,
        promptPath: job.promptPath ?? null,
        contentType: data.contentType,
        image: {
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          renderedWidth: image.renderedWidth,
          renderedHeight: image.renderedHeight,
        },
      },
      null,
      2,
    ),
  );

  return outputPath;
}

async function runJob(page, jobName, job, args, runStamp) {
  console.log(`\n[${jobName}] Waiting for ChatGPT input...`);
  const promptBox = await ensureChatReady(page, args);
  const beforeImages = await largeImages(page);
  const beforeSources = new Set(beforeImages.map((image) => image.src));

  console.log(`[${jobName}] Sending prompt...`);
  await setPrompt(promptBox, job.prompt);
  await submitPrompt(page);

  console.log(`[${jobName}] Waiting for generated image...`);
  const image = await waitForNewImage(page, beforeSources, args.timeoutMs, args.pollSeconds * 1000, args.stablePolls);
  const outputPath = await saveGeneratedImage(page, image, jobName, job, runStamp, args.outputDir);
  console.log(`[${jobName}] Saved ${outputPath}`);
}

async function saveExistingImages(page, jobsToRun, availableJobs, args, runStamp) {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);
  const images = await largeImages(page);
  const selectedImages = images.slice(-jobsToRun.length);
  if (selectedImages.length < jobsToRun.length) {
    throw new Error(`Found ${selectedImages.length} large image(s), but ${jobsToRun.length} job(s) were requested.`);
  }

  for (let index = 0; index < jobsToRun.length; index += 1) {
    const jobName = jobsToRun[index];
    const image = selectedImages[index];
    const outputPath = await saveGeneratedImage(page, image, jobName, availableJobs[jobName], runStamp, args.outputDir);
    console.log(`[${jobName}] Saved existing image ${outputPath}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const availableJobs = await loadAvailableJobs(args);
  const jobsToRun = selectedJobNames(args, availableJobs);

  if (args.list) {
    console.log(Object.keys(availableJobs).join("\n"));
    return;
  }

  await fs.mkdir(args.profileDir, { recursive: true });
  await fs.mkdir(args.outputDir, { recursive: true });

  let context;
  let browser = null;
  let shouldCloseContext = true;
  if (args.cdpUrl) {
    browser = await chromium.connectOverCDP(args.cdpUrl);
    context = browser.contexts()[0];
    if (!context) {
      throw new Error(`Connected to ${args.cdpUrl}, but no Chrome browser context was available.`);
    }
    shouldCloseContext = false;
  } else {
    context = await chromium.launchPersistentContext(args.profileDir, {
      acceptDownloads: true,
      headless: args.headless,
      viewport: { width: 1440, height: 1100 },
    });
  }

  const existingPages = context.pages();
  const chatPage = existingPages.find((candidate) => candidate.url().includes("chatgpt.com"));
  const page = chatPage ?? existingPages[0] ?? (await context.newPage());
  page.setDefaultTimeout(30000);
  if (!page.url().includes("chatgpt.com")) {
    await page.goto(args.url, { waitUntil: "domcontentloaded" });
  }

  const runStamp = timestamp();
  if (args.saveExisting) {
    await saveExistingImages(page, jobsToRun, availableJobs, args, runStamp);
  } else {
    for (const jobName of jobsToRun) {
      await runJob(page, jobName, availableJobs[jobName], args, runStamp);
      if (args.delayMs > 0) {
        await page.waitForTimeout(args.delayMs);
      }
    }
  }

  console.log(`\nCompleted ${jobsToRun.length} job(s). Output: ${args.outputDir}`);

  if (args.keepOpen) {
    await waitForEnter("Press Enter to close the browser...");
  }

  if (shouldCloseContext) {
    await context.close();
  } else {
    console.log("Detached from existing Chrome session.");
    process.exit(0);
  }
}

main().catch((error) => {
  console.error(`\n${error.stack || error.message}`);
  process.exitCode = 1;
});
