import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { chromium } from 'playwright';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const viteBin = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');
const server = spawn(process.execPath, [viteBin, 'preview', '--host', '127.0.0.1', '--port', '0', '--strictPort'], {
  cwd: rootDir, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
});
const baseUrl = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Preview URL timeout')), 60000);
  const inspect = (chunk) => {
    const match = String(chunk).match(/http:\/\/127\.0\.0\.1:(\d+)\//);
    if (match) { clearTimeout(timer); resolve(`http://127.0.0.1:${match[1]}`); }
  };
  server.stdout.on('data', inspect); server.stderr.on('data', inspect);
});

const browser = await chromium.launch({ headless: true });
const outputPath = path.join(rootDir, 'test-artifacts', 'menu-hotspot-results.json');
const results = { status: 'failed', captures: {}, interactions: {}, consoleErrors: [] };
const assert = (condition, message) => { if (!condition) throw new Error(message); };

try {
  const context = await browser.newContext({ viewport: { width: 1777, height: 850 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', (error) => results.consoleErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') results.consoleErrors.push(`console: ${message.text()}`); });

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.locator('.menu-hotspot-art').waitFor({ state: 'visible' });
  results.interactions.introInert = await page.locator('.menu-hotspot-stage').evaluate((el) => el.inert);
  await page.keyboard.press('Tab');
  results.interactions.introFocusedControl = await page.evaluate(() => document.activeElement?.closest('.menu-hotspot-stage') !== null);
  assert(results.interactions.introInert, 'Menu stage is not inert during artwork-only intro');
  assert(!results.interactions.introFocusedControl, 'Invisible intro control received keyboard focus');
  await page.waitForTimeout(1800);

  const capture = async (name, viewport) => {
    await page.setViewportSize(viewport);
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.locator('.menu-hotspot-art').waitFor({ state: 'visible' });
    await page.waitForTimeout(1800);
    const target = path.join(rootDir, 'test-artifacts', name);
    await page.screenshot({ path: target, fullPage: true });
    results.captures[name] = await page.evaluate((targetPath) => {
      const art = document.querySelector('.menu-hotspot-art');
      const rect = art.getBoundingClientRect();
      const mobile = getComputedStyle(document.querySelector('.menu-mobile-actions')).display !== 'none';
      const mobileButtons = [...document.querySelectorAll('.menu-mobile-actions button')]
        .filter((button) => button.offsetWidth || button.offsetHeight)
        .map((button) => ({ name: button.textContent.trim(), width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height }));
      return {
        path: targetPath,
        viewport: [innerWidth, innerHeight],
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        art: { left: rect.left, top: rect.top, width: rect.width, height: rect.height, naturalWidth: art.naturalWidth, naturalHeight: art.naturalHeight },
        mobileActionsVisible: mobile,
        mobileButtons,
      };
    }, target);
    assert(!results.captures[name].horizontalOverflow, `${name} has horizontal overflow`);
    if (viewport.width <= 900) {
      const names = results.captures[name].mobileButtons.map((button) => button.name);
      for (const required of ['New Game', 'Sprite Debug', 'Options', 'Manual', 'Achievements', 'Exit']) {
        assert(names.includes(required), `${name} is missing mobile action ${required}`);
      }
      assert(results.captures[name].mobileButtons.every((button) => button.height >= 44), `${name} has undersized touch controls`);
    }
  };

  await capture('menu-hotspot-desktop-1777x850.png', { width: 1777, height: 850 });
  await capture('menu-hotspot-tablet-1024x768.png', { width: 1024, height: 768 });
  await capture('menu-hotspot-mobile-390x844.png', { width: 390, height: 844 });
  await capture('menu-hotspot-landscape-small-740x360.png', { width: 740, height: 360 });

  await page.setViewportSize({ width: 740, height: 360 });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  const landscapeExit = page.locator('.menu-mobile-actions button', { hasText: 'Exit' });
  await landscapeExit.scrollIntoViewIfNeeded();
  results.interactions.landscapeScroll = await page.locator('.menu-hotspot-root').evaluate((el) => ({
    scrollTop: el.scrollTop,
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
  }));
  assert(results.interactions.landscapeScroll.scrollTop > 0, 'Small-landscape menu did not scroll to its actions');
  assert(results.interactions.landscapeScroll.scrollHeight > results.interactions.landscapeScroll.clientHeight, 'Small-landscape menu is not a scroll container');
  await landscapeExit.click();
  assert(await page.getByRole('status').getByText('Close this browser tab to exit.').isVisible(), 'Small-landscape Exit action was not operable');

  await page.setViewportSize({ width: 1777, height: 850 });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  const newGame = page.getByRole('button', { name: 'New Game' });
  await newGame.focus();
  const focusStyle = await newGame.evaluate((el) => getComputedStyle(el).boxShadow);
  assert(focusStyle !== 'none', 'New Game has no visible keyboard focus styling');
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: /Choose starting difficulty/ });
  await dialog.waitFor({ state: 'visible' });
  results.interactions.initialDialogFocus = await page.evaluate(() => document.activeElement?.textContent?.trim().split('\n')[0]);
  assert(results.interactions.initialDialogFocus.startsWith('EASY'), 'Dialog did not focus Easy first');
  await page.keyboard.press('Shift+Tab');
  results.interactions.shiftTabWrap = await page.evaluate(() => document.activeElement?.textContent?.trim());
  assert(results.interactions.shiftTabWrap === 'Back to menu', 'Dialog Shift+Tab did not wrap to Back');
  await page.keyboard.press('Tab');
  assert((await page.evaluate(() => document.activeElement?.textContent?.trim() ?? '')).startsWith('EASY'), 'Dialog Tab did not wrap to Easy');
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'New Game');
  results.interactions.escapeRestoredFocus = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'New Game');
  assert(results.interactions.escapeRestoredFocus, 'Escape did not restore focus to New Game');
  await page.keyboard.press('Enter');
  await dialog.waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Back to menu' }).click();
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'New Game');
  results.interactions.backRestoredFocus = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'New Game');
  assert(results.interactions.backRestoredFocus, 'Back did not restore focus to New Game');

  assert(results.consoleErrors.length === 0, results.consoleErrors.join('\n'));
  results.status = 'passed';
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log('Hotspot menu capture and accessibility verification passed.');
} finally {
  if (!fs.existsSync(outputPath) || results.status !== 'passed') fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  await browser.close().catch(() => {});
  server.kill('SIGTERM');
}
