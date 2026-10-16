// SSR server for the storefront's public pages (home, shop, category, product,
// static pages). Every other path (account, checkout, payment…) gets the plain
// SPA shell, exactly as today. No dependencies beyond Node and Vite.
//
//   npm run dev:ssr      dev, with Vite HMR        (http://localhost:3000)
//   npm run build:ssr    builds dist/ (browser) + dist-ssr/ (server entry)
//   npm run serve:ssr    runs the built server     (PORT, SSR_API_URL)
//
// Env:
//   PORT          default 3000
//   SSR_API_URL   API the server fetches from, e.g. http://localhost:8000/api/v1
//   SERVE_STATIC  "0" to not serve dist/ assets (production: they come from S3)
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPage } from './scripts/ssrHtml.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;
const SERVE_STATIC = process.env.SERVE_STATIC !== '0';

const MIME = {
  '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html; charset=utf-8',
  '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain',
  '.xml': 'application/xml', '.webmanifest': 'application/manifest+json', '.mp4': 'video/mp4',
};

async function serveStatic(req, res, dir) {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (urlPath === '/' || !path.extname(urlPath)) return false;
  const file = path.join(dir, urlPath);
  if (!file.startsWith(dir)) return false;
  try {
    const body = await fs.readFile(file);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': urlPath.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
    });
    res.end(body);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  let vite;
  let prodTemplate;
  let prodRender;
  if (isProd) {
    prodTemplate = await fs.readFile(path.join(ROOT, 'dist/index.html'), 'utf8');
    prodRender = (await import(path.join(ROOT, 'dist-ssr/entry-server.js'))).render;
  } else {
    const { createServer } = await import('vite');
    vite = await createServer({ root: ROOT, server: { middlewareMode: true }, appType: 'custom' });
  }

  const server = http.createServer(async (req, res) => {
    const started = Date.now();
    try {
      if (vite) {
        // Vite serves modules, assets and HMR; falls through for page requests.
        const handled = await new Promise((resolve) => {
          res.once('finish', () => resolve(true));
          vite.middlewares(req, res, () => resolve(false));
        });
        if (handled) return;
      } else if (SERVE_STATIC && await serveStatic(req, res, path.join(ROOT, 'dist'))) {
        return;
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }

      const url = req.url || '/';
      let template = isProd ? prodTemplate : await fs.readFile(path.join(ROOT, 'index.html'), 'utf8');
      if (vite) template = await vite.transformIndexHtml(url, template);
      const render = vite ? (await vite.ssrLoadModule('/src/entry-server.jsx')).render : prodRender;

      let result = null;
      try {
        result = await render(url);
      } catch (err) {
        // Never fail the page: fall back to the SPA shell (the browser renders it).
        vite?.ssrFixStacktrace(err);
        console.error(`[SSR] ${url} failed, sent SPA shell:`, err?.stack || err);
      }

      const html = result ? buildPage(template, result) : template;
      res.writeHead(result?.status || 200, {
        'Content-Type': 'text/html; charset=utf-8',
        // HTML is never cached (same rule as index.html today); data caching
        // happens in the API (System Guide §7).
        'Cache-Control': 'no-cache',
        'X-SSR': result ? '1' : '0',
      });
      res.end(req.method === 'HEAD' ? undefined : html);
      if (result) console.log(`[SSR] ${result.status} ${url} ${Date.now() - started}ms`);
    } catch (err) {
      console.error('[SSR] server error:', err?.stack || err);
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  });

  server.listen(PORT, () => {
    console.log(`[SSR] ${isProd ? 'production' : 'dev'} server on http://localhost:${PORT} (API: ${process.env.SSR_API_URL || 'default'})`);
  });
}

main();
