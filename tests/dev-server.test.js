import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStaticServer } from '../tools/serve.mjs';

test('dev serves current files without caches and leaves PWA preview unchanged', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'neon-dash-server-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(join(directory, 'index.html'), '<html><head></head><body>first</body></html>');
  await writeFile(join(directory, 'sw.js'), '// production-worker');
  for (const development of [true, false]) {
    const server = createStaticServer(directory, { development });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    try {
      const page = await fetch(origin);
      assert.equal(page.headers.get('cache-control'), development ? 'no-store' : 'no-cache');
      assert.equal((await page.text()).includes('neon-dash-dev'), development);
      const worker = await (await fetch(`${origin}/sw.js`)).text();
      assert.equal(worker.includes('self.skipWaiting()'), development);
      if (!development) assert.equal(worker, '// production-worker');
      await writeFile(
        join(directory, 'index.html'),
        '<html><head></head><body>edited</body></html>',
      );
      assert.match(await (await fetch(origin)).text(), /edited/);
      assert.equal((await fetch(origin, { method: 'POST' })).status, 405);
      assert.equal(await (await fetch(origin, { method: 'HEAD' })).text(), '');
    } finally {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  }
});
