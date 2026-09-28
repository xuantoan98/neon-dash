import assert from 'node:assert/strict';
import test from 'node:test';
import { GAME_CONFIG } from '../dist/scripts/config.js';
import { registerModelContextTools } from '../dist/scripts/model-context.js';
import { loadBestScore, saveBestScore } from '../dist/scripts/storage.js';

function replaceGlobal(t, name, descriptor) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, ...descriptor });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, name, previous);
    else delete globalThis[name];
  });
}

test('best score survives saving and reloading with its existing storage key', (t) => {
  const records = new Map();
  replaceGlobal(t, 'localStorage', {
    value: {
      getItem: (key) => records.get(key) ?? null,
      setItem: (key, value) => records.set(key, value),
    },
  });

  assert.equal(loadBestScore(), 0);
  saveBestScore(1234);
  assert.equal(records.get(GAME_CONFIG.bestScoreKey), '1234');
  assert.equal(loadBestScore(), 1234);

  for (const score of [NaN, Infinity, -Infinity, -1, undefined]) {
    saveBestScore(score);
    assert.equal(loadBestScore(), 1234, 'invalid writes must preserve the existing record');
  }
});

test('corrupt, negative, and non-finite stored scores safely fall back to zero', (t) => {
  let storedScore;
  replaceGlobal(t, 'localStorage', { value: { getItem: () => storedScore } });

  for (storedScore of [null, '', 'invalid', 'NaN', 'Infinity', '-Infinity', '-42']) {
    assert.equal(loadBestScore(), 0, `unexpected result for ${storedScore}`);
  }
  storedScore = '9001';
  assert.equal(loadBestScore(), 9001);
});

test('storage access denial and quota failures do not stop the game', (t) => {
  replaceGlobal(t, 'localStorage', {
    get() {
      throw new Error('Storage access denied');
    },
  });
  assert.equal(loadBestScore(), 0);
  assert.doesNotThrow(() => saveBestScore(25));

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem() {
        throw new Error('Read denied');
      },
      setItem() {
        throw new Error('Quota exceeded');
      },
    },
  });
  assert.equal(loadBestScore(), 0);
  assert.doesNotThrow(() => saveBestScore(25));
});

test('model tools keep their original response contracts and share cancellable registration', (t) => {
  const registered = new Map();
  const signals = [];
  const modelContext = {
    registerTool(tool, { signal }) {
      assert.equal(this, modelContext);
      registered.set(tool.name, tool);
      signals.push(signal);
    },
  };
  replaceGlobal(t, 'document', { value: { modelContext } });
  const game = {
    state: 'menu',
    score: 10.75,
    best: 85,
    combo: 3,
    startRun() {
      this.state = 'play';
      this.score = 0;
      this.combo = 1;
    },
    getStatus() {
      return {
        status: this.state,
        score: Math.floor(this.score),
        best: this.best,
        combo: this.combo,
      };
    },
  };

  const cleanup = registerModelContextTools(game);
  const read = registered.get('read_neon_dash_status');
  const start = registered.get('start_neon_dash_run');
  assert.equal(registered.size, 2);
  assert.equal(read.annotations.readOnlyHint, true);
  assert.equal(start.annotations.readOnlyHint, false);
  assert.deepEqual(read.execute(), { status: 'menu', score: 10, best: 85, combo: 3 });
  assert.equal(game.score, 10.75, 'reading status must not mutate the game');
  assert.deepEqual(start.execute(), { status: 'running', score: 0, best: 85 });
  assert.deepEqual(read.execute(), { status: 'play', score: 0, best: 85, combo: 1 });
  assert.equal(signals[0], signals[1]);
  assert.equal(signals[0].aborted, false);
  cleanup();
  assert.equal(signals[0].aborted, true);
  assert.doesNotThrow(cleanup);
});

test('missing or inaccessible model context provides harmless cleanup', (t) => {
  replaceGlobal(t, 'document', { value: undefined, writable: true });
  for (const document of [
    undefined,
    {},
    { modelContext: {} },
    { modelContext: { registerTool: true } },
  ]) {
    globalThis.document = document;
    const cleanup = registerModelContextTools({});
    assert.equal(typeof cleanup, 'function');
    assert.doesNotThrow(cleanup);
  }
  globalThis.document = {
    get modelContext() {
      throw new Error('Unavailable');
    },
  };
  assert.doesNotThrow(() => registerModelContextTools({})());
});

test('a synchronous registration failure does not prevent the second registration', (t) => {
  const attempted = [];
  replaceGlobal(t, 'document', {
    value: {
      modelContext: {
        registerTool(tool) {
          attempted.push(tool.name);
          if (attempted.length === 1) throw new Error('Registration rejected');
        },
      },
    },
  });

  const cleanup = registerModelContextTools({});
  assert.deepEqual(attempted, ['start_neon_dash_run', 'read_neon_dash_status']);
  cleanup();
});

test('asynchronous registration failures are handled independently', async (t) => {
  const attempted = [];
  replaceGlobal(t, 'document', {
    value: {
      modelContext: {
        registerTool(tool) {
          attempted.push(tool.name);
          return Promise.reject(new Error('Registration rejected'));
        },
      },
    },
  });

  const cleanup = registerModelContextTools({});
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(attempted, ['start_neon_dash_run', 'read_neon_dash_status']);
  cleanup();
});
