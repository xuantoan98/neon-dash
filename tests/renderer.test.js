import test from 'node:test';
import assert from 'node:assert/strict';
import { GameRenderer } from '../dist/scripts/renderer.js';
import { RenderMotion, wrapPosition } from '../dist/scripts/render-motion.js';
import { HAZARDS, SCENES } from '../dist/scripts/content.js';

function harness(t) {
  const old = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  t.after(() => {
    if (old) Object.defineProperty(globalThis, 'window', old);
    else delete globalThis.window;
  });
  const rects = [];
  const translations = [];
  const context = {
    save() {},
    restore() {},
    beginPath() {},
    arc() {},
    fill() {},
    stroke() {},
    moveTo() {},
    lineTo() {},
    rotate() {},
    strokeRect() {},
    createLinearGradient: () => ({ addColorStop() {} }),
    fillRect(x, y, w, h) {
      rects.push({
        x,
        y,
        w,
        h,
        color: typeof this.fillStyle === 'string' ? this.fillStyle : 'gradient',
      });
    },
    translate(x, y) {
      translations.push({ x, y });
    },
  };
  const renderer = new GameRenderer({ getContext: () => context });
  renderer.width = 1000;
  renderer.height = 700;
  renderer.buildings = [{ x: 500, w: 100, h: 120, seed: 0.8, layer: 1 }];
  return { renderer, rects, translations };
}

function luminance(hex) {
  const rgb = hex.match(/[0-9a-f]{2}/gi).map((channel) => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}

test('solid hazard fills and outlines contrast against every theme without glow', () => {
  for (const palette of Object.values(HAZARDS)) {
    for (const scene of Object.values(SCENES)) {
      for (const background of [scene.horizon, scene.back, scene.front, scene.ground]) {
        assert.ok((luminance(palette.fill) + 0.05) / (luminance(background) + 0.05) >= 3.5);
        assert.ok((luminance(palette.edge) + 0.05) / (luminance(background) + 0.05) >= 7);
      }
    }
  }
});

test('city geometry depends on travelled distance, not a discontinuous time × speed', (t) => {
  const { renderer, rects } = harness(t);
  const lines = [];
  renderer.line = (...args) => lines.push(args);
  renderer.drawCity({ distance: 10000, time: 1000, speed: 7 });
  const originalRects = structuredClone(rects);
  const originalLines = structuredClone(lines);
  rects.length = 0;
  lines.length = 0;
  renderer.drawCity({ distance: 10000, time: 10000, speed: 15 });
  assert.deepEqual(rects, originalRects);
  assert.deepEqual(lines, originalLines);
});

test('building windows do not blink as their screen coordinates change', (t) => {
  const { renderer, rects } = harness(t);
  renderer.drawCity({ distance: 1000, time: 100, speed: 7 });
  const before = rects.filter((rect) => rect.w === 3 && rect.h === 7);
  rects.length = 0;
  renderer.drawCity({ distance: 1010, time: 101, speed: 8 });
  const after = rects.filter((rect) => rect.w === 3 && rect.h === 7);
  assert.ok(before.length > 0);
  assert.equal(before.length, after.length);
  for (let i = 0; i < before.length; i++) {
    assert.ok(Math.abs(before[i].x - after[i].x - 0.56) < 1e-8);
    assert.equal(before[i].y, after[i].y);
  }
});

test('interpolation is read-only and newly spawned entities never lerp from stale data', () => {
  const motion = new RenderMotion();
  const fox = { x: 100, y: 200, frame: 0 };
  const game = { time: 0, distance: 0, fox, obstacles: [], orbs: [], particles: [] };
  motion.capture(game);
  fox.y = 180;
  assert.equal(motion.value(fox, 'y', 0.5), 190);
  assert.equal(fox.y, 180);
  assert.equal(motion.value({ x: 1200 }, 'x', 0), 1200);
  motion.reset();
  assert.equal(motion.value(fox, 'y', 0), 180);
});

test('hazards are drawn through the viewport edge and culled only once fully outside', (t) => {
  const { renderer, translations } = harness(t);
  const obstacles = [
    { x: -99, y: 200, w: 58, h: 28, type: 'drone' },
    { x: -20, y: 200, w: 42, h: 48, type: 'barrier' },
  ];
  const game = { obstacles, orbs: [], particles: [] };
  const before = structuredClone(game);
  renderer.drawObjects(game);
  assert.deepEqual(translations, [{ x: -20, y: 200 }]);
  assert.deepEqual(game, before);
});

test('wrapping stays periodic across negative positions and long sessions', () => {
  for (const value of [-100000.5, -90, -0.5, 0, 80, 100000]) {
    assert.ok(wrapPosition(value, 90) >= 0 && wrapPosition(value, 90) < 90);
    assert.equal(wrapPosition(value, 90), wrapPosition(value + 90, 90));
  }
});
