import { GameRenderer } from './renderer.js';
import { SKINS, SCENES } from './content.js';
import { prefersReducedMotion } from './preferences.js';

// A display-only scene: opening settings never advances the player's run.
export function createSettingsPreview({ dialog, preferences }) {
  const canvas = document.getElementById('settingsPreview');
  const renderer = new GameRenderer(canvas);
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const scene = {
    state: 'menu',
    time: 0,
    distance: 0,
    shake: 0,
    fox: { x: 0, y: 0, h: 54, frame: 0, duck: false },
    orbs: [{ x: 0, y: 0, t: 0 }],
    obstacles: [{ type: 'barrier', x: 0, y: 0, w: 30, h: 40 }],
    particles: [],
  };
  let frameId = null;
  let previousTime = null;
  let disposed = false;

  function stop() {
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
    previousTime = null;
  }

  function draw() {
    if (!dialog.open || document.hidden || disposed) return;
    if (renderer.width !== canvas.clientWidth || renderer.height !== canvas.clientHeight) {
      renderer.resize();
    }
    scene.fox.x = renderer.width * 0.22;
    scene.fox.y = renderer.ground - scene.fox.h;
    scene.orbs[0].x = renderer.width * 0.52;
    scene.orbs[0].y = renderer.ground - 42;
    scene.obstacles[0].x = renderer.width * 0.76;
    scene.obstacles[0].y = renderer.ground - 40;
    renderer.render(scene);
  }

  function tick(time) {
    frameId = null;
    if (!dialog.open || document.hidden || disposed) return;
    const delta = previousTime === null ? 0 : Math.min(time - previousTime, 50) / 16.667;
    previousTime = time;
    scene.time += delta;
    scene.distance += delta * 3;
    scene.fox.frame += delta * 0.18;
    scene.orbs[0].t += delta * 0.035;
    draw();
    frameId = requestAnimationFrame(tick);
  }

  function refresh() {
    stop();
    if (disposed) return;
    const value = preferences.value;
    const reduce = prefersReducedMotion(value, motionQuery.matches);
    renderer.skin = SKINS[value.skin];
    renderer.scene = SCENES[value.scene];
    renderer.lowQuality = value.quality === 'low';
    renderer.reducedMotionOverride = reduce;
    const appearance = `${renderer.skin.name} · ${renderer.scene.name}`;
    const quality = renderer.lowQuality ? 'Ánh sáng nhẹ' : 'Đầy đủ ánh sáng';
    const motion = reduce ? 'Giảm hiệu ứng · Xem trước tĩnh' : 'Chuyển động bật';
    document.getElementById('previewAppearance').textContent = appearance;
    document.getElementById('previewQuality').textContent = quality;
    document.getElementById('previewMotion').textContent = motion;
    canvas.setAttribute('aria-label', `${appearance}. ${quality}. ${motion}.`);
    const volume = value.sound ? value.volume : 0;
    document.getElementById('previewVolume').value = volume;
    document.getElementById('previewSound').textContent =
      volume > 0 ? `Âm lượng ${Math.round(volume * 100)}%` : 'Đã tắt tiếng';
    document.getElementById('previewSoundBtn').disabled = volume === 0;
    draw();
    if (dialog.open && !document.hidden && !reduce) frameId = requestAnimationFrame(tick);
  }

  const unsubscribe = preferences.subscribe(refresh);
  const resizeObserver = new ResizeObserver(() => draw());
  resizeObserver.observe(canvas);
  motionQuery.addEventListener('change', refresh, options);
  document.addEventListener('visibilitychange', refresh, options);
  dialog.addEventListener('close', stop, options);
  window.addEventListener('pagehide', stop, options);
  window.addEventListener('pageshow', refresh, options);

  return {
    refresh,
    dispose() {
      disposed = true;
      stop();
      unsubscribe();
      resizeObserver.disconnect();
      controller.abort();
    },
  };
}
