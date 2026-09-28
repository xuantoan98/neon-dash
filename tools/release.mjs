import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { VERSION } from '../dist/scripts/version.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const releases = resolve(root, 'releases');
await mkdir(releases, { recursive: true });
const manifest = await readFile(resolve(root, 'dist/precache-manifest.js'), 'utf8');
const revision = JSON.parse(
  manifest
    .slice(manifest.indexOf('=') + 1)
    .trim()
    .replace(/;$/, ''),
).revision;
const filename = `neon-dash-${VERSION}-${revision}.tar.gz`;
const target = resolve(releases, filename);
let exists = false;
try {
  await access(target);
  exists = true;
} catch {
  /* New release. */
}
if (!exists) {
  const result = spawnSync('tar', ['-czf', target, 'dist', 'README.md', 'CHANGELOG.md', 'docs'], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const sha256 = createHash('sha256')
  .update(await readFile(target))
  .digest('hex');
await writeFile(`${target}.sha256`, `${sha256}  ${filename}\n`);
console.log(`Release: ${target}\nSHA256: ${sha256}`);
