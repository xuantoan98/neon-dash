import assert from 'node:assert/strict';
import test from 'node:test';
import { GameLoop } from '../dist/scripts/game-loop.js';

function harness() {
  let nextId = 0;
  const pending = new Map();
  const updates = [];
  let renders = 0;
  const loop = new GameLoop({
    update: (dt) => updates.push(dt),
    render: () => {
      renders += 1;
    },
    requestFrame: (callback) => {
      const id = nextId++;
      pending.set(id, callback);
      return id;
    },
    cancelFrame: (id) => pending.delete(id),
  });
  return {
    loop,
    pending,
    updates,
    get renders() {
      return renders;
    },
    frame(time) {
      const callbacks = [...pending.values()];
      pending.clear();
      for (const callback of callbacks) callback(time);
    },
  };
}

test('30, 60, 120, and 144 Hz displays advance exactly the same 60 physics steps per second', () => {
  for (const refreshRate of [30, 60, 120, 144]) {
    const app = harness();
    app.loop.start();
    for (let frame = 0; frame <= refreshRate; frame += 1) app.frame((frame * 1000) / refreshRate);
    assert.equal(app.updates.length, 60, `${refreshRate} Hz must not change gameplay speed`);
    assert.ok(app.updates.every((dt) => dt === 1));
    assert.equal(app.renders, refreshRate + 1);
    app.loop.stop();
  }
});

test('start is idempotent and stop cancels even a zero-valued frame id', () => {
  const app = harness();
  app.loop.start();
  app.loop.start();
  assert.equal(app.pending.size, 1);
  assert.ok(app.pending.has(0));
  app.loop.stop();
  assert.equal(app.pending.size, 0);
  app.frame(100);
  assert.equal(app.renders, 0);
});

test('suspension gaps are capped, and restarting does not catch up elapsed background time', () => {
  const app = harness();
  app.loop.start();
  app.frame(0);
  app.frame(60_000);
  assert.equal(app.updates.length, 2);
  app.loop.stop();
  app.loop.start();
  app.frame(120_000);
  assert.equal(app.updates.length, 2);
  app.frame(120_000 + 1000 / 60);
  assert.equal(app.updates.length, 3);
});

test('stopping inside an update does not render or schedule a new frame', () => {
  const app = harness();
  app.loop.update = () => app.loop.stop();
  app.loop.start();
  app.frame(0);
  app.frame(100);
  assert.equal(app.renders, 1);
  assert.equal(app.pending.size, 0);
});

test('render interpolation advances smoothly between fixed updates at 120 and 144 Hz', () => {
  for (const hz of [120, 144]) {
    const app = harness();
    let previous = 200;
    let current = 200;
    const positions = [];
    app.loop.update = () => {
      previous = current;
      current -= 10;
    };
    app.loop.render = (alpha) => {
      assert.ok(alpha >= 0 && alpha < 1);
      positions.push(previous + (current - previous) * alpha);
    };
    app.loop.start();
    for (let frame = 0; frame <= hz; frame++) app.frame((frame * 1000) / hz);
    for (let frame = 4; frame < positions.length; frame++) {
      assert.ok(Math.abs(positions[frame - 1] - positions[frame] - 600 / hz) < 1e-8);
    }
    assert.equal(current, -400, 'interpolation must not change the 60 Hz simulation');
  }
});
