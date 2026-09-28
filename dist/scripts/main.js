import { bindControls } from './controls.js';
import { NeonDashGame } from './game.js';
import { GameLoop } from './game-loop.js';
import { registerModelContextTools } from './model-context.js';
import { GameUI } from './ui.js';
import { GameAudio } from './audio.js';
import { Preferences, prefersReducedMotion } from './preferences.js';
import { bindSettings } from './settings-ui.js';
import { PerformanceMeter } from './performance.js';
import { SKINS, SCENES } from './content.js';
import { setupOffline } from './offline.js';

const canvas = document.getElementById('game');
const ui = new GameUI();
const preferences = new Preferences();
const audio = new GameAudio();
const game = new NeonDashGame(canvas, ui, {
  onEvent(name) {
    if (name === 'pause') audio.suspend();
    else if (name === 'resume') audio.unlock();
    else audio.play(name);
  },
});
const meter = new PerformanceMeter();
let renderKey = '';
const loop = new GameLoop({
  update: (dt) => game.update(dt),
  render: (alpha) => {
    const key = `${game.state}:${game.time}:${game.renderer.revision}:${game.shake}:${game.particles.length}`;
    if (
      key === renderKey &&
      (game.state === 'menu' ||
        game.state === 'paused' ||
        (game.state === 'over' && !game.shake && !game.particles.length))
    )
      return;
    renderKey = key;
    meter.measure(() => game.renderer.render(game, alpha));
  },
});
const lifecycle = new AbortController();
const cleanupOffline = setupOffline();

game.resize();
const unbindControls = bindControls(game);
const unregisterTools = registerModelContextTools(game);
const unbindSettings = bindSettings({ game, preferences, audio });
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
function applyPreferences(value = preferences.value) {
  audio.configure(value);
  const reduce = prefersReducedMotion(value, motionQuery.matches);
  ui.reducedMotionOverride = reduce;
  game.renderer.reducedMotionOverride = reduce;
  game.renderer.lowQuality = value.quality === 'low';
  game.renderer.skin = SKINS[value.skin];
  game.renderer.scene = SCENES[value.scene];
  document.documentElement.dataset.motion = reduce ? 'reduce' : 'full';
  renderKey = '';
}
const unsubscribePreferences = preferences.subscribe(applyPreferences);
motionQuery.addEventListener('change', () => applyPreferences(), { signal: lifecycle.signal });
document.addEventListener('pointerdown', () => audio.unlock(), {
  capture: true,
  signal: lifecycle.signal,
});
document.addEventListener('keydown', () => audio.unlock(), {
  capture: true,
  signal: lifecycle.signal,
});
const tutorial = document.getElementById('tutorial');
tutorial.hidden = preferences.value.tutorialSeen;
document.getElementById('dismissTutorial').addEventListener(
  'click',
  () => {
    tutorial.hidden = true;
    preferences.update({ tutorialSeen: true });
  },
  { signal: lifecycle.signal },
);
const metricsTimer = window.setInterval(() => {
  const summary = meter.summary();
  document.getElementById('performanceInfo').textContent =
    `Vẽ P95: ${summary.renderP95.toFixed(1)} ms · ${summary.samples} mẫu gần nhất`;
}, 3000);

document.addEventListener(
  'visibilitychange',
  () => {
    if (document.hidden) {
      audio.suspend();
      loop.stop();
    } else loop.start();
  },
  { signal: lifecycle.signal },
);

window.addEventListener(
  'pagehide',
  (event) => {
    game.pause();
    loop.stop();
    // Keep registrations/listeners for a back-forward cache restoration.
    if (event.persisted) return;
    unbindControls();
    unregisterTools();
    ui.dispose();
    cleanupOffline();
    audio.dispose();
    unbindSettings();
    unsubscribePreferences();
    window.clearInterval(metricsTimer);
    lifecycle.abort();
  },
  { signal: lifecycle.signal },
);

window.addEventListener(
  'pageshow',
  (event) => {
    if (!event.persisted) return;
    game.resize();
    if (!document.hidden) loop.start();
  },
  { signal: lifecycle.signal },
);

if (!document.hidden) loop.start();
