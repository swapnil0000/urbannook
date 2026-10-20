// Turns one entry-server render() result into a full HTML page.
// Shared by client/server.mjs (local SSR preview) and scripts/ssg.mjs
// (build-time rendering used in production), so both produce identical HTML.

// Tags SEOHead sets per page. The template's defaults are removed when the
// rendered page has its own, so there is exactly one of each.
const DEFAULT_HEAD_TAGS = [
  /<title>[\s\S]*?<\/title>\s*/i,
  /<meta\s+name="description"[^>]*>\s*/i,
  /<meta\s+property="og:(?:type|title|description|image|url)"[^>]*>\s*/gi,
  /<meta\s+name="twitter:(?:card|title|description|image)"[^>]*>\s*/gi,
];

// JSON inside <script> must not be able to close the tag or start a comment.
export const serialize = (value) => JSON.stringify(value)
  .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

// React 19 renders the page's <title>/<meta>/<link> (from SEOHead) at the very
// start of the app HTML when it isn't rendering the whole document. They belong
// in <head>: take that leading run of tags out of the app HTML.
const LEADING_HEAD_TAGS = /^(?:\s*(?:<title>[\s\S]*?<\/title>|<meta\b[^>]*\/?>|<link\b[^>]*\/?>))+/i;

// Marked data-ssr: the browser removes them just before hydrating (main.jsx),
// because React adds its own copies and would otherwise leave two of each.
export function splitHead(appHtml) {
  const m = appHtml.match(LEADING_HEAD_TAGS);
  if (!m) return { head: '', body: appHtml };
  return { head: m[0].replace(/<(title|meta|link)\b/gi, '<$1 data-ssr'), body: appHtml.slice(m[0].length) };
}

export function buildPage(template, { appHtml: rawAppHtml, state }) {
  const { head, body: appHtml } = splitHead(rawAppHtml);
  let html = template;
  if (head.trim()) for (const re of DEFAULT_HEAD_TAGS) html = html.replace(re, '');
  // __SSR__ first thing in <head>, so inline head scripts (the LCP image
  // preload) can tell the page is already rendered.
  html = html.replace('<head>', '<head>\n<script>window.__SSR__=true</script>');
  html = html.replace('</head>', `${head}\n</head>`);
  html = html.replace('<div id="root"></div>',
    `<div id="root">${appHtml}</div>\n<script>window.__PRELOADED_STATE__=${serialize(state)}</script>`);
  return deferAppScripts(html);
}

// Built template only (the dev template loads /src/main.jsx through Vite): Vite's entry
// <script type="module" src="/assets/js/index-*.js"> and its <link rel="modulepreload">s.
const ENTRY_SCRIPT = /<script type="module" crossorigin src="(\/assets\/[^"]+\.js)"><\/script>\s*/;
const MODULEPRELOAD = /<link rel="modulepreload" crossorigin href="(\/assets\/[^"]+\.js)">\s*/g;

/**
 * A server-rendered page is already complete HTML, so the app's JavaScript (~200 KB) is only
 * needed to make it interactive. Fetched from <head> it competed with the CSS, fonts and the
 * hero image for a phone's bandwidth and pushed First / Largest Contentful Paint back by
 * seconds (PageSpeed mobile). Here it starts right after the first paint instead: same
 * files, same order, the vendor chunks still preloaded in parallel — just not before the
 * page is on screen. Pages that are not server-rendered (checkout, account) keep the
 * template's normal tags, since they show nothing without the app.
 */
export function deferAppScripts(html) {
  const entry = html.match(ENTRY_SCRIPT);
  if (!entry) return html;
  const preloads = [...html.matchAll(MODULEPRELOAD)].map((m) => m[1]);
  const links = preloads.map((h) => `p(${JSON.stringify(h)});`).join('');
  const loader = `<script>(function(){var d=document;function p(h){var l=d.createElement('link');l.rel='modulepreload';l.crossOrigin='';l.href=h;d.head.appendChild(l);}`
    + `function go(){${links}var s=d.createElement('script');s.type='module';s.crossOrigin='';s.src=${JSON.stringify(entry[1])};d.head.appendChild(s);}`
    // After the whole page is parsed (hydration needs all of #root), painted once, and the
    // page's main image (fetchpriority="high": hero / first product photo) has loaded —
    // at most 1.5 s, so a slow image never keeps the page from becoming interactive.
    + `function paint(){if(window.requestAnimationFrame){requestAnimationFrame(function(){setTimeout(go,0);});}else{go();}}`
    + `function after(){var img=d.querySelector('img[fetchpriority="high"]');if(!img||img.complete){paint();return;}`
    + `var done=false;function once(){if(!done){done=true;paint();}}img.addEventListener('load',once);img.addEventListener('error',once);setTimeout(once,1500);}`
    + `if(d.readyState==='loading'){d.addEventListener('DOMContentLoaded',after);}else{after();}})();</script>\n`;
  return html.replace(MODULEPRELOAD, '').replace(ENTRY_SCRIPT, loader);
}

