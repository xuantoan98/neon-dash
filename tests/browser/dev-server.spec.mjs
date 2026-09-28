import { test, expect } from '@playwright/test';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from '../../tools/serve.mjs';

test('an installed PWA migrates to dev and ordinary reload picks up HTML, CSS and JS edits', async ({
  page,
}) => {
  const directory = await mkdtemp(join(tmpdir(), 'neon-dash-dev-browser-'));
  let server;
  const start = async (port, development) => {
    server = createStaticServer(directory, { development });
    await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
    return server.address().port;
  };
  const stop = async () => {
    if (!server) return;
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    server = null;
  };
  try {
    await cp(fileURLToPath(new URL('../../dist/', import.meta.url)), directory, {
      recursive: true,
    });
    const port = await start(0, false);
    await page.goto(`http://127.0.0.1:${port}/`);
    await expect(page.locator('#offlineStatus')).toHaveText('Sẵn sàng chơi offline');
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await page.evaluate(async () => {
      localStorage.setItem('neonDashBest', '1234');
      await caches.open('unrelated-app');
    });
    await page.locator('#settingsBtn').click();
    await page.locator('#skinSetting').selectOption('solar');
    await page.locator('#closeSettings').click();

    await stop();
    await start(port, true);
    await page.reload();
    await expect(page.locator('#offlineStatus')).toHaveText(
      'Chế độ dev · tải lại để nhận thay đổi',
    );
    await expect(page.locator('#best')).toHaveText('01234');
    await expect(page.locator('#skinSetting')).toHaveValue('solar');
    const keys = await page.evaluate(() => caches.keys());
    expect(keys).toContain('unrelated-app');
    expect(keys.some((key) => key.startsWith('neon-dash:/'))).toBe(false);

    const htmlPath = join(directory, 'index.html');
    const cssPath = join(directory, 'styles/main.css');
    const jsPath = join(directory, 'scripts/main.js');
    await writeFile(
      htmlPath,
      (await readFile(htmlPath, 'utf8')).replace(
        /<title>.*?<\/title>/,
        '<title>Dev reload v2</title>',
      ),
    );
    await writeFile(
      cssPath,
      `${await readFile(cssPath, 'utf8')}\n.settings-intro { color: rgb(1, 2, 3); }`,
    );
    await writeFile(
      jsPath,
      `${await readFile(jsPath, 'utf8')}\ndocument.documentElement.dataset.devRevision = 'v2';`,
    );
    // No precache rebuild, hard reload, or storage reset between edits.
    await page.reload();
    await expect(page).toHaveTitle('Dev reload v2');
    await expect(page.locator('html')).toHaveAttribute('data-dev-revision', 'v2');
    await expect(page.locator('.settings-intro')).toHaveCSS('color', 'rgb(1, 2, 3)');
    await expect(page.locator('#best')).toHaveText('01234');
    await expect(page.locator('#skinSetting')).toHaveValue('solar');
  } finally {
    await page.goto('about:blank');
    await stop();
    await rm(directory, { recursive: true, force: true });
  }
});
