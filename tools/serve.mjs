import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const devWorker = new URL('./dev-sw.js', import.meta.url);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};
const port = Number(process.env.PORT || 4173);

export function createStaticServer(directory = root, { development = false } = {}) {
  return createServer(async (request, response) => {
    try {
      const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const file = resolve(directory, `.${path.endsWith('/') ? `${path}index.html` : path}`);
      if (!file.startsWith(`${resolve(directory)}${sep}`)) {
        response.writeHead(403).end();
        return;
      }
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405, { Allow: 'GET, HEAD' }).end();
        return;
      }
      let body = await readFile(development && path === '/sw.js' ? devWorker : file);
      if (development && extname(file) === '.html') {
        body = body
          .toString('utf8')
          .replace('<head>', '<head>\n    <meta name="neon-dash-dev" content="true" />');
      }
      response.writeHead(200, {
        'Content-Type': types[extname(file)] || 'application/octet-stream',
        'Cache-Control': development ? 'no-store' : 'no-cache',
      });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch {
      response.writeHead(404).end('Not found');
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const development = !process.argv.includes('--preview');
  const server = createStaticServer(root, { development });
  server.listen(port, '127.0.0.1', () =>
    console.log(
      `Neon Dash (${development ? 'dev, no cache' : 'PWA preview'}): http://127.0.0.1:${port}`,
    ),
  );
}
