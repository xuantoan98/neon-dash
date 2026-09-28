import assert from 'node:assert/strict';
import test from 'node:test';
import { bindControls } from '../dist/scripts/controls.js';
import { GameUI } from '../dist/scripts/ui.js';

class FakeElement extends EventTarget {
  constructor(id) {
    super();
    this.id = id;
    this.textContent = '';
    this.style = {};
    this.captures = new Set();
    this.classes = new Set(id === 'over' ? ['hidden'] : []);
    this.classList = {
      add: (name) => this.classes.add(name),
      remove: (name) => this.classes.delete(name),
      toggle: (name, on) => (on ? this.classes.add(name) : this.classes.delete(name)),
    };
  }

  closest(selector) {
    return this.id.endsWith('Btn') && selector.startsWith('button') ? this : null;
  }

  setPointerCapture(id) {
    this.captures.add(id);
  }
  hasPointerCapture(id) {
    return this.captures.has(id);
  }
  releasePointerCapture(id) {
    this.captures.delete(id);
  }
  animate() {
    return {
      cancel: () => {
        this.animationCancelled = true;
      },
    };
  }
}

function setGlobal(t, name, value) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, name, previous);
    else delete globalThis[name];
  });
}

function environment(t) {
  const ids = [
    'startBtn',
    'retryBtn',
    'jumpBtn',
    'duckBtn',
    'start',
    'over',
    'score',
    'best',
    'final',
    'fill',
    'combo',
    'flash',
    'newbest',
    'gameStatus',
  ];
  const elements = new Map(ids.map((id) => [id, new FakeElement(id)]));
  const win = new EventTarget();
  const doc = new EventTarget();
  doc.getElementById = (id) => elements.get(id);
  doc.hidden = false;
  const timers = new Map();
  let timerId = 0;
  win.setTimeout = (callback) => {
    const id = ++timerId;
    timers.set(id, callback);
    return id;
  };
  win.clearTimeout = (id) => timers.delete(id);
  setGlobal(t, 'window', win);
  setGlobal(t, 'document', doc);
  return {
    win,
    doc,
    elements,
    timers,
    advanceTimers() {
      const callbacks = [...timers.values()];
      timers.clear();
      callbacks.forEach((callback) => callback());
    },
  };
}

function dispatch(target, type, properties = {}) {
  const event = new Event(type, { cancelable: true });
  for (const [key, value] of Object.entries(properties)) {
    Object.defineProperty(event, key, { value });
  }
  target.dispatchEvent(event);
  return event;
}

function controls(t) {
  const env = environment(t);
  const calls = [];
  const game = { canvas: new FakeElement('game') };
  for (const action of ['duck', 'jump', 'pause', 'togglePause', 'resize', 'startRun']) {
    game[action] = (...args) => calls.push([action, ...args]);
  }
  const dispose = bindControls(game);
  t.after(dispose);
  return { ...env, game, calls, dispose };
}

test('holding jump or pause does not trigger repeated gameplay actions', (t) => {
  const { win, calls } = controls(t);
  for (const code of ['Space', 'ArrowUp', 'KeyP']) {
    assert.equal(dispatch(win, 'keydown', { code }).defaultPrevented, true);
    assert.equal(dispatch(win, 'keydown', { code, repeat: true }).defaultPrevented, true);
  }
  assert.equal(calls.filter(([action]) => action === 'jump').length, 2);
  assert.equal(calls.filter(([action]) => action === 'togglePause').length, 1);
});

test('duck remains held until every keyboard and pointer source is released', (t) => {
  const { win, elements, calls } = controls(t);
  const duck = elements.get('duckBtn');
  dispatch(win, 'keydown', { code: 'ArrowDown' });
  dispatch(win, 'keydown', { code: 'KeyS' });
  dispatch(duck, 'pointerdown', { button: 0, pointerId: 7 });
  assert.equal(duck.hasPointerCapture(7), true);
  dispatch(win, 'keyup', { code: 'ArrowDown' });
  dispatch(win, 'keyup', { code: 'KeyS' });
  assert.deepEqual(calls.at(-1), ['duck', true]);
  // Release is delivered outside the button, as when a finger slides off it.
  dispatch(win, 'pointerup', { pointerId: 7 });
  assert.deepEqual(calls.at(-1), ['duck', false]);
  dispatch(duck, 'pointerdown', { button: 0, pointerId: 8 });
  dispatch(duck, 'lostpointercapture', { pointerId: 8 });
  assert.deepEqual(calls.at(-1), ['duck', false]);
  dispatch(duck, 'pointerdown', { button: 0, pointerId: 9 });
  dispatch(win, 'pointercancel', { pointerId: 9 });
  assert.deepEqual(calls.at(-1), ['duck', false]);
});

test('blur and hiding the page release duck and pause without toggling it back', (t) => {
  const { win, doc, calls } = controls(t);
  dispatch(win, 'keydown', { code: 'ArrowDown' });
  dispatch(win, 'blur');
  assert.deepEqual(calls.slice(-2), [['duck', false], ['pause']]);
  doc.hidden = true;
  dispatch(doc, 'visibilitychange');
  assert.deepEqual(calls.slice(-2), [['duck', false], ['pause']]);
  const count = calls.length;
  doc.hidden = false;
  dispatch(doc, 'visibilitychange');
  assert.equal(calls.length, count, 'returning to the page requires explicit resume');
  assert.equal(
    calls.some(([action]) => action === 'togglePause'),
    false,
  );
});

test('touch buttons support keyboard input and do not double jump on pointer click', (t) => {
  const { win, elements, calls } = controls(t);
  const jump = elements.get('jumpBtn');
  const duck = elements.get('duckBtn');
  dispatch(jump, 'pointerdown', { button: 0 });
  dispatch(jump, 'click', { detail: 1 });
  assert.deepEqual(calls, [['jump']]);
  dispatch(jump, 'click', { detail: 0 });
  assert.deepEqual(calls.at(-1), ['jump']);
  assert.equal(calls.length, 2, 'assistive-technology activation still works');
  assert.equal(dispatch(win, 'keydown', { code: 'Enter', target: jump }).defaultPrevented, true);
  assert.equal(calls.length, 3);
  for (const code of ['Space', 'Enter']) {
    assert.equal(dispatch(win, 'keydown', { code, target: duck }).defaultPrevented, true);
    assert.deepEqual(calls.at(-1), ['duck', true]);
    dispatch(win, 'keyup', { code });
    assert.deepEqual(calls.at(-1), ['duck', false]);
  }
});

test('editing text and modified shortcuts do not control the game', (t) => {
  const { win, calls } = controls(t);
  dispatch(win, 'keydown', { code: 'Space', ctrlKey: true });
  dispatch(win, 'keydown', { code: 'ArrowUp', altKey: true });
  dispatch(win, 'keydown', { code: 'KeyP', metaKey: true });
  dispatch(win, 'keydown', { code: 'KeyS', target: { isContentEditable: true } });
  dispatch(win, 'keydown', { code: 'Space', target: { closest: () => ({ tagName: 'INPUT' }) } });
  assert.deepEqual(calls, []);
});

test('disposing controls removes listeners and is safe to repeat', (t) => {
  const { win, doc, elements, game, calls, dispose } = controls(t);
  dispatch(elements.get('duckBtn'), 'pointerdown', { button: 0, pointerId: 2 });
  dispose();
  assert.equal(elements.get('duckBtn').hasPointerCapture(2), false);
  assert.deepEqual(calls.at(-1), ['duck', false]);
  const count = calls.length;
  dispose();
  dispatch(win, 'keydown', { code: 'Space' });
  dispatch(win, 'blur');
  dispatch(win, 'resize');
  dispatch(elements.get('startBtn'), 'click');
  dispatch(elements.get('jumpBtn'), 'pointerdown', { button: 0 });
  dispatch(game.canvas, 'pointerdown', { button: 0, pointerType: 'touch' });
  doc.hidden = true;
  dispatch(doc, 'visibilitychange');
  assert.equal(calls.length, count);
});

test('retrying during the death transition cancels the old overlay and flash', (t) => {
  const { elements, timers, advanceTimers } = environment(t);
  const ui = new GameUI();
  ui.showGameOver(100, 100, true);
  assert.equal(timers.size, 1);
  ui.showRunningState();
  advanceTimers();
  assert.equal(elements.get('over').classes.has('hidden'), true);
  assert.equal(elements.get('flash').animationCancelled, true);
  assert.equal(elements.get('newbest').classes.has('show'), false);
  assert.equal(elements.get('score').textContent, '00000');
  ui.showGameOver(200, 200, true);
  advanceTimers();
  assert.equal(elements.get('over').classes.has('hidden'), false);
  assert.equal(elements.get('final').textContent, '00200');
});

test('game over still appears when the animation API is unavailable', (t) => {
  const { elements, advanceTimers } = environment(t);
  elements.get('flash').animate = undefined;
  const ui = new GameUI();
  ui.showGameOver(10, 20, false);
  advanceTimers();
  assert.equal(elements.get('over').classes.has('hidden'), false);
  assert.equal(elements.get('final').textContent, '00010');
});

test('UI cleanup cancels pending transitions and pause status is announced', (t) => {
  const { elements, timers, advanceTimers } = environment(t);
  const ui = new GameUI();
  ui.setPaused(true);
  assert.match(elements.get('gameStatus').textContent, /Đã tạm dừng/);
  ui.setPaused(false);
  assert.match(elements.get('gameStatus').textContent, /Đang chạy/);
  ui.showGameOver(100, 100, true);
  ui.dispose();
  ui.dispose();
  assert.equal(timers.size, 0);
  advanceTimers();
  assert.equal(elements.get('over').classes.has('hidden'), true);
});
