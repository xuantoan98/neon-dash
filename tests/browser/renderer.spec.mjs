import { test, expect } from '@playwright/test';

// Isolated real-canvas fixture: import production renderer without booting the game UI.
async function openFixture(page) {
  await page.route('**/__render-review', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Renderer regression fixture</title><style>body{margin:16px;background:#141a2c;color:white;font:16px sans-serif}canvas{display:block;width:900px;max-width:100%;height:210px;margin-bottom:24px}h2{font-size:16px}</style><main></main>',
    }),
  );
  await page.goto('/__render-review');
}

test('all hazard types are visible across themes and both quality modes', async ({
  page,
}, testInfo) => {
  await openFixture(page);
  const result = await page.evaluate(async () => {
    const { GameRenderer } = await import('/scripts/renderer.js');
    const { SCENES } = await import('/scripts/content.js');
    const checks = [];
    for (const scene of Object.values(SCENES)) {
      for (const lowQuality of [false, true]) {
        const title = document.createElement('h2');
        title.textContent = `${scene.name} · ${lowQuality ? 'Nhẹ (không glow)' : 'Đầy đủ'}`;
        const canvas = document.createElement('canvas');
        document.querySelector('main').append(title, canvas);
        const renderer = new GameRenderer(canvas);
        renderer.resize();
        renderer.scene = scene;
        renderer.lowQuality = lowQuality;
        const gap = renderer.width / 4;
        const game = {
          time: 100,
          distance: 700,
          shake: 0,
          state: 'play',
          particles: [],
          orbs: [],
          fox: { x: gap * 0.2, y: renderer.ground - 54, h: 54, frame: 0 },
          obstacles: [
            { x: gap, y: renderer.ground - 48, w: 42, h: 48, type: 'barrier' },
            { x: gap * 2, y: renderer.ground - 72, w: 35, h: 72, type: 'spire' },
            { x: gap * 3, y: renderer.ground - 72, w: 58, h: 28, type: 'drone' },
          ],
        };
        renderer.render(game);
        // Sample solid interiors, away from the contrasting markings and outline.
        const dpr = canvas.width / renderer.width;
        const locations = [
          [gap + 10, renderer.ground - 33],
          [gap * 2 + 10, renderer.ground - 12],
          [gap * 3 + 10, renderer.ground - 60],
        ];
        for (const [x, y] of locations) {
          const pixel = renderer.context.getImageData(
            Math.floor(x * dpr),
            Math.floor(y * dpr),
            1,
            1,
          ).data;
          checks.push(Math.max(...pixel.slice(0, 3)) >= 240 && pixel[3] === 255);
        }
      }
    }
    return checks;
  });
  expect(result).toHaveLength(18);
  expect(result.every(Boolean)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('hazards-all-themes.png'), fullPage: true });
});

test('repeated offscreen removals preserve continuous motion on a real canvas', async ({
  page,
}, testInfo) => {
  await openFixture(page);
  const result = await page.evaluate(async () => {
    const { NeonDashGame } = await import('/scripts/game.js');
    const canvas = document.createElement('canvas');
    document.querySelector('main').append(canvas);
    const originalRandom = Math.random;
    Math.random = () => 0.5; // Drone-only sequence so holding duck is a valid continuous run.
    try {
      const ui = {
        showBestScore() {},
        showRunningState() {},
        updateHud() {},
        setPaused() {},
        showGameOver() {},
      };
      const game = new NeonDashGame(canvas, ui);
      game.resize();
      game.startRun();
      game.duck(true);
      const arrays = [game.obstacles, game.orbs, game.particles];
      const durations = [];
      const exitDurations = [];
      let removals = 0;
      let continuous = true;
      for (let frame = 0; frame < 240; frame++) {
        // Exercise the real RAF path, including frames where an obstacle is removed.
        await new Promise(requestAnimationFrame);
        const oldest = game.obstacles[0];
        const before = game.distance;
        const start = performance.now();
        // Four seconds of display time cover sixteen seconds of simulated travel.
        for (let step = 0; step < 4; step++) game.update(1);
        game.renderer.render(game, 0.5);
        const elapsed = performance.now() - start;
        durations.push(elapsed);
        if (oldest && !game.obstacles.includes(oldest)) {
          removals++;
          exitDurations.push(elapsed);
        }
        continuous &&= game.distance >= before && game.distance - before <= 60.000001;
      }
      const percentile = (values) =>
        values.toSorted((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1] ?? 0;
      return {
        state: game.state,
        removals,
        continuous,
        sameArrays:
          arrays[0] === game.obstacles && arrays[1] === game.orbs && arrays[2] === game.particles,
        updateAndRenderP95: percentile(durations),
        exitP95: percentile(exitDurations),
      };
    } finally {
      Math.random = originalRandom;
    }
  });
  expect(result.state).toBe('play');
  expect(result.removals).toBeGreaterThan(2);
  expect(result.continuous).toBe(true);
  expect(result.sameArrays).toBe(true);
  // Timing is diagnostic: do not impose a flaky FPS threshold on a shared CI host.
  await testInfo.attach('offscreen-timing', {
    body: JSON.stringify(result, null, 2),
    contentType: 'application/json',
  });
});
