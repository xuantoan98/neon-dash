import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

test('CPU-throttled startup and continuous gameplay audit', async ({ page, context, browserName }, testInfo) => {
  test.skip(process.env.PERF_AUDIT !== '1' || browserName !== 'chromium', 'Opt-in Chromium performance audit');
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1180, height: 760 });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  await cdp.send('Performance.enable');
  await page.addInitScript(() => {
    // Stable city geometry and input; no invulnerability or skipped simulation.
    Math.random = () => 0.5;
  });
  await page.goto('/');
  await page.waitForFunction(() => document.querySelector('#startBtn'));
  await page.evaluate(async () => {
    await document.fonts.ready;
    const { GameRenderer } = await import('/scripts/renderer.js');
    const { GameUI } = await import('/scripts/ui.js');
    const audit = { renders: [], intervals: [], hud: [], longTasks: [], last: null, state: null };
    window.performanceAudit = audit;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) audit.longTasks.push(entry.duration);
    }).observe({ type: 'longtask' });
    const render = GameRenderer.prototype.render;
    GameRenderer.prototype.render = function (...args) {
      if (this.canvas.id !== 'game' || args[0].state !== 'play') return render.apply(this, args);
      audit.state = args[0].state;
      const now = performance.now();
      if (audit.last !== null) audit.intervals.push(now - audit.last);
      audit.last = now;
      const result = render.apply(this, args);
      audit.renders.push(performance.now() - now);
      return result;
    };
    const updateHud = GameUI.prototype.updateHud;
    GameUI.prototype.updateHud = function (...args) {
      const start = performance.now();
      const result = updateHud.apply(this, args);
      audit.hud.push(performance.now() - start);
      return result;
    };
  });
  const before = await cdp.send('Performance.getMetrics');
  await page.locator('#startBtn').click();
  await page.keyboard.down('s');
  const frames = Number(process.env.PERF_FRAMES || 1200);
  await page.waitForFunction((count) => window.performanceAudit.renders.length >= count, frames, { timeout: 140000 });
  await page.keyboard.up('s');
  await page.locator('#pauseBtn').click();
  const after = await cdp.send('Performance.getMetrics');
  const result = await page.evaluate(() => {
    const audit = window.performanceAudit;
    const summarize = (values) => {
      const sorted = [...values].sort((a, b) => a - b);
      return {
        count: values.length,
        p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
        p95: sorted[Math.ceil(sorted.length * 0.95) - 1] || 0,
        max: sorted.at(-1) || 0,
        over25ms: values.filter((value) => value > 25).length,
        over50ms: values.filter((value) => value > 50).length,
      };
    };
    return {
      render: summarize(audit.renders),
      frameIntervals: summarize(audit.intervals),
      startupIntervals: summarize(audit.intervals.slice(0, 120)),
      sustainedIntervals: summarize(audit.intervals.slice(120)),
      hud: summarize(audit.hud),
      longTasks: audit.longTasks,
      score: document.querySelector('#score').textContent,
      pauseVisible: !document.querySelector('#pause').classList.contains('hidden'),
      canvasPixels: document.querySelector('#game').width * document.querySelector('#game').height,
    };
  });
  const metric = (set, name) => set.metrics.find((item) => item.name === name)?.value || 0;
  result.cpuThrottle = 6;
  result.viewport = '1180x760';
  result.metrics = Object.fromEntries(['LayoutCount', 'LayoutDuration', 'RecalcStyleCount', 'RecalcStyleDuration', 'TaskDuration'].map((name) => [name, metric(after, name) - metric(before, name)]));
  result.heapBytes = metric(after, 'JSHeapUsedSize');
  expect(result.pauseVisible).toBe(true);
  expect(Number(result.score)).toBeGreaterThan(500);
  await testInfo.attach('performance-audit', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
  if (process.env.PERF_REPORT) await writeFile(process.env.PERF_REPORT, `${JSON.stringify(result, null, 2)}\n`);
});
