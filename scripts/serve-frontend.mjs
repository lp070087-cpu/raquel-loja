import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const port = Number(process.env.FRONTEND_PORT || 8000);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.webp': 'image/webp' };
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const name = decodeURIComponent(url.pathname);
    const segments = name.split('/').filter(Boolean);
    // Não servir código do servidor, configuração, Git, evidências ou segredos.
    if (segments.some((p) => p.startsWith('.') || p === '..') || ['backend', 'node_modules', 'tests', 'scripts', 'evidence'].includes(segments[0])) {
      res.writeHead(404).end(); return;
    }
    let file = path.resolve(root, '.' + name);
    if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(404).end(); return; }
    if (name.endsWith('/')) file = path.join(file, 'index.html');
    else if (!path.extname(file)) file += '.html';
    if (!(await stat(file)).isFile()) throw new Error('not file');
    const type = mime[path.extname(file)];
    if (!type) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
    res.end(await readFile(file));
  } catch { res.writeHead(404).end('Página não encontrada'); }
}).listen(port, '127.0.0.1', () => console.log(`Frontend: http://localhost:${port}`));
