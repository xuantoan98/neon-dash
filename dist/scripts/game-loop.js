import { GAME_CONFIG } from './config.js';

/** Run physics at 60 Hz regardless of the display's refresh rate. */
export class GameLoop {
  constructor({
    update,
    render,
    requestFrame = (callback) => window.requestAnimationFrame(callback),
    cancelFrame = (id) => window.cancelAnimationFrame(id),
  }) {
    this.update = update;
    this.render = render;
    this.requestFrame = requestFrame;
    this.cancelFrame = cancelFrame;
    this.running = false;
    this.frameId = null;
    this.resetClock();
    this.tick = this.tick.bind(this);
  }

  resetClock() {
    this.lastTime = null;
    this.accumulator = 0;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.resetClock();
    this.frameId = this.requestFrame(this.tick);
  }

  stop() {
    this.running = false;
    if (this.frameId !== null) this.cancelFrame(this.frameId);
    this.frameId = null;
    this.resetClock();
  }

  tick(time) {
    if (!this.running) return;
    this.frameId = null;
    const step = GAME_CONFIG.frameDuration;
    if (this.lastTime !== null) {
      // Discard long gaps (suspended tab, debugger, etc.), as the original loop did.
      this.accumulator += Math.max(
        0,
        Math.min(time - this.lastTime, step * GAME_CONFIG.maxFrameDelta),
      );
    }
    this.lastTime = time;

    while (this.running && this.accumulator + 1e-8 >= step) {
      this.accumulator = Math.max(0, this.accumulator - step);
      this.update(1);
    }
    if (!this.running) return;
    this.render(this.accumulator / step);
    if (this.running) this.frameId = this.requestFrame(this.tick);
  }
}
