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
    process.stdout.write(`[server] ${chunk}`);
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
let step = 'start';
const mark = (name) => { step = name; };

try {
  const baseUrl = await Promise.race([
    preview.urlReady,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Preview URL timeout')), 60000)),
  ]);

  const desktopContext = await browser.newContext({ viewport: { width: 1672, height: 941 }, deviceScaleFactor: 1 });
  const desktop = await desktopContext.newPage();
  desktop.on('pageerror', (error) => errors.push(`desktop pageerror: ${error.message}`));
  desktop.on('console', (message) => {
    if (message.type() === 'error') errors.push(`desktop console:error: ${message.text()}`);
  });

  await desktop.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await desktop.waitForFunction(() => document.body.innerText.includes('VERSION 2'), null, { timeout: 60000 });
  await desktop.waitForLoadState('networkidle', { timeout: 60000 });

  results.desktopText = await desktop.evaluate(() => document.body.innerText);
  results.initialButtons = await desktop.getByRole('button').allTextContents();
  results.continueInitiallyAbsent = !results.initialButtons.some((text) => text.includes('Continue Campaign'));

  const stateBeforeEasy = await desktop.evaluate(() => {
    const raw = localStorage.getItem('schoolyard_save');
    return raw === null ? 'missing' : 'present';
  });
  results.stateBeforeEasy = stateBeforeEasy;

  await desktop.getByRole('button', { name: /New Game/ }).click();
  await desktop.waitForFunction(() => document.body.innerText.includes('Standard Australian public school experience'), null, { timeout: 10000 });
  results.difficultyButtons = await desktop.getByRole('button').allTextContents();
  const difficultyDom = await desktop.evaluate(() => Array.from(document.querySelectorAll('.menu-folder-options button')).map((b) => ({
    text: b.innerText,
    aria: b.getAttribute('aria-label'),
    disabled: b.disabled,
  })));
  results.difficultyDom = difficultyDom;
  mark('before-back');
  await desktop.getByRole('button', { name: /Back to menu/ }).click();
  mark('after-back-click');
  await desktop.waitForFunction(() => !document.body.innerText.includes('Standard Australian public school experience'), null, { timeout: 10000 });
  mark('after-back-wait');

  mark('before-new-game-2');
  await desktop.getByRole('button', { name: /New Game/ }).click();
  mark('after-new-game-2-click');
  await desktop.waitForFunction(() => document.body.innerText.includes('Standard Australian public school experience'), null, { timeout: 10000 });
  mark('after-difficulty-wait');
  await desktop.locator('.menu-folder-options .menu-row-button', { hasText: 'EASY' }).click();
  mark('after-easy-click');
  await desktop.waitForFunction(() => document.body.innerText.includes('Mission Briefing'), null, { timeout: 60000 });
  mark('after-briefing-wait');
  const easyState = await desktop.evaluate(() => {
    const engine = window.__schoolyardEngine;
    return {
      briefingVisible: document.body.innerText.includes('Mission Briefing'),
      menuGone: !document.body.innerText.includes('OVAL DEFENSE STRATEGY'),
      enginePresent: !!engine,
      difficulty: engine?.state.difficulty ?? null,
    };
  });
  results.easyState = easyState;

  await desktop.evaluate(() => {
    const engine = window.__schoolyardEngine;
    if (engine) engine.saveGame();
  });
  await desktop.evaluate(() => {
    const engine = window.__schoolyardEngine;
    if (engine) engine.saveGame();
  });
  mark('after-save');
  await desktop.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await desktop.waitForFunction(() => document.body.innerText.includes('VERSION 2'), null, { timeout: 60000 });
  results.continueButtonsWithSave = await desktop.getByRole('button').allTextContents();
  results.continueVisibleWithSave = results.continueButtonsWithSave.some((text) => text.includes('Continue Campaign'));

  await desktop.getByRole('button', { name: /Continue Campaign/ }).click();
  await desktop.waitForFunction(() => document.body.innerText.includes('Game Over') || document.querySelector('canvas.game-canvas'), null, { timeout: 60000 });
  results.continueState = await desktop.evaluate(() => ({
    gameCanvas: !!document.querySelector('canvas.game-canvas'),
    menuGone: !document.body.innerText.includes('OVAL DEFENSE STRATEGY'),
  }));

  await desktop.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await desktop.waitForFunction(() => document.body.innerText.includes('VERSION 2'), null, { timeout: 60000 });
  await desktop.waitForLoadState('networkidle', { timeout: 60000 });
  await desktop.getByRole('button', { name: /Sprite Debug Lab/ }).click();
  await desktop.waitForFunction(() => window.location.search.includes('spriteDebug'), null, { timeout: 10000 });
  await desktop.waitForLoadState('networkidle', { timeout: 60000 });
  results.spriteDebugReached = await desktop.evaluate(() => ({
    url: window.location.href,
    hasInspector: document.body.innerText.includes('Animation Inspector'),
  }));

  const focusContext = await browser.newContext({ viewport: { width: 1672, height: 941 }, deviceScaleFactor: 1 });
  const focusPage = await focusContext.newPage();
  await focusPage.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await focusPage.waitForFunction(() => document.body.innerText.includes('VERSION 2'), null, { timeout: 60000 });
  const focusProbe = await focusPage.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('.menu-row-button, .menu-page-control'));
    const disabled = buttons.filter((button) => button.disabled).length;
    const unfocusable = buttons.filter((button) => !button.disabled).length === 0 ? 0 : 0;
    const actionable = buttons.filter((button) => !button.disabled);
    let focusInherits = false;
    const first = actionable[0];
    first.focus();
    focusInherits = document.activeElement === first;
    return {
      rowButtons: buttons.length,
      disabled,
      unfocusable,
      focusInherits,
      activeClass: first.className,
    };
  });
  results.focusProbe = focusProbe;
  await focusPage.keyboard.press('Tab');
  results.tabMoved = await focusPage.evaluate(() => document.activeElement?.className ?? '');
  await focusPage.close();
  await focusContext.close();

  const captures = [
    { name: 'menu-desktop-1672x941.png', viewport: { width: 1672, height: 941 } },
    { name: 'menu-tablet-1024x768.png', viewport: { width: 1024, height: 768 } },
    { name: 'menu-mobile-390x844.png', viewport: { width: 390, height: 844 } },
  ];
  const artifactDir = path.join(rootDir, 'test-artifacts');
  results.capturePaths = {};
  for (const capture of captures) {
    await desktop.setViewportSize(capture.viewport);
    await desktop.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await desktop.waitForFunction(() => document.body.innerText.includes('VERSION 2'), null, { timeout: 60000 });
    await desktop.waitForTimeout(350);
    const target = path.join(artifactDir, capture.name);
    await desktop.screenshot({ path: target, fullPage: true });
    results.capturePaths[capture.name] = target;
    const layout = await desktop.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      docScrollHeight: document.documentElement.scrollHeight,
      menuButtons: Array.from(document.querySelectorAll('.menu-row-button, .menu-page-control')).map((b) => ({
        text: (b.innerText || '').trim().slice(0, 28),
        width: Math.round(b.getBoundingClientRect().width),
        height: Math.round(b.getBoundingClientRect().height),
        visible: Boolean(b.offsetWidth || b.offsetHeight || b.getClientRects().length),
      })),
    }));
    results[`layout_${capture.name}`] = layout;
  }

  if (errors.length) throw new Error(errors.join('\n'));
  fs.writeFileSync(path.join(rootDir, 'test-artifacts', 'menu-verify-results.json'), JSON.stringify(results, null, 2));
  console.log('Menu verification passed.');
} finally {
  results.finalStep = step;
  fs.writeFileSync(path.join(rootDir, 'test-artifacts', 'menu-verify-step-trace.json'), JSON.stringify(results, null, 2));
  await browser.close().catch(() => {});
  await preview.close().catch(() => {});
}
