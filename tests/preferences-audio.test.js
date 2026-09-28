import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Preferences,
  sanitizePreferences,
  prefersReducedMotion,
  PREFERENCES_KEY,
} from '../dist/scripts/preferences.js';
import { GameAudio } from '../dist/scripts/audio.js';
import { PerformanceMeter } from '../dist/scripts/performance.js';

function global(t, name, value) {
  const old = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, value });
  t.after(() => {
    if (old) Object.defineProperty(globalThis, name, old);
    else delete globalThis[name];
  });
}

test('preferences sanitize corrupt values and survive reload without touching best score', (t) => {
  const data = new Map([['neonDashBest', '100']]);
  global(t, 'localStorage', {
    getItem: (key) => data.get(key),
    setItem: (key, value) => data.set(key, value),
  });
  const prefs = new Preferences();
  prefs.update({ sound: false, volume: 10, motion: 'on', tutorialSeen: true });
  assert.equal(new Preferences().value.sound, false);
  assert.equal(new Preferences().value.volume, 1);
  assert.equal(data.get('neonDashBest'), '100');
  data.set(PREFERENCES_KEY, '{bad');
  assert.equal(new Preferences().value.sound, true);
  assert.equal(sanitizePreferences({ volume: NaN, motion: 'invalid' }).motion, 'system');
});

test('preferences remain usable when storage is blocked and subscriptions can be removed', (t) => {
  global(t, 'localStorage', {
    getItem() {
      throw new Error();
    },
    setItem() {
      throw new Error();
    },
  });
  const prefs = new Preferences();
  let updates = 0;
  const unsubscribe = prefs.subscribe(() => updates++);
  prefs.update({ quality: 'low' });
  unsubscribe();
  prefs.update({ sound: false });
  assert.equal(updates, 2);
  assert.equal(prefersReducedMotion({ motion: 'system' }, true), true);
  assert.equal(prefersReducedMotion({ motion: 'off' }, true), false);
});

test('audio starts only on unlock, caps voices, and releases resources when muted/paused/disposed', (t) => {
  let contexts = 0;
  const param = () => ({
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
  });
  class Context {
    constructor() {
      contexts++;
      this.state = 'running';
      this.currentTime = 0;
    }
    createOscillator() {
      return {
        frequency: param(),
        connect: (gain) => gain,
        start() {},
        stop() {},
        disconnect() {},
      };
    }
    createGain() {
      return { gain: param(), connect() {}, disconnect() {} };
    }
    suspend() {
      this.state = 'suspended';
      return Promise.resolve();
    }
    resume() {
      this.state = 'running';
      return Promise.resolve();
    }
    close() {
      this.state = 'closed';
      return Promise.resolve();
    }
  }
  global(t, 'window', { AudioContext: Context });
  const audio = new GameAudio();
  audio.play('start');
  assert.equal(contexts, 0);
  audio.unlock();
  for (let i = 0; i < 50; i++) audio.play('orb');
  assert.equal(audio.voices.size, 8);
  audio.suspend();
  assert.equal(audio.voices.size, 0);
  assert.equal(audio.context.state, 'suspended');
  audio.unlock();
  audio.play('jump');
  audio.configure({ sound: false, volume: 0.3 });
  assert.equal(audio.voices.size, 0);
  audio.dispose();
  audio.unlock();
  assert.equal(contexts, 1);
  assert.equal(audio.context.state, 'closed');
});

test('audio gracefully supports browsers without Web Audio', (t) => {
  global(t, 'window', {});
  const audio = new GameAudio();
  assert.doesNotThrow(() => {
    audio.unlock();
    audio.play('jump');
    audio.suspend();
    audio.dispose();
  });
});

test('performance measurements are bounded after thousands of frames', () => {
  const meter = new PerformanceMeter(30);
  for (let i = 0; i < 5000; i++) meter.measure(() => {});
  assert.equal(meter.samples.length, 30);
  assert.equal(meter.summary().samples, 30);
  assert.ok(Number.isFinite(meter.summary().renderP95));
});
