/* Generated manifest is content-addressed; update imports are fetched without HTTP cache. */
importScripts('./precache-manifest.js');
const scopePath = new URL(self.registration.scope).pathname;
const prefix = `neon-dash:${scopePath}:`;
const cacheName = `${prefix}${self.__PRECACHE.revision}`;
const appShell = new URL('./index.html', self.registration.scope).href;
const assetURLs = new Set(
  self.__PRECACHE.files.map((file) => new URL(file, self.registration.scope).href),
);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll([...assetURLs])));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith(prefix) && key !== cacheName) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'ACTIVATE_UPDATE') void self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(scopePath)) return;
  // Never mix freshly fetched modules with the old shell during a version update.
  if (
    event.request.mode === 'navigate' &&
    (url.pathname === scopePath || url.pathname === `${scopePath}index.html`)
  ) {
    event.respondWith(
      caches
        .open(cacheName)
        .then(async (cache) => (await cache.match(appShell)) || fetch(event.request)),
    );
  } else if (assetURLs.has(url.href)) {
    event.respondWith(
      caches
        .open(cacheName)
        .then(async (cache) => (await cache.match(event.request)) || fetch(event.request)),
    );
  }
});
