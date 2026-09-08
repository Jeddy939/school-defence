import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const viteBin = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');
const nodeCmd = process.execPath;

const runProcess = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, {
    cwd: rootDir,
    env: { ...process.env, FORCE_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; process.stdout.write(chunk); });
  child.stderr.on('data', (chunk) => { output += chunk; process.stderr.write(chunk); });
  child.on('error', reject);
  child.on('close', (code) => code === 0
    ? resolve(output)
    : reject(new Error(`Process failed (${code}): ${args.join(' ')}`)));
});

const build = () => runProcess(nodeCmd, [viteBin, 'build', '--mode', 'smoke']);

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
    const bareChunk = String(chunk).replace(/\u001b\[[0-9;]*m/g, '');
    const urlMatch = bareChunk.match(/http:\/\/(?:127\.0\.0\.1|localhost):(\d+)\//);
    if (urlMatch && !resolvedUrl) {
      resolvedUrl = `http://127.0.0.1:${urlMatch[1]}`;
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

const assertNoGameAssets = async (page, label) => {
  const gameAssetRequests = await page.evaluate(() =>
    performance.getEntriesByType('resource')
      .map((entry) => entry.name)
      .filter((name) =>
        /(\/menu\/|\/sprites\/|\/structures\/|\/tiles\/|\/portraits\/)/.test(name)
      )
  );
  if (gameAssetRequests.length > 0) {
    throw new Error(`${label} requested game assets: ${gameAssetRequests.join(', ')}`);
  }
};

const assertCleanLearningPage = async (page, label, expectedTitle) => {
  await page.waitForFunction((title) => document.body.innerText.includes(title), expectedTitle, { timeout: 60000 });
  const copy = await page.evaluate(() => document.body.innerText);
  for (const forbidden of ['Schoolyard Defence', 'Protect the staffroom', 'VERSION 2']) {
    if (copy.includes(forbidden)) throw new Error(`${label} exposes game copy: ${forbidden}`);
  }
  await assertNoGameAssets(page, label);
};

const startNormalGame = async (page, baseUrl) => {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await assertCleanLearningPage(page, 'Landing page', 'School funding maths warm-up');

  const startQuiz = page.getByRole('button', { name: 'Start Quiz' });
  await startQuiz.waitFor({ state: 'visible', timeout: 60000 });
  await startQuiz.click();
  await assertCleanLearningPage(page, 'Review page', 'Warm-up review');

  const continueButton = page.getByRole('button', { name: /Continue to next task/ });
  await continueButton.waitFor({ state: 'visible', timeout: 60000 });
  await continueButton.click();
  await assertCleanLearningPage(page, 'Extension page', 'Budget planning extension');

  const openClassroom = page.getByRole('button', { name: /Open classroom activity/ });
  await openClassroom.waitFor({ state: 'visible', timeout: 60000 });
  await openClassroom.click();
  await assertCleanLearningPage(page, 'Classroom page', 'Classroom follow-up');

  const openPractical = page.getByRole('button', { name: /Open practical task/ });
  await openPractical.waitFor({ state: 'visible', timeout: 60000 });
  await Promise.all([
    page.waitForURL('**/practical-task.html', { timeout: 60000 }),
    openPractical.click(),
  ]);

  await page.waitForFunction(() => document.body.innerText.includes('VERSION 2'), null, { timeout: 60000 });
  await page.waitForFunction(() => typeof window.__schoolyardStartNormal === 'function', null, { timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 60000 });
  const menuButtons = await page.getByRole('button').allTextContents();
  if (!menuButtons.some((text) => text.includes('New Game'))) throw new Error('New Game action is missing');
  await page.evaluate(() => window.__schoolyardStartNormal());
  await page.locator('canvas.game-canvas').waitFor({ state: 'visible', timeout: 60000 });
};

const verifyDprAndPointer = async (browser, baseUrl, deviceScaleFactor) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor });
  const page = await context.newPage();
  try {
    await startNormalGame(page, baseUrl);
    const evidence = await page.evaluate(() => {
      const engine = window.__schoolyardEngine;
      const canvas = document.querySelector('canvas.game-canvas');
      const context = canvas.getContext('2d');
      const aide = engine.entities.find((entity) => entity.type === 'TEACHER_AIDE');
      const bounds = engine.getEntityScreenBounds(aide);
      const rect = canvas.getBoundingClientRect();
      return {
        canvasRatio: canvas.width / 800,
        desynchronized: context.getContextAttributes?.().desynchronized ?? false,
        clickX: rect.left + (((bounds.minX + bounds.maxX) / 2) / 800) * rect.width,
        clickY: rect.top + (((bounds.minY + bounds.maxY) / 2) / 600) * rect.height,
        aideId: aide.id,
      };
    });
    const expectedRatio = Math.min(deviceScaleFactor, 2);
    if (Math.abs(evidence.canvasRatio - expectedRatio) > 0.01) {
      throw new Error(`DPR ${deviceScaleFactor} produced ${evidence.canvasRatio}x backing canvas`);
    }
    if (evidence.desynchronized) throw new Error('Canvas permits partial-frame presentation');
    await page.mouse.click(evidence.clickX, evidence.clickY);
    const selected = await page.evaluate(() => window.__schoolyardEngine.selectedIds);
    if (!selected.includes(evidence.aideId)) throw new Error(`Pointer selection drifted at DPR ${deviceScaleFactor}`);
  } finally {
    await context.close();
  }
};

await build();
const preview = startPreview();
const browser = await chromium.launch({ headless: true });
const severeIssues = [];

try {
  const baseUrl = await Promise.race([
    preview.urlReady,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Preview URL timeout')), 60000)),
  ]);

  for (const dpr of [1, 1.5, 2]) await verifyDprAndPointer(browser, baseUrl, dpr);

  const context = await browser.newContext({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  page.on('pageerror', (error) => severeIssues.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') severeIssues.push(`console:error: ${message.text()}`);
  });

  await startNormalGame(page, baseUrl);
  const opening = await page.evaluate(() => {
    const engine = window.__schoolyardEngine;
    engine.resetGame('NORMAL');
    engine.setPaused(true);
    const byType = (type) => engine.entities.filter((entity) => entity.type === type);
    return {
      width: engine.tiles[0].length,
      height: engine.tiles.length,
      grants: engine.state.resources.grants,
      countdown: engine.state.nextWaveTime,
      staffroom: byType('STAFFROOM')[0]?.pos,
      aide: byType('TEACHER_AIDE')[0]?.pos,
      bookshelves: byType('BOOKSHELF').length,
      admin: byType('ADMIN_OFFICE')[0]?.pos,
    };
  });
  if (opening.width !== 20 || opening.height !== 15) throw new Error(`Map is ${opening.width}x${opening.height}`);
  if (opening.grants !== 150 || opening.countdown !== 90) throw new Error(`Opening balance is wrong: ${JSON.stringify(opening)}`);
  if (!opening.staffroom || !opening.aide || opening.bookshelves !== 3 || !opening.admin) throw new Error('Restored opening entities are missing');

  const movement = await page.evaluate(() => {
    const engine = window.__schoolyardEngine;
    const originalRandom = Math.random;
    const target = { x: 430, y: 300 };
    const runs = [];
    for (let run = 0; run < 8; run += 1) {
      let seed = 101 + run * 97;
      Math.random = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      engine.resetGame('NORMAL');
      engine.setPaused(false);
      engine.state.nextWaveTime = 9999;
      const aide = engine.entities.find((entity) => entity.type === 'TEACHER_AIDE');
      engine.setSelection([aide.id]);
      engine.issueCommand(target.x, target.y);
      let longestStill = 0;
      let still = 0;
      let previous = { ...aide.pos };
      for (let i = 0; i < 800; i += 1) {
        engine.update(0.05);
        const moved = Math.hypot(aide.pos.x - previous.x, aide.pos.y - previous.y);
        still = moved < 0.01 ? still + 0.05 : 0;
        longestStill = Math.max(longestStill, still);
        previous = { ...aide.pos };
        if (Math.hypot(aide.pos.x - target.x, aide.pos.y - target.y) < 18) break;
      }
      runs.push({
        distance: Math.hypot(aide.pos.x - target.x, aide.pos.y - target.y),
        longestStill,
      });
    }
    Math.random = originalRandom;
    return runs;
  });
  const failedMovement = movement.find((run) => run.distance >= 20 || run.longestStill > 3);
  if (failedMovement) throw new Error(`Movement wedged: ${JSON.stringify(movement)}`);

  const grassBackdrop = await page.evaluate(async () => {
    const engine = window.__schoolyardEngine;
    const canvas = document.querySelector('canvas.game-canvas');
    const context = canvas.getContext('2d');
    const ratio = canvas.width / 800;
    const samples = [];
    for (const pan of [{ x: 5000, y: 5000 }, { x: -5000, y: -5000 }]) {
      engine.zoom = 0.5;
      engine.panOffset = pan;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      for (const [x, y] of [[180, 180], [300, 240], [400, 300], [500, 360], [620, 420]]) {
        const pixel = context.getImageData(Math.round(x * ratio), Math.round(y * ratio), 1, 1).data;
        samples.push({ red: pixel[0], green: pixel[1], blue: pixel[2] });
      }
    }
    engine.zoom = 1;
    engine.centerViewOnStaffroom();
    return samples;
  });
  if (grassBackdrop.some((pixel) => pixel.green <= pixel.red || pixel.green <= pixel.blue)) {
    throw new Error(`Extreme pan exposed non-grass void: ${JSON.stringify(grassBackdrop)}`);
  }
  const grassGreenValues = grassBackdrop.map((pixel) => pixel.green);
  if (Math.max(...grassGreenValues) - Math.min(...grassGreenValues) < 12) {
    throw new Error(`Exterior grass is flat instead of textured: ${JSON.stringify(grassBackdrop)}`);
  }

  const cameraGuard = await page.evaluate(() => {
    const engine = window.__schoolyardEngine;
    const visibleMapSamples = () => {
      let visible = 0;
      for (let x = 0; x <= 800; x += 40) {
        for (let y = 0; y <= 600; y += 40) {
          const point = engine.worldToScreen(x, y);
          if (point.x >= 0 && point.x <= 800 && point.y >= 0 && point.y <= 600) visible += 1;
        }
      }
      return visible;
    };

    engine.resetGame('NORMAL');
    engine.panBy(5000, 5000);
    const interactivePositive = visibleMapSamples();
    engine.panBy(-10000, -10000);
    const interactiveNegative = visibleMapSamples();

    engine.saveGame();
    const extremeSave = JSON.parse(localStorage.getItem('schoolyard_save'));
    extremeSave.panOffset = { x: 1000000000, y: -1000000000 };
    extremeSave.zoom = 3;
    localStorage.setItem('schoolyard_save', JSON.stringify(extremeSave));
    const extremeLoaded = engine.loadGame();
    const loadedExtreme = visibleMapSamples();

    const malformedZoomSave = JSON.parse(localStorage.getItem('schoolyard_save'));
    malformedZoomSave.panOffset = { x: 120, y: -80 };
    malformedZoomSave.zoom = null;
    localStorage.setItem('schoolyard_save', JSON.stringify(malformedZoomSave));
    const malformedZoomLoaded = engine.loadGame();
    const staffroom = engine.entities.find((entity) => entity.type === 'STAFFROOM');
    const malformedZoomStaffroomScreen = engine.worldToScreen(staffroom.pos.x, staffroom.pos.y);

    const malformedPanSave = JSON.parse(localStorage.getItem('schoolyard_save'));
    malformedPanSave.panOffset = { x: null, y: 'off-world' };
    malformedPanSave.zoom = 2;
    localStorage.setItem('schoolyard_save', JSON.stringify(malformedPanSave));
    const malformedPanLoaded = engine.loadGame();
    const malformedPanStaffroomScreen = engine.worldToScreen(staffroom.pos.x, staffroom.pos.y);

    return {
      interactivePositive,
      interactiveNegative,
      extremeLoaded,
      loadedExtreme,
      malformedZoomLoaded,
      malformedZoomStaffroomScreen,
      malformedPanLoaded,
      malformedPanStaffroomScreen,
      zoom: engine.zoom,
    };
  });
  if (
    cameraGuard.interactivePositive === 0
    || cameraGuard.interactiveNegative === 0
    || !cameraGuard.extremeLoaded
    || cameraGuard.loadedExtreme === 0
    || !cameraGuard.malformedZoomLoaded
    || !cameraGuard.malformedPanLoaded
    || cameraGuard.zoom !== 1
    || Math.abs(cameraGuard.malformedZoomStaffroomScreen.x - 352) > 1
    || Math.abs(cameraGuard.malformedZoomStaffroomScreen.y - 336) > 1
    || Math.abs(cameraGuard.malformedPanStaffroomScreen.x - 352) > 1
    || Math.abs(cameraGuard.malformedPanStaffroomScreen.y - 336) > 1
  ) {
    throw new Error(`Camera can lose the playable map: ${JSON.stringify(cameraGuard)}`);
  }

  const economy = await page.evaluate(() => {
    const engine = window.__schoolyardEngine;
    const originalRandom = Math.random;
    let randomSeed = 8;
    Math.random = () => {
      randomSeed = (randomSeed * 1664525 + 1013904223) >>> 0;
      return randomSeed / 4294967296;
    };
    engine.resetGame('NORMAL');
    engine.setPaused(false);
    engine.state.nextWaveTime = 9999;
    const aide = engine.entities.find((entity) => entity.type === 'TEACHER_AIDE');
    const shelf = engine.entities
      .filter((entity) => entity.type === 'BOOKSHELF')
      .sort((left, right) => engine.getDistance(aide, left) - engine.getDistance(aide, right))[0];
    const before = engine.state.resources.curriculum;
    engine.setSelection([aide.id]);
    engine.issueCommand(shelf.pos.x, shelf.pos.y, shelf.id);
    for (let i = 0; i < 3000 && engine.state.resources.curriculum <= before; i += 1) engine.update(0.05);
    const afterGather = engine.state.resources.curriculum;
    engine.state.resources.grants = 1000;
    engine.state.resources.curriculum = 1000;
    const staffroom = engine.entities.find((entity) => entity.type === 'STAFFROOM');
    engine.purchaseUnit('SUB_TEACHER');
    const subTeachersBefore = engine.entities.filter((entity) => entity.type === 'SUB_TEACHER').length;
    for (let i = 0; i < 300; i += 1) engine.update(0.05);
    const trained = engine.entities.filter((entity) => entity.type === 'SUB_TEACHER').length;
    const trainedDelta = trained - subTeachersBefore;
    engine.setSelection([staffroom.id]);
    engine.issueCommand(300, 300);
    const rally = staffroom.rallyPoint;
    engine.setSelection([aide.id]);
    engine.setPlacementMode('LOCKER');
    const lockersBeforeInvalidBuild = engine.entities.filter((entity) => entity.type === 'LOCKER').length;
    const resourcesBeforeInvalidBuild = { ...engine.state.resources };
    engine.tryBuild(staffroom.pos.x, staffroom.pos.y);
    const overlapBuildRejected = engine.entities.filter((entity) => entity.type === 'LOCKER').length === lockersBeforeInvalidBuild
      && engine.state.resources.grants === resourcesBeforeInvalidBuild.grants
      && engine.state.resources.curriculum === resourcesBeforeInvalidBuild.curriculum
      && engine.pendingBuild === 'LOCKER';
    engine.tryBuild(-40, 250);
    const invalidBuildRejected = engine.entities.filter((entity) => entity.type === 'LOCKER').length === lockersBeforeInvalidBuild;
    engine.tryBuild(240, 300);
    const lockerCreated = engine.entities.filter((entity) => entity.type === 'LOCKER').length === lockersBeforeInvalidBuild + 1
      && engine.state.resources.grants === resourcesBeforeInvalidBuild.grants
      && engine.state.resources.curriculum === resourcesBeforeInvalidBuild.curriculum - 20
      && engine.pendingBuild === null;
    const result = { afterGather, trained, rally, lockerCreated, invalidBuildRejected, overlapBuildRejected };
    Math.random = originalRandom;
    return result;
  });
  if (economy.afterGather <= 0 || economy.trainedDelta < 1 || !economy.rally || !economy.lockerCreated || !economy.invalidBuildRejected || !economy.overlapBuildRejected) {
    throw new Error(`Economy/production/build/rally failed: ${JSON.stringify(economy)}`);
  }

  const healerSafety = await page.evaluate(() => {
    const engine = window.__schoolyardEngine;
    engine.resetGame('NORMAL');
    engine.setPaused(false);
    engine.state.nextWaveTime = 9999;
    const staffroom = engine.entities.find((entity) => entity.type === 'STAFFROOM');
    const healer = engine.spawnEntity('TUCKSHOP_LADY', 'FACULTY', { x: 175, y: 300 });
    const student = engine.spawnEntity('YEAR_7', 'STUDENTS', { x: 185, y: 300 });
    staffroom.hp = staffroom.maxHp - 100;
    student.hp = 10;
    student.state = 'STUNNED';
    student.stunTimer = 999;
    engine.entities
      .filter((entity) => entity.faction === 'FACULTY' && entity.id !== healer.id)
      .forEach((entity) => { entity.attackTimer = 999; });

    engine.setSelection([healer.id]);
    engine.issueCommand(student.pos.x, student.pos.y, student.id);
    const hostileOrderRejected = healer.targetId !== student.id && healer.state !== 'ATTACK';

    engine.projectiles.push({
      id: 999999,
      type: 'HOT_PIE',
      pos: { ...student.pos },
      target: { ...student.pos },
      targetId: student.id,
      damage: healer.damage,
    });

    engine.update(1 / 60);
    const studentHpAfterHostilePie = student.hp;
    for (let i = 1; i < 180; i += 1) engine.update(1 / 60);
    return {
      hostileOrderRejected,
      studentHpAfterHostilePie,
      studentHp: student.hp,
      staffroomHp: staffroom.hp,
      staffroomMaxHp: staffroom.maxHp,
    };
  });
  if (!healerSafety.hostileOrderRejected || healerSafety.studentHpAfterHostilePie !== 10 || healerSafety.studentHp > 10 || healerSafety.staffroomHp <= healerSafety.staffroomMaxHp - 100) {
    throw new Error(`Tuckshop Lady healed a hostile or failed to heal faculty: ${JSON.stringify(healerSafety)}`);
  }

  const wave = await page.evaluate(() => {
    const engine = window.__schoolyardEngine;
    engine.resetGame('NORMAL');
    engine.setPaused(false);
    engine.effects.length = 0;
    engine.state.nextWaveTime = 4.9;
    engine.update(0.05);
    const warnings = engine.effects.filter((effect) => effect.type === 'WARNING').length;
    const side = engine.pendingWaveSide;
    engine.state.nextWaveTime = 0.01;
    engine.update(0.05);
    const students = engine.entities.filter((entity) => entity.faction === 'STUDENTS');
    const mapW = engine.tiles[0].length * 40;
    const mapH = engine.tiles.length * 40;
    const onWarnedSide = students.every((student) => side === 0
      ? student.pos.y <= 35
      : side === 1
        ? student.pos.x >= mapW - 35
        : student.pos.y >= mapH - 35);
    return { warnings, students: students.length, onWarnedSide };
  });
  if (wave.warnings !== 5 || wave.students < 1 || !wave.onWarnedSide) throw new Error(`Wave warning/spawn mismatch: ${JSON.stringify(wave)}`);

  const bossWave = await page.evaluate(() => {
    const engine = window.__schoolyardEngine;
    return [0, 1, 2].map((side) => {
      engine.resetGame('NORMAL');
      engine.seenEntityTypes.add('YEAR_7_RAT_KING');
      engine.setPaused(false);
      engine.state.wave = 9;
      engine.pendingWaveSide = side;
      engine.warningIssuedForWave = 0;
      engine.effects.length = 0;
      engine.state.nextWaveTime = 4.9;
      engine.update(0.05);
      const warnings = engine.effects.filter((effect) => effect.type === 'WARNING').length;
      engine.state.nextWaveTime = 0.01;
      engine.update(0.05);
      const boss = engine.entities.find((entity) => entity.type === 'YEAR_7_RAT_KING');
      const mapW = engine.tiles[0].length * 40;
      const mapH = engine.tiles.length * 40;
      const onWarnedSide = Boolean(boss) && (side === 0
        ? boss.pos.y <= 35
        : side === 1
          ? boss.pos.x >= mapW - 35
          : boss.pos.y >= mapH - 35);
      const inBounds = Boolean(boss)
        && boss.pos.x >= 0 && boss.pos.x <= mapW
        && boss.pos.y >= 0 && boss.pos.y <= mapH;
      return { side, warnings, onWarnedSide, inBounds };
    });
  });
  if (bossWave.some((result) => result.warnings !== 5 || !result.onWarnedSide || !result.inBounds)) {
    throw new Error(`Boss warning/spawn mismatch: ${JSON.stringify(bossWave)}`);
  }

  const battle = await page.evaluate(() => {
    const engine = window.__schoolyardEngine;
    const originalRandom = Math.random;
    let randomSeed = 8;
    Math.random = () => {
      randomSeed = (randomSeed * 1664525 + 1013904223) >>> 0;
      return randomSeed / 4294967296;
    };
    engine.resetGame('NORMAL');
    engine.seenEntityTypes.add('YEAR_7');
    engine.setPaused(false);
    engine.purchaseUnit('SUB_TEACHER');
    engine.purchaseUnit('SUB_TEACHER');
    const subTeachersBeforeBattle = engine.entities.filter((entity) => entity.type === 'SUB_TEACHER').length;
    const aide = engine.entities.find((entity) => entity.type === 'TEACHER_AIDE');
    const shelf = engine.entities.find((entity) => entity.type === 'BOOKSHELF');
    const admin = engine.entities.find((entity) => entity.type === 'ADMIN_OFFICE');
    engine.setSelection([aide.id]);
    engine.issueCommand(shelf.pos.x, shelf.pos.y, shelf.id);
    let lockerBuilt = false;
    let adminOrdered = false;
    let elapsed = 0;
    const frameDt = 1 / 60;
    for (let i = 0; i < 15600; i += 1) {
      if (!lockerBuilt && engine.state.resources.curriculum >= 20 && aide.hp > 0) {
        engine.setSelection([aide.id]);
        engine.setPlacementMode('LOCKER');
        engine.tryBuild(240, 300);
        lockerBuilt = engine.entities.some((entity) => entity.type === 'LOCKER');
      }
      const locker = engine.entities.find((entity) => entity.type === 'LOCKER');
      if (lockerBuilt && locker && !locker.isUnderConstruction && !adminOrdered && aide.hp > 0) {
        engine.setSelection([aide.id]);
        engine.issueCommand(admin.pos.x, admin.pos.y, admin.id);
        adminOrdered = true;
      }
      if (engine.state.resources.grants >= 75 && engine.entities.some((entity) => entity.type === 'STAFFROOM' && entity.hp > 0)) {
        engine.purchaseUnit('SUB_TEACHER');
      }
      if (engine.paused) engine.setPaused(false);
      engine.update(frameDt);
      elapsed += frameDt;
      const students = engine.entities.filter((entity) => entity.faction === 'STUDENTS' && entity.hp > 0);
      if (engine.state.wave === 2 && students.length === 0) break;
      if (engine.state.gameOver || engine.state.wave > 2) break;
    }
    const staffroom = engine.entities.find((entity) => entity.type === 'STAFFROOM');
    const result = {
      wave: engine.state.wave,
      gameOver: engine.state.gameOver,
      staffroomHp: staffroom?.hp ?? 0,
      liveStudents: engine.entities.filter((entity) => entity.faction === 'STUDENTS' && entity.hp > 0).length,
      trained: engine.entities.filter((entity) => entity.type === 'SUB_TEACHER').length,
      trainedDelta: engine.entities.filter((entity) => entity.type === 'SUB_TEACHER').length - subTeachersBeforeBattle,
      lockerBuilt,
      elapsed,
      students: engine.entities.filter((entity) => entity.faction === 'STUDENTS' && entity.hp > 0).slice(0, 6).map((entity) => ({
        type: entity.type, hp: entity.hp, state: entity.state, pos: entity.pos, targetId: entity.targetId,
      })),
      faculty: engine.entities.filter((entity) => entity.faction === 'FACULTY' && entity.hp > 0).map((entity) => ({
        type: entity.type, hp: entity.hp, state: entity.state, pos: entity.pos, targetId: entity.targetId,
      })),
    };
    Math.random = originalRandom;
    return result;
  });
  if (battle.gameOver || battle.wave !== 2 || battle.liveStudents !== 0 || battle.staffroomHp <= 0 || battle.trainedDelta < 1 || !battle.lockerBuilt) {
    throw new Error(`Normal opening did not survive Wave 2: ${JSON.stringify(battle)}`);
  }

  const integrity = await page.evaluate(() => {
    const engine = window.__schoolyardEngine;
    const mapW = engine.tiles[0].length * 40;
    const mapH = engine.tiles.length * 40;
    engine.saveGame();
    const saved = JSON.parse(localStorage.getItem('schoolyard_save'));
    return {
      saveVersion: saved.version,
      invalidEntity: Boolean(engine.entities.find((entity) => entity.hp > 0
        && (!Number.isFinite(entity.pos.x) || !Number.isFinite(entity.pos.y)
          || entity.pos.x < 0 || entity.pos.x > mapW || entity.pos.y < 0 || entity.pos.y > mapH))),
    };
  });
  if (integrity.saveVersion !== 2 || integrity.invalidEntity) throw new Error(`World/save integrity failed: ${JSON.stringify(integrity)}`);

  const schemaRejection = await page.evaluate(() => {
    const engine = window.__schoolyardEngine;
    const save = JSON.parse(localStorage.getItem('schoolyard_save'));
    save.version = 3;
    localStorage.setItem('schoolyard_save', JSON.stringify(save));
    const hasSave = engine.hasSave();
    const firstInspect = engine.inspectSave();
    const preservedAfterInspect = localStorage.getItem('schoolyard_save');
    engine.loadGame();
    const preservedAfterFailedLoad = localStorage.getItem('schoolyard_save');
    return {
      hasSave,
      firstInspect,
      preservedAfterInspect,
      preservedAfterFailedLoad,
    };
  });
  if (schemaRejection.hasSave
    || schemaRejection.firstInspect.status !== 'incompatible'
    || schemaRejection.preservedAfterInspect === null
    || schemaRejection.preservedAfterFailedLoad === null) {
    throw new Error(`Schema-3 save must be rejected but preserved: ${JSON.stringify(schemaRejection)}`);
  }

  const genericResetPreservesIncompatible = await page.evaluate(() => {
    const engine = window.__schoolyardEngine;
    engine.resetGame('NORMAL');
    return { remaining: localStorage.getItem('schoolyard_save') };
  });
  if (genericResetPreservesIncompatible.remaining === null) {
    throw new Error(`Generic reset must preserve incompatible save: ${JSON.stringify(genericResetPreservesIncompatible)}`);
  }

  const newGameClearsIncompatible = await page.evaluate(() => {
    const engine = window.__schoolyardEngine;
    engine.clearIncompatibleSave();
    engine.resetGame('NORMAL');
    return { remaining: localStorage.getItem('schoolyard_save') };
  });
  if (newGameClearsIncompatible.remaining !== null) {
    throw new Error(`Explicit new game must clear incompatible save: ${JSON.stringify(newGameClearsIncompatible)}`);
  }

  const discoveryButton = page.getByRole('button', { name: 'Understood' });
  if (await discoveryButton.isVisible().catch(() => false)) await discoveryButton.click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(rootDir, 'test-artifacts', 'v2-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1536, height: 864 });
  await startNormalGame(page, baseUrl);
  await page.screenshot({ path: path.join(rootDir, 'test-artifacts', 'v2-desktop.png'), fullPage: true });

  if (severeIssues.length) throw new Error(severeIssues.join('\n'));
  await context.close();
  console.log('Version 2 smoke test passed.');
} finally {
  await browser.close().catch(() => {});
  await preview.close().catch(() => {});
}
