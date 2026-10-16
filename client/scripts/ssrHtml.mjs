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
  return html;
}

