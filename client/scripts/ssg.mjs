/**
 * Build-time rendering (SSG) of every public page.
 *
 * Runs after `vite build` + `vite build --ssr` (see build:prod). For each
 * public URL it calls the real React app (dist-ssr/entry-server.js) with that
 * page's data fetched from the API, and writes the full HTML — the same page
 * a shopper sees, not a hand-built copy:
 *
 *   dist-prerender/ssg/index.html                        home page ("/")
 *   dist-prerender/ssg/products/index.html               shop listing
 *   dist-prerender/ssg/category/<slug>/index.html        category pages
 *   dist-prerender/ssg/products/<id>/index.html          variant chooser (shop grid → here; not in the sitemap)
 *   dist-prerender/ssg/product/<id>/index.html           product pages
 *   dist-prerender/ssg/product/<id>/<sku>/index.html     variant pages (ad / feed landing URLs)
 *   dist-prerender/ssg/blog/index.html, blog/<slug>/…     journal list and posts (Admin → Blog)
 *   dist-prerender/ssg/about-us/index.html, …            static pages
 *   dist-prerender/ssg/__404/index.html                  not-found page (Worker sends it with HTTP 404)
 *   dist/sitemap.xml, dist/llms.txt
 *
 * jenkins/scripts/upload-client.sh uploads them under the ssg/ prefix and the
 * Cloudflare Worker serves ssg/<path>/index.html for <path> (infra/cloudflare/).
 * The browser hydrates this HTML (main.jsx, window.__SSR__).
 *
 * Never fails the build: a page that can't render is skipped and that URL
 * falls back to the SPA shell exactly as before. If the API is down nothing
 * is rendered and the site deploys as a plain SPA.
 *
 * Env: VITE_API_BASE_URL (or SSR_API_URL) — the API to read products from.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadEnv } from 'vite';
import { buildPage } from './ssrHtml.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'dist-prerender', 'ssg');
const SITE = 'https://www.urbannook.in';
const BRAND = 'UrbanNook';
const CONCURRENCY = 4;

// Indexable static pages: [path, sitemap priority]. Keep in step with
// AppRoutes.jsx — a path here must be a real page, never the 404.
const STATIC_PAGES = [
  ['/', 1.0], ['/products', 0.9], ['/about-us', 0.5], ['/contact-us', 0.5], ['/faqs', 0.5],
  ['/customize', 0.5], ['/blog', 0.6], ['/customer-support', 0.3], ['/return-policy', 0.3],
  ['/terms-conditions', 0.2], ['/privacy-policy', 0.2],
];
const NOT_FOUND_PROBE = '/__ssg-not-found__';

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Each page is <path>/index.html, so /product/<id> and /product/<id>/<sku> can both exist.
const fileFor = (urlPath) => path.join(OUT, urlPath.replace(/^\//, ''), 'index.html');

async function getJson(api, route) {
  const res = await fetch(`${api}/${route}`, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${route} HTTP ${res.status}`);
  return (await res.json())?.data;
}

/** Every published product (all pages of the listing). */
async function loadProducts(api) {
  const out = [];
  for (let page = 1; page <= 50; page++) {
    const data = await getJson(api, `products?currentPage=${page}&limit=100`);
    const list = data?.listofPublishedProducts || [];
    out.push(...list);
    if (list.length < 100) break;
  }
  return out;
}

/** Run fn over items, CONCURRENCY at a time. */
async function pool(items, fn) {
  let i = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]);
  });
  await Promise.all(workers);
}

function sitemap(entries) {
  // No <lastmod>: the API listing has no reliable per-page date, and a fake
  // "today" on every URL teaches Google to ignore the field.
  const urls = entries.map(({ loc, priority, images = [] }) =>
    `  <url><loc>${SITE}${loc}</loc><priority>${priority}</priority>${images.slice(0, 10)
      .map((src) => `<image:image><image:loc>${esc(src)}</image:loc></image:image>`).join('')}</url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>
`;
}

function llmsTxt(products, categories, posts = []) {
  const lines = products.map((p) => {
    const prices = (p.variantDetails || []).map((v) => Number(v.variantPrice)).filter((n) => n > 0);
    return `- [${p.productName}](${SITE}/product/${p.productId})${prices.length ? `: from ₹${Math.min(...prices)}` : ''}`;
  });
  return `# ${BRAND}

> ${BRAND} (urbannook.in) is an Indian online store for 3D printed home decor, desk lamps, pen stands, anime katanas and lifestyle products. Designed and made in India, shipped pan-India with cash on delivery.

## Store information
- [All products](${SITE}/products)
- [About us](${SITE}/about-us)
- [FAQs](${SITE}/faqs)
- [Return policy](${SITE}/return-policy)
- [Contact](${SITE}/contact-us)

## Categories
${categories.map((c) => `- [${c.name || c.slug}](${SITE}/category/${c.slug})`).join('\n')}

## Journal
${posts.map((b) => `- [${b.title}](${SITE}/blog/${b.slug})${b.excerpt ? `: ${b.excerpt}` : ''}`).join('\n')}

## Products
${lines.join('\n')}
`;
}

async function main() {
  const env = loadEnv(process.env.MODE || 'production', ROOT, 'VITE_');
  const api = (process.env.SSR_API_URL || process.env.VITE_API_BASE_URL || env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  fs.rmSync(OUT, { recursive: true, force: true });
  if (!api) { console.warn('[ssg] no API URL (VITE_API_BASE_URL) — skipped, site deploys as SPA'); return; }
  // entry-server.jsx reads the API from SSR_API_URL when running on the server.
  process.env.SSR_API_URL = api;

  const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  const { render } = await import(pathToFileURL(path.join(ROOT, 'dist-ssr', 'entry-server.js')).href);

  let products = [];
  let categories = [];
  let posts = [];
  try {
    [products, categories] = await Promise.all([
      loadProducts(api),
      // Optional: an older API without GET /categories still renders everything else.
      getJson(api, 'categories').then((d) => d || []).catch((err) => { console.warn(`[ssg] no categories (${err.message})`); return []; }),
    ]);
    // Optional too: an API without GET /blog renders everything else.
    posts = await getJson(api, 'blog?limit=100').then((d) => d || []).catch((err) => { console.warn(`[ssg] no blog posts (${err.message})`); return []; });
  } catch (err) {
    console.warn(`[ssg] API unavailable (${err.message}) — skipped, site deploys as SPA`);
    return;
  }

  const pages = [
    ...STATIC_PAGES.map(([p]) => p),
    ...categories.map((c) => `/category/${c.slug}`),
    ...posts.map((b) => `/blog/${b.slug}`),
    ...products.flatMap((p) => [
      `/products/${p.productId}`,
      `/product/${p.productId}`,
      ...(p.variantDetails || []).filter((v) => v.sku && v.isActive !== false).map((v) => `/product/${p.productId}/${encodeURIComponent(v.sku)}`),
    ]),
  ];

  let ok = 0;
  const failed = [];
  await pool(pages, async (urlPath) => {
    try {
      const result = await render(urlPath);
      if (!result || result.status !== 200) throw new Error(`status ${result?.status ?? 'none'}`);
      const file = fileFor(urlPath);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, buildPage(template, result));
      ok += 1;
    } catch (err) {
      failed.push(`${urlPath} (${err.message})`);
    }
  });

  // The not-found page, rendered by the app itself (noindex, real content).
  try {
    const nf = await render(NOT_FOUND_PROBE);
    if (nf?.status === 404) {
      fs.mkdirSync(OUT, { recursive: true });
      fs.mkdirSync(path.join(OUT, '__404'), { recursive: true });
      fs.writeFileSync(path.join(OUT, '__404', 'index.html'), buildPage(template, nf));
    }
  } catch (err) {
    failed.push(`404 page (${err.message})`);
  }

  // Sitemap lists only pages that rendered (never a URL that would 404).
  const rendered = (p) => fs.existsSync(fileFor(p));
  const entries = [
    ...STATIC_PAGES.filter(([p]) => rendered(p)).map(([loc, priority]) => ({ loc, priority })),
    // Categories with too few products are noindex (API sets indexable: false): keep them out.
    ...categories.filter((c) => c.indexable !== false && rendered(`/category/${c.slug}`)).map((c) => ({ loc: `/category/${c.slug}`, priority: 0.8 })),
    ...posts.filter((b) => rendered(`/blog/${b.slug}`)).map((b) => ({ loc: `/blog/${b.slug}`, priority: 0.6, images: b.coverImage ? [b.coverImage] : [] })),
    ...products.filter((p) => rendered(`/product/${p.productId}`)).map((p) => ({
      loc: `/product/${p.productId}`,
      priority: 0.8,
      images: [...new Set((p.variantDetails || []).flatMap((v) => v.variantImage || []))],
    })),
  ];
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap(entries));
  fs.writeFileSync(path.join(DIST, 'llms.txt'), llmsTxt(products, categories, posts));

  console.log(`[ssg] rendered ${ok}/${pages.length} pages (${products.length} products, ${categories.length} categories, ${posts.length} blog posts), sitemap ${entries.length} URLs`);
  if (failed.length) console.warn(`[ssg] ${failed.length} page(s) left to the SPA shell:\n  ${failed.join('\n  ')}`);
}

main().catch((err) => {
  // Never fail the build: without these files every URL is served by the SPA shell.
  console.warn('[ssg] skipped:', err?.stack || err);
  fs.rmSync(OUT, { recursive: true, force: true });
}).finally(() => process.exit(0)); // render() leaves abort timers running
