/**
 * Post-build SEO prerender.
 *
 * The site is a client-rendered SPA: every URL used to return the same
 * index.html (homepage title, no H1, no JSON-LD). Crawlers that don't run JS —
 * Bing, ChatGPT/Perplexity/Claude bots — saw every product as an empty homepage.
 *
 * This runs after `vite build` and, from the live Google Merchant feed, writes:
 *   dist-prerender/base/product/<id>              product page HTML (canonical)
 *   dist-prerender/variant/product/<id>/<sku>     variant URLs (feed/ad landing pages)
 *   dist/sitemap.xml                              products + static pages, with images
 *   dist/llms.txt                                 plain-text store summary for AI engines
 *
 * The HTML files are extensionless on purpose: the deploy uploads them to the
 * exact S3 keys CloudFront serves for those paths (see prod-deploy.yml). React
 * still mounts into #root and replaces the static content in the browser.
 *
 * Never fails the build — if the feed can't be fetched the site deploys as before.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'dist-prerender');
const SITE = 'https://www.urbannook.in';
const BRAND = 'UrbanNook';

const STATIC_PAGES = [
  ['/', 1.0], ['/products', 0.9], ['/about-us', 0.5], ['/contact-us', 0.5], ['/faqs', 0.5],
  ['/customize', 0.5], ['/return-policy', 0.3], ['/cancellation-refund', 0.3],
  ['/terms-conditions', 0.2], ['/privacy-policy', 0.2],
];

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clip = (s, n) => (s.length <= n ? s : `${s.slice(0, n - 1).replace(/\s+\S*$/, '')}…`);
// JSON inside <script> must not be able to close the tag.
const jsonLd = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

function parseTsv(text) {
  const [head, ...lines] = text.trim().split('\n');
  const cols = head.split('\t');
  return lines.filter(Boolean).map((l) => {
    const cells = l.split('\t');
    return Object.fromEntries(cols.map((c, i) => [c, (cells[i] || '').trim()]));
  });
}

/** Feed rows → products keyed by productId, each with its variants. */
function groupProducts(rows) {
  const byId = new Map();
  for (const r of rows) {
    const m = r.link.match(/\/product\/([^/?#]+)(?:\/([^/?#]+))?/);
    if (!m) continue;
    const [, id, sku] = m;
    if (!byId.has(id)) byId.set(id, { id, category: r.product_type, description: r.description, variants: [] });
    byId.get(id).variants.push({
      sku: sku || null,
      title: r.title,
      price: parseFloat(r.price) || null,
      inStock: r.availability === 'in_stock',
      images: [r.image_link, ...(r.additional_image_link ? r.additional_image_link.split(',') : [])].filter(Boolean),
    });
  }
  for (const p of byId.values()) {
    // Grouped titles are "<name> - <variant>"; the product name is their common prefix.
    const titles = p.variants.map((v) => v.title);
    let prefix = titles[0];
    for (const t of titles) while (!t.startsWith(prefix)) prefix = prefix.slice(0, -1);
    p.name = (titles.length > 1 ? prefix.replace(/[\s-]+$/, '') : titles[0]) || titles[0];
  }
  return [...byId.values()];
}

function productJsonLd(p, url) {
  const offer = (v) => ({
    '@type': 'Offer',
    url: v.sku ? `${SITE}/product/${p.id}/${v.sku}` : url,
    priceCurrency: 'INR',
    price: v.price,
    availability: v.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    itemCondition: 'https://schema.org/NewCondition',
  });
  const base = { '@context': 'https://schema.org', description: p.description, brand: { '@type': 'Brand', name: BRAND } };
  if (p.variants.length === 1) {
    const v = p.variants[0];
    return { ...base, '@type': 'Product', name: p.name, url, image: v.images, sku: v.sku || p.id, offers: offer(v) };
  }
  return {
    ...base,
    '@type': 'ProductGroup',
    name: p.name,
    url,
    productGroupID: p.id,
    hasVariant: p.variants.map((v) => ({
      '@type': 'Product', name: v.title, sku: v.sku || undefined, image: v.images, offers: offer(v),
    })),
  };
}

function breadcrumbJsonLd(p, url) {
  // No category crumb: the feed's product_type is the sub-category when one is
  // set, but the shop filter (?category=) matches productCategory, so a
  // category link could land on an empty list. Collection URLs come in Phase 2.
  const items = [['Home', `${SITE}/`], ['Shop', `${SITE}/products`], [p.name, url]];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })),
  };
}

/** Swap the SPA shell's generic head/body for this product's real content. */
function renderProductHtml(shell, p, variant) {
  const url = `${SITE}/product/${p.id}`; // variants canonicalise to the product
  const v = variant || p.variants.find((x) => x.inStock) || p.variants[0];
  const heading = variant ? v.title : p.name;
  const prices = p.variants.map((x) => x.price).filter(Boolean);
  const from = Math.min(...prices);
  // Keep the "Buy Online in India" hook only when it fits in ~60 chars; otherwise
  // the product name alone (long variant names would otherwise end in "–…").
  const room = 60 - ` | ${BRAND}`.length;
  const withHook = `${heading} – Buy Online in India`;
  const title = `${withHook.length <= room ? withHook : clip(heading, room)} | ${BRAND}`;
  const desc = clip(`${heading} from ₹${v.price || from}. ${p.description} Cash on delivery available, shipped pan-India.`, 155);
  const image = v.images[0] || `${SITE}/assets/logo_with_text.webp`;

  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="product" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(desc)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
    `<script type="application/ld+json">${jsonLd(productJsonLd(p, url))}</script>`,
    `<script type="application/ld+json">${jsonLd(breadcrumbJsonLd(p, url))}</script>`,
  ].join('\n  ');

  const variantLinks = p.variants.length > 1
    ? `<ul>${p.variants.map((x) => `<li><a href="/product/${p.id}/${esc(x.sku || '')}">${esc(x.title)}</a> – ₹${x.price}${x.inStock ? '' : ' (out of stock)'}</li>`).join('')}</ul>`
    : '';
  // Visually hidden (screen-reader pattern) so users never see an unstyled flash
  // before React replaces #root — crawlers read the HTML either way, and it's the
  // same content the React page shows, so it isn't cloaking.
  const body = `
    <main style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap">
      <nav><a href="/">Home</a> / <a href="/products">Shop</a></nav>
      <h1>${esc(heading)}</h1>
      ${p.category ? `<p>Category: ${esc(p.category)}</p>` : ''}
      <img src="${esc(image)}" alt="${esc(heading)}" width="600" height="600" />
      <p>Price: ₹${v.price || from} · ${v.inStock ? 'In stock' : 'Out of stock'} · Cash on delivery · Pan-India delivery</p>
      <p>${esc(p.description)}</p>
      ${variantLinks}
    </main>`;

  return shell
    // Drop the shell's generic tags; the product-specific ones replace them.
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta\s+name="description"[^>]*>/, '')
    .replace(/<meta\s+property="og:(type|title|description|image|url)"[^>]*>/g, '')
    .replace(/<meta\s+name="twitter:(title|description|image)"[^>]*>/g, '')
    .replace('</head>', `  ${head}\n</head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
}

function sitemap(products, today) {
  const urls = STATIC_PAGES.map(([p, prio]) => `  <url><loc>${SITE}${p}</loc><lastmod>${today}</lastmod><priority>${prio}</priority></url>`);
  for (const p of products) {
    const imgs = [...new Set(p.variants.flatMap((v) => v.images))].slice(0, 10)
      .map((src) => `<image:image><image:loc>${esc(src)}</image:loc></image:image>`).join('');
    urls.push(`  <url><loc>${SITE}/product/${p.id}</loc><lastmod>${today}</lastmod><priority>0.8</priority>${imgs}</url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>
`;
}

function llmsTxt(products) {
  const byCat = new Map();
  for (const p of products) {
    const c = p.category || 'Other';
    if (!byCat.has(c)) byCat.set(c, []);
    byCat.get(c).push(p);
  }
  const sections = [...byCat].map(([c, ps]) => `## ${c}\n${ps.map((p) => {
    const prices = p.variants.map((v) => v.price).filter(Boolean);
    return `- [${p.name}](${SITE}/product/${p.id}): from ₹${Math.min(...prices)}`;
  }).join('\n')}`);
  return `# ${BRAND}

> ${BRAND} (urbannook.in) is an Indian online store for 3D printed home decor, desk lamps, pen stands, anime katanas and lifestyle products. Designed and made in India, shipped pan-India with cash on delivery.

## Store information
- [All products](${SITE}/products)
- [About us](${SITE}/about-us)
- [FAQs](${SITE}/faqs)
- [Return policy](${SITE}/return-policy)
- [Cancellation & refund](${SITE}/cancellation-refund)
- [Contact](${SITE}/contact-us)

${sections.join('\n\n')}
`;
}

async function main() {
  const env = loadEnv(process.env.MODE || 'production', ROOT, 'VITE_');
  const api = (process.env.VITE_API_BASE_URL || env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const shell = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  const today = new Date().toISOString().slice(0, 10);

  let products = [];
  try {
    if (!api) throw new Error('VITE_API_BASE_URL not set');
    const res = await fetch(`${api}/catalog/google-feed.tsv`, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`feed HTTP ${res.status}`);
    products = groupProducts(parseTsv(await res.text()));
  } catch (err) {
    console.warn(`[prerender] product feed unavailable (${err.message}) — writing sitemap/llms.txt without products`);
  }

  fs.rmSync(OUT, { recursive: true, force: true });
  for (const p of products) {
    const baseFile = path.join(OUT, 'base', 'product', p.id);
    fs.mkdirSync(path.dirname(baseFile), { recursive: true });
    fs.writeFileSync(baseFile, renderProductHtml(shell, p));
    for (const v of p.variants) {
      if (!v.sku) continue;
      const vFile = path.join(OUT, 'variant', 'product', p.id, v.sku);
      fs.mkdirSync(path.dirname(vFile), { recursive: true });
      fs.writeFileSync(vFile, renderProductHtml(shell, p, v));
    }
  }
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap(products, today));
  fs.writeFileSync(path.join(DIST, 'llms.txt'), llmsTxt(products));

  const variants = products.reduce((n, p) => n + p.variants.filter((v) => v.sku).length, 0);
  console.log(`[prerender] ${products.length} product pages, ${variants} variant pages, sitemap.xml, llms.txt`);
}

main().catch((err) => {
  console.warn('[prerender] skipped:', err.message);
});
