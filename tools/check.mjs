import { readdir, readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const scripts = resolve(root, 'dist/scripts');
let checked = 0;

for (const name of await readdir(scripts)) {
  if (!name.endsWith('.js')) continue;
  const file = resolve(scripts, name);
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  const source = await readFile(file, 'utf8');
  for (const [, dependency] of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    if (!dependency.startsWith('.'))
      throw new Error(`Browser module must use a relative import: ${name}: ${dependency}`);
    if (!(await stat(resolve(dirname(file), dependency))).isFile()) {
      throw new Error(`Missing module: ${name}: ${dependency}`);
    }
  }
  checked += 1;
}

const html = await readFile(resolve(root, 'dist/index.html'), 'utf8');
for (const [, asset] of html.matchAll(/(?:src|href)="(\.\/[^"?#]+)"/g)) {
  if (!(await stat(resolve(root, 'dist', asset))).isFile())
    throw new Error(`Missing asset: ${asset}`);
}
console.log(`Checked ${checked} JavaScript modules, imports, and local HTML assets.`);
for (const name of ['sw.js', 'precache-manifest.js']) {
  const result = spawnSync(process.execPath, ['--check', resolve(root, 'dist', name)], {
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const fonts = await readFile(resolve(root, 'dist/styles/fonts.css'), 'utf8');
for (const [, asset] of fonts.matchAll(/url\(['"]?(\.\.\/assets\/[^'"\s)]+)['"]?\)/g)) {
  if (!(await stat(resolve(root, 'dist/styles', asset))).isFile())
    throw new Error(`Missing font: ${asset}`);
}
