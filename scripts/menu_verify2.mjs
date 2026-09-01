import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';
import fs from 'node:fs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const viteBin = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');
const nodeCmd = process.execPath;

const startPreview = () => {
  let resolvedUrl = '';
  let resolveUrl;
  const urlReady = new Promise((resolve) => { resolveUrl = resolve; });
  const child = spawn(nodeCmd, [viteBin, 'preview', '--host', '127.0.0.1', '--port', '0', '--strictPort'], {
    cwd: rootDir,
    env: { ...process.env, FORCE_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  const handleChunk = (chunk) => {
    const match = String(chunk).match(/http:\/\/127\.0\.0\.1:(\d+)\//);
    if (match && !resolvedUrl) {
      resolvedUrl = `http://127.0.0.1:${match[1]}`;
      resolveUrl(resolvedUrl);
    }
  };
  child.stdout.on('data', handleChunk);
  child.stderr.on('data', handleChunk);
  const close = () => new Promise((resolve) => {
    if (child.exitCode !== null) return resolve();
    child.once('close', resolve);
    child.kill('SIGTERM');
  });
  return { urlReady, close };
};

const preview = startPreview();
const browser = await chromium.launch({ headless: true });
const errors = [];
const results = {};

try {
  const baseUrl = await Promise.race([
    preview.urlReady,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Preview URL timeout')), 60000)),
  ]);
  const context = await browser.newContext({ viewport: { width: 1672, height: 941 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console:error: ${message.text()}`);
  });

  const openMenu = async (viewport) => {
    await page.setViewportSize(viewport);
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.body.innerText.includes('VERSION 2'), null, { timeout: 30000 });
    await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.war-room-content')).opacity) === 1, null, { timeout: 30000 });
  };

  await openMenu({ width: 1672, height: 941 });
  results.menuBodyText = await page.evaluate(() => document.body.innerText);
  results.initialButtons = await page.getByRole('button').allTextContents();
  results.continueAbsentAtStart = !results.initialButtons.some((t) => t.includes('Continue Campaign'));
  results.consoleErrorsInitial = errors.slice();

  // Command brief is control-mode sensitive: desktop shows mouse text.
  results.mouseBriefShown = results.menuBodyText.includes('left click to select');

  // New Game -> difficulty -> back.
  await page.getByRole('button', { name: /New Game/ }).click();
  await page.waitForFunction(() => document.body.innerText.includes('Standard Australian public school experience'), null, { timeout: 10000 });
  results.difficultyButtons = await page.getByRole('button').allTextContents();
  await page.getByRole('button', { name: /Back to menu/ }).click();
  await page.waitForFunction(() => !document.body.innerText.includes('Standard Australian public school experience'), null, { timeout: 10000 });
  results.backWorked = true;

  // New Game -> Easy starts briefing.
  await page.getByRole('button', { name: /New Game/ }).click();
  await page.waitForFunction(() => document.body.innerText.includes('Standard Australian public school experience'), null, { timeout: 10000 });
  await page.locator('.menu-folder-options .menu-row-button', { hasText: 'EASY' }).first().click();
  const briefSeen = await page.waitForFunction(() => document.body.innerText.includes('Mission Briefing'), null, { timeout: 2000 }).then(() => true).catch(() => false);
  results.easyState = await page.evaluate(() => ({
    briefing: document.body.innerText.includes('Mission Briefing'),
    menuGone: !document.body.innerText.includes('OVAL DEFENSE STRATEGY'),
    canvas: !!document.querySelector('canvas.game-canvas'),
    bodySample: document.body.innerText.slice(0, 200),
  }));
  results.briefSeen = briefSeen;
  if (!results.easyState.briefing && !results.easyState.canvas) {
    throw new Error(`Easy click did not start the game; seen=${briefSeen}`);
  }

  // Continue appears only after a save exists.
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.innerText.includes('VERSION 2'), null, { timeout: 30000 });
  results.continueAbsentWithoutSave = !(await page.getByRole('button').allTextContents()).some((t) => t.includes('Continue Campaign'));
  const saved = await page.evaluate(() => {
    try {
      localStorage.setItem('schoolyard_save', JSON.stringify({
        version: 2,
        entities: [{ id: 1, type: 'STAFFROOM', faction: 'FACULTY', hp: 100 }],
        state: { resources: { grants: 150, curriculum: 0 }, wave: 0, nextWaveTime: 90, gameOver: false, victory: false, upgrades: [], difficulty: 'NORMAL', settings: { edgePanning: false } },
      }));
      return true;
    } catch {
      return false;
    }
  });
  results.saveInjected = saved;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.innerText.includes('VERSION 2'), null, { timeout: 30000 });
  results.continueButtonsWithSave = await page.getByRole('button').allTextContents();
  results.continueVisibleWithSave = results.continueButtonsWithSave.some((t) => t.includes('Continue Campaign'));
  await page.getByRole('button', { name: /Continue Campaign/ }).click();
  const continueState = await page.evaluate(() => ({
    canvas: !!document.querySelector('canvas.game-canvas'),
    menuGone: !document.body.innerText.includes('OVAL DEFENSE STRATEGY'),
    loadSuccessful: !!window.__schoolyardEngine,
  }));
  results.continueState = continueState;

  // Sprite Debug entry.
  await page.goto(`${baseUrl}?spriteDebug=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  results.spriteDebugDirect = await page.evaluate(() => ({
    inspector: document.body.innerText.includes('Animation Inspector'),
    search: window.location.search,
  }));

  // Focus probe on fresh menu.
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.innerText.includes('VERSION 2'), null, { timeout: 30000 });
  results.focusProbe = await page.evaluate(() => {
    const actionable = Array.from(document.querySelectorAll('.menu-row-button, .menu-page-control')).filter((b) => !b.disabled);
    const first = actionable[0];
    first.focus();
    return {
      focused: document.activeElement === first,
      focusVisible: getComputedStyle(first).outlineStyle !== 'none',
      actionableCount: actionable.length,
    };
  });

  const captures = [
    ['menu-desktop-1672x941.png', { width: 1672, height: 941 }],
    ['menu-tablet-1024x768.png', { width: 1024, height: 768 }],
    ['menu-mobile-390x844.png', { width: 390, height: 844 }],
  ];
  results.captures = {};
  for (const [name, viewport] of captures) {
    await openMenu(viewport);
    const target = path.join(rootDir, 'test-artifacts', name);
    await page.screenshot({ path: target, fullPage: true });
    results.captures[name] = await page.evaluate(({ targetPath }) => ({
      path: targetPath,
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      visibleButtons: Array.from(document.querySelectorAll('.menu-row-button, .menu-page-control')).filter((b) => b.offsetWidth || b.offsetHeight).map((b) => b.innerText.trim().split('\n')[0]),
      backdropLoaded: (() => {
        const img = document.querySelector('img.war-room-backdrop');
        return img ? img.complete && img.naturalWidth > 0 : false;
      })(),
    }), { targetPath: target, width: viewport.width, height: viewport.height });
  }

  if (errors.length) throw new Error(errors.join('\n'));
  fs.writeFileSync(path.join(rootDir, 'test-artifacts', 'menu-verify-results.json'), JSON.stringify(results, null, 2));
  console.log('Menu verification passed.');
} finally {
  fs.writeFileSync(path.join(rootDir, 'test-artifacts', 'menu-verify-results.json'), JSON.stringify(results, null, 2));
  await browser.close().catch(() => {});
  await preview.close().catch(() => {});
}
