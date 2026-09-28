import assert from 'node:assert/strict';
import test from 'node:test';
import { GAME_CONFIG } from '../dist/scripts/config.js';
import { createFox, isColliding } from '../dist/scripts/entities.js';
import { NeonDashGame } from '../dist/scripts/game.js';

function setGlobal(t, name, value) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, name, previous);
    else delete globalThis[name];
  });
}

function createGame(t, { best = 0 } = {}) {
  const stored = new Map([[GAME_CONFIG.bestScoreKey, String(best)]]);
  const writes = [];
  setGlobal(t, 'window', { devicePixelRatio: 1 });
  setGlobal(t, 'localStorage', {
    getItem: (key) => stored.get(key) ?? null,
    setItem(key, value) {
      writes.push({ key, value });
      stored.set(key, value);
    },
  });
  t.mock.method(Math, 'random', () => 0.5);
  const context = { setTransform() {} };
  const canvas = {
    clientWidth: 1000,
    clientHeight: 700,
    getContext: () => context,
  };
  const ui = {
    showBestScore(value) {
      this.best = value;
    },
    showRunningState() {
      this.runningCount = (this.runningCount ?? 0) + 1;
    },
    setPaused(value) {
      this.paused = value;
    },
    showGameOver(score, value, isNewBest) {
      this.result = { score, best: value, isNewBest };
      this.gameOverCount = (this.gameOverCount ?? 0) + 1;
    },
    updateHud(score, energy, combo) {
      this.hud = { score, energy, combo };
    },
  };
  const game = new NeonDashGame(canvas, ui);
  game.resize();
  return { game, canvas, ui, writes };
}

function barrier(game, x = game.fox.x + 8) {
  return {
    x,
    y: game.renderer.ground - 48,
    w: 42,
    h: 48,
    type: 'barrier',
    passed: false,
    phase: 0,
  };
}

test('start, double jump, landing, pause, and resume retain the existing controls', (t) => {
  const { game } = createGame(t);
  assert.equal(game.state, 'menu');
  game.jump();
  assert.equal(game.state, 'play');
  assert.equal(game.fox.jumps, 0, 'the first menu action starts the run');
  game.jump();
  assert.equal(game.fox.vy, -13.8);
  assert.equal(game.fox.jumps, 1);
  game.jump();
  assert.equal(game.fox.vy, -12.2);
  assert.equal(game.fox.jumps, 2);
  game.jump();
  assert.equal(game.fox.jumps, 2);
  assert.equal(game.fox.vy, -12.2);

  game.togglePause();
  const paused = { score: game.score, y: game.fox.y, vy: game.fox.vy, time: game.time };
  game.update(1);
  assert.deepEqual({ score: game.score, y: game.fox.y, vy: game.fox.vy, time: game.time }, paused);
  game.jump();
  assert.equal(game.state, 'play');
  assert.equal(game.fox.jumps, 2, 'jump resumes without adding another jump');

  game.fox.y = game.renderer.ground - game.fox.h - 1;
  game.fox.vy = 4;
  game.update(1);
  assert.equal(game.fox.y + game.fox.h, game.renderer.ground);
  assert.equal(game.fox.vy, 0);
  assert.equal(game.fox.jumps, 0);
});

test('a retry resets transient run state and retains the best score', (t) => {
  const { game } = createGame(t, { best: 500 });
  game.startRun();
  Object.assign(game, { score: 120, speed: 12, energy: 70, combo: 3, time: 240, shake: 18 });
  Object.assign(game.fox, { vy: -4, jumps: 2, duck: true, frame: 123 });
  game.obstacles.push(barrier(game));
  game.orbs.push({ x: 400, y: 200, t: 0 });
  game.burst(100, 100, '#fff');
  game.startRun();
  assert.equal(game.state, 'play');
  assert.equal(game.best, 500);
  assert.equal(game.score, 0);
  assert.equal(game.speed, GAME_CONFIG.initialSpeed);
  assert.equal(game.spawnDistance, GAME_CONFIG.initialSpawnDistance);
  assert.equal(game.energy, 0);
  assert.equal(game.combo, 1);
  assert.equal(game.time, 0);
  assert.equal(game.shake, 0);
  assert.equal(game.fox.frame, 0);
  assert.equal(game.fox.vy, 0);
  assert.equal(game.fox.jumps, 0);
  assert.equal(game.fox.duck, false);
  assert.equal(game.fox.y + game.fox.h, game.renderer.ground);
  assert.deepEqual([game.obstacles, game.orbs, game.particles], [[], [], []]);
});

test('a fatal collision freezes score before an overlapping orb can be collected', (t) => {
  const { game, ui, writes } = createGame(t);
  game.startRun();
  game.score = 100;
  game.obstacles.push(barrier(game));
  game.orbs.push({ x: game.fox.x + 24 + game.speed, y: game.fox.y + 25, r: 6, t: 0 });
  game.update(1);
  assert.equal(game.state, 'over');
  assert.equal(ui.result.score, 100);
  assert.equal(game.getStatus().score, ui.result.score);
  assert.equal(game.best, ui.result.score);
  assert.equal(Math.floor(ui.hud.score), ui.result.score);
  assert.equal(game.orbs[0].got, undefined);
  assert.deepEqual(writes, [{ key: GAME_CONFIG.bestScoreKey, value: '100' }]);
  const score = game.score;
  game.update(1);
  game.endRun();
  assert.equal(game.score, score);
  assert.equal(ui.gameOverCount, 1);
  assert.equal(writes.length, 1);
});

test('a lower-scoring run does not overwrite the stored record', (t) => {
  const { game, ui, writes } = createGame(t, { best: 500 });
  game.startRun();
  game.score = 123.9;
  game.endRun();
  assert.deepEqual(ui.result, { score: 123, best: 500, isNewBest: false });
  assert.equal(game.best, 500);
  assert.equal(writes.length, 0);
});

test('passing an obstacle awards its combo bonus once', (t) => {
  const { game } = createGame(t);
  game.startRun();
  game.energy = 24;
  const obstacle = barrier(game, game.fox.x - 80);
  game.obstacles.push(obstacle);
  game.update(1);
  assert.equal(obstacle.passed, true);
  assert.equal(game.combo, 2);
  assert.ok(Math.abs(game.score - (7 * 0.105 + 16)) < 1e-9);
  assert.ok(Math.abs(game.energy - (35 - 0.018)) < 1e-9);
  const previousScore = game.score;
  const expectedDistanceScore = (GAME_CONFIG.initialSpeed + previousScore / 850) * 0.105;
  game.update(1);
  assert.ok(Math.abs(game.score - previousScore - expectedDistanceScore) < 1e-9);
});

test('orbs award their existing bonus once and are removed after collection', (t) => {
  const { game } = createGame(t);
  game.startRun();
  game.orbs.push({ x: game.fox.x + 24 + 7, y: game.fox.y + 25, r: 6, t: 0 });
  game.update(1);
  assert.ok(Math.abs(game.score - (7 * 0.105 + 25)) < 1e-9);
  assert.ok(Math.abs(game.energy - (14 - 0.018)) < 1e-9);
  assert.equal(game.orbs.length, 0);
  const previousScore = game.score;
  game.update(1);
  assert.ok(game.score - previousScore < 1);
});

for (const state of ['play', 'paused', 'over']) {
  test(`resize preserves ground offsets and relative obstacle distances while ${state}`, (t) => {
    const { game, canvas } = createGame(t);
    game.startRun();
    game.state = state;
    game.fox.y -= 60;
    game.fox.vy = -4;
    game.fox.jumps = 1;
    game.obstacles.push(barrier(game, game.fox.x + 350));
    game.orbs.push({ x: game.fox.x + 400, y: game.renderer.ground - 105, r: 6, t: 0 });
    canvas.clientWidth = 400;
    canvas.clientHeight = 500;
    game.resize();
    assert.equal(game.renderer.ground - game.fox.y - game.fox.h, 60);
    assert.equal(game.renderer.ground - game.obstacles[0].y - game.obstacles[0].h, 0);
    assert.equal(game.renderer.ground - game.orbs[0].y, 105);
    assert.equal(game.obstacles[0].x - game.fox.x, 350);
    assert.equal(game.orbs[0].x - game.fox.x, 400);
    assert.equal(game.fox.vy, -4);
    assert.equal(game.fox.jumps, 1);
    assert.equal(game.state, state);
  });
}

test('releasing the duck control while paused clears the held posture', (t) => {
  const { game } = createGame(t);
  game.startRun();
  game.duck(true);
  assert.equal(game.fox.duck, true);
  game.togglePause();
  game.duck(false);
  game.togglePause();
  assert.equal(game.fox.duck, false);
});

test('ducking still clears a drone but does not bypass a ground barrier', () => {
  const fox = { ...createFox(), x: 100, y: 500 - 54 };
  // At the bottom of its oscillation a drone can hit a standing fox.
  const drone = { x: 105, y: 500 - 64, w: 58, h: 28 };
  const groundBarrier = { x: 105, y: 500 - 48, w: 42, h: 48 };
  assert.equal(isColliding(fox, drone), true);
  fox.duck = true;
  assert.equal(isColliding(fox, drone), false);
  assert.equal(isColliding(fox, groundBarrier), true);
  fox.y -= 120;
  assert.equal(isColliding(fox, groundBarrier), false);
});

test('ending a paused run preserves its score and finalizes statistics once', (t) => {
  const { game, ui } = createGame(t);
  game.startRun();
  game.jump();
  game.update(1);
  game.pause();
  const score = game.score;
  game.endRun();
  game.endRun();
  assert.equal(game.state, 'over');
  assert.equal(game.score, score);
  assert.equal(game.runStats.jumps, 1);
  assert.equal(ui.gameOverCount, 1);
});

test('100 repeated runs keep entities bounded and clear expired effects', (t) => {
  const { game } = createGame(t);
  for (let run = 0; run < 100; run++) {
    game.startRun();
    for (let frame = 0; frame < 1000 && game.state === 'play'; frame++) game.update(1);
    game.endRun();
    assert.ok(game.obstacles.length < 10);
    assert.ok(game.orbs.length < 20);
    for (let frame = 0; frame < 100; frame++) game.update(1);
    assert.equal(game.particles.length, 0);
    assert.equal(game.shake, 0);
  }
});

test('score bonuses never teleport accumulated scenery distance, including long runs', (t) => {
  const { game } = createGame(t);
  game.startRun();
  game.time = 10000;
  game.distance = 80000;
  game.score = 1000;
  game.energy = 60;
  game.obstacles.push(barrier(game, game.fox.x - 80));
  const speed = GAME_CONFIG.initialSpeed + game.score / GAME_CONFIG.speedScoreInterval;
  game.update(1);
  assert.ok(Math.abs(game.distance - 80000 - speed) < 1e-8);
  assert.equal(game.runStats.obstacles, 1);
  const distance = game.distance;
  game.update(1);
  assert.ok(Math.abs(game.distance - distance - game.speed) < 1e-8);
  assert.ok(game.speed > speed, 'the bonus still affects gameplay speed as before');
  game.pause();
  game.update(1);
  assert.equal(game.distance, distance + game.speed);
  assert.equal(game.renderer.motion.time, null);
  game.startRun();
  assert.equal(game.distance, 0);
});

test('offscreen cleanup reuses arrays and does not disturb surviving objects or their motion', (t) => {
  const { game } = createGame(t);
  game.startRun();
  const survivor = barrier(game, 2000);
  game.obstacles.push({ ...barrier(game, -95), passed: true }, survivor);
  const orb = { x: 2000, y: 100, r: 6, t: 0 };
  game.orbs.push({ x: -26, y: 100, r: 6, t: 0 }, orb);
  game.particles.push({ x: 10, y: 10, vx: 0, vy: 0, life: 0 });
  const arrays = [game.obstacles, game.orbs, game.particles];
  game.update(1);
  assert.equal(game.obstacles, arrays[0]);
  assert.equal(game.orbs, arrays[1]);
  assert.equal(game.particles, arrays[2]);
  assert.deepEqual(game.obstacles, [survivor]);
  assert.deepEqual(game.orbs, [orb]);
  assert.equal(game.particles.length, 0);
  assert.equal(survivor.x, 1993);
  assert.equal(game.renderer.motion.value(survivor, 'x', 0.5), 1996.5);
  assert.equal(game.state, 'play');
});
