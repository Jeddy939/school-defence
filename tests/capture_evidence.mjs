import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

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

const startNormalGame = async (page, baseUrl) => {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.innerText.includes('VERSION 2'), null, { timeout: 60000 });
  await page.waitForFunction(() => typeof window.__schoolyardStartNormal === 'function', null, { timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 60000 });
  await page.evaluate(() => window.__schoolyardStartNormal());
  await page.locator('canvas.game-canvas').waitFor({ state: 'visible', timeout: 60000 });
  await page.waitForTimeout(900);
};

const preview = startPreview();
const browser = await chromium.launch({ headless: true });
const errors = [];

try {
  const baseUrl = await Promise.race([
    preview.urlReady,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Preview URL timeout')), 60000)),
  ]);

  const context = await browser.newContext({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console:error: ${message.text()}`);
  });

  await startNormalGame(page, baseUrl);
  await page.screenshot({ path: path.join(rootDir, 'test-artifacts', 'v2-damox-desktop.png'), fullPage: true });

  await page.evaluate(() => {
    const engine = window.__schoolyardEngine;
    engine.zoom = 0.55;
    engine.panOffset = { x: 40, y: 60 };
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(rootDir, 'test-artifacts', 'v2-damox-boundary.png'), fullPage: true });

  await page.evaluate(() => {
    const engine = window.__schoolyardEngine;
    engine.zoom = 1;
    engine.centerViewOnStaffroom();
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(rootDir, 'test-artifacts', 'v2-damox-mobile.png'), fullPage: true });

  const fenceEvidence = await page.evaluate(() => {
    const engine = window.__schoolyardEngine;
    const canvas = document.querySelector('canvas.game-canvas');
    const ctx = canvas.getContext('2d');
    const ratio = canvas.width / 800;
    const mapW = 800;
    const mapH = 600;
    const edgeStarts = [
      { x: mapW * 0.25, y: 0 },
      { x: mapW * 0.75, y: 0 },
      { x: mapW * 0.25, y: mapH },
      { x: mapW * 0.75, y: mapH },
      { x: 0, y: mapH * 0.25 },
      { x: 0, y: mapH * 0.75 },
      { x: mapW, y: mapH * 0.25 },
      { x: mapW, y: mapH * 0.75 },
    ];
    const outsideStarts = [
      { x: mapW * 0.25, y: -40 },
      { x: mapW * 0.75, y: -40 },
      { x: mapW * 0.25, y: mapH + 40 },
      { x: mapW * 0.75, y: mapH + 40 },
      { x: -40, y: mapH * 0.25 },
      { x: -40, y: mapH * 0.75 },
      { x: mapW + 40, y: mapH * 0.25 },
      { x: mapW + 40, y: mapH * 0.75 },
    ];
    const read = (wx, wy) => {
      const s = engine.worldToScreen(wx, wy);
      const p = ctx.getImageData(
        Math.max(0, Math.min(canvas.width - 1, Math.round(s.x * ratio))),
        Math.max(0, Math.min(canvas.height - 1, Math.round(s.y * ratio))),
        1,
        1
      ).data;
      return [p[0], p[1], p[2]];
    };
    const average = (points) => {
      const sums = [0, 0, 0];
      for (const point of points) {
        const rgb = read(point.x, point.y);
        for (let i = 0; i < 3; i += 1) sums[i] += rgb[i];
      }
      return sums.map((sum) => sum / points.length);
    };
    return {
      edge: average(edgeStarts),
      outside: average(outsideStarts),
    };
  });
  console.log(`Fence evidence: ${JSON.stringify(fenceEvidence)}`);

  const status = await page.evaluate(() => {
    const engine = window.__schoolyardEngine;
    const canvas = document.querySelector('canvas.game-canvas');
    const rect = canvas.getBoundingClientRect();
    const panels = Array.from(document.querySelectorAll('[class*="hud"], [class*="HUD"], [class*="campus"], [class*="command"]'))
      .map((element) => ({
        visible: Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length),
        left: element.getBoundingClientRect().left,
        right: element.getBoundingClientRect().right,
        width: element.getBoundingClientRect().width,
      }))
      .filter((panel) => panel.visible);
    return {
      paused: engine.paused,
      entities: engine.entities.length,
      canvasWidth: rect.width,
      canvasHeight: rect.height,
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      panels,
    };
  });
  console.log(`Evidence status: ${JSON.stringify(status)}`);
  if (status.scrollWidth > status.innerWidth + 1) {
    throw new Error(`Mobile layout overflows horizontally: ${JSON.stringify(status)}`);
  }
  if (errors.length) throw new Error(errors.join('\n'));
  await context.close();
  console.log('Evidence capture passed.');
} finally {
  await browser.close().catch(() => {});
  await preview.close().catch(() => {});
}
