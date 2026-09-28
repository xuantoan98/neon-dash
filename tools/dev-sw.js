// Served only by the development server at /sw.js. Never shipped in dist/.
// Replaces an installed PWA worker, then leaves every request to the network.
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const scope = new URL(self.registration.scope);
      const prefix = `neon-dash:${scope.pathname}:`;
      for (const key of await caches.keys()) {
        if (key.startsWith(prefix)) await caches.delete(key);
      }
      await self.clients.claim();
      const clients = await self.clients.matchAll({ type: 'window' });
      // One reload on migration replaces any page still rendered from the old cache.
      for (const client of clients) {
        const url = new URL(client.url);
        if (url.origin === scope.origin && url.pathname.startsWith(scope.pathname)) {
          // Navigation waits for activation. Do not await it inside activate's waitUntil.
          void client.navigate(client.url).catch(() => {});
        }
      }
    })(),
  );
});
