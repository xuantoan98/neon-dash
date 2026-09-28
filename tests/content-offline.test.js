import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { evaluateChallenges, SKINS, SCENES } from '../dist/scripts/content.js';
import { sanitizePreferences } from '../dist/scripts/preferences.js';
import { VERSION } from '../dist/scripts/version.js';

test('cosmetics are validated and contain only presentation values', () => {
  const preferences = sanitizePreferences({ skin: 'arctic', scene: 'dawn' });
  assert.equal(preferences.skin, 'arctic');
  assert.equal(preferences.scene, 'dawn');
  assert.equal(sanitizePreferences({ skin: '__proto__', scene: 'invalid' }).skin, 'kitsune');
  for (const skin of Object.values(SKINS))
    assert.deepEqual(Object.keys(skin).sort(), ['body', 'eye', 'legs', 'name', 'shade']);
  assert.equal(Object.keys(SCENES).length, 3);
});

test('challenges are read-only goals and reset for a new run', () => {
  const stats = Object.freeze({ orbs: 7, obstacles: 9 });
  const goals = evaluateChallenges(stats, 600);
  assert.equal(goals.filter((goal) => goal.complete).length, 3);
  assert.equal(goals[0].current, 500);
  assert.equal(
    evaluateChallenges(undefined, 0).some((goal) => goal.complete),
    false,
  );
  assert.equal(stats.orbs, 7);
});

test('release version matches package and PWA manifest references portable local assets', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));
  const manifest = JSON.parse(
    await readFile(new URL('../dist/manifest.webmanifest', import.meta.url)),
  );
  assert.equal(pkg.version, VERSION);
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  for (const icon of manifest.icons)
    assert.ok((await readFile(new URL(`../dist/${icon.src}`, import.meta.url))).length > 0);
});

test('service worker installs atomically, isolates caches, and updates only by request', async () => {
  const handlers = new Map();
  const deleted = [];
  let skipped = 0;
  let claimed = 0;
  let cached = [];
  const self = {
    registration: { scope: 'https://example.test/game/' },
    location: { origin: 'https://example.test' },
    __PRECACHE: { revision: 'new', files: ['./index.html', './scripts/main.js'] },
    addEventListener: (name, fn) => handlers.set(name, fn),
    clients: {
      claim: async () => {
        claimed++;
      },
    },
    skipWaiting: async () => {
      skipped++;
    },
  };
  const caches = {
    open: async () => ({
      addAll: async (files) => {
        cached = files;
      },
      match: async () => 'cached-shell',
    }),
    keys: async () => [
      'other-app',
      'neon-dash:/other/:old',
      'neon-dash:/game/:old',
      'neon-dash:/game/:new',
    ],
    delete: async (key) => deleted.push(key),
  };
  const code = await readFile(new URL('../dist/sw.js', import.meta.url), 'utf8');
  vm.runInNewContext(code, { self, caches, URL, importScripts() {}, fetch: async () => 'network' });
  let pending;
  handlers.get('install')({
    waitUntil: (promise) => {
      pending = promise;
    },
  });
  await pending;
  assert.deepEqual(Array.from(cached), [
    'https://example.test/game/index.html',
    'https://example.test/game/scripts/main.js',
  ]);
  assert.equal(skipped, 0);
  handlers.get('activate')({
    waitUntil: (promise) => {
      pending = promise;
    },
  });
  await pending;
  assert.deepEqual(deleted, ['neon-dash:/game/:old']);
  assert.equal(claimed, 1);
  handlers.get('message')({ data: { type: 'unrelated' } });
  assert.equal(skipped, 0);
  handlers.get('message')({ data: { type: 'ACTIVATE_UPDATE' } });
  assert.equal(skipped, 1);
  let response;
  handlers.get('fetch')({
    request: { method: 'GET', mode: 'navigate', url: 'https://example.test/game/' },
    respondWith: (promise) => {
      response = promise;
    },
  });
  assert.equal(await response, 'cached-shell');
  response = undefined;
  handlers.get('fetch')({
    request: { method: 'GET', mode: 'navigate', url: 'https://example.test/other/' },
    respondWith: (promise) => {
      response = promise;
    },
  });
  assert.equal(response, undefined);
});
