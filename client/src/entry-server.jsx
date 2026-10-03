// Server entry for SSR (used by client/server.mjs). Renders one public page to
// HTML for one request, with its data already fetched, and returns the Redux
// state so the browser can hydrate without fetching it again.
import { PassThrough } from 'node:stream';
import { renderToPipeableStream } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { matchPath } from 'react-router-dom';
import { CookiesProvider, Cookies } from 'react-cookie';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.jsx';
import config from './config/env.js';
import { makeStore } from './store/store';
import { apiSlice } from './store/api/apiSlice';
// Register every endpoint up front: some API files are only imported by lazy
// pages, which load during the render — after prefetch needs them.
import './store/api/productsApi';
import './store/api/testimonialsApi';
import './store/api/statsApi';
import './store/api/freeShippingApi';
import './store/api/userApi';
import { normalizeSeoPath } from './utils/seoMerge';
import { SsrContext } from './utils/ssrContext';

// Public, indexable routes and the data each needs on first render. Query
// args must match what the page's hooks pass, so the hooks find this data in
// the cache and the browser doesn't fetch it again.
const PREFETCH = [
  { path: '/', load: () => [['getFeaturedProducts', { limit: 1 }], ['getAllFreeShippingBanners', undefined], ['getTestimonials', undefined]] },
  { path: '/products', load: () => [] },
  { path: '/category/:slug', load: ({ slug }) => [['getCategoryBySlug', slug], ['getCategories', undefined]] },
  { path: '/product/:productId', load: ({ productId }) => productPage(productId) },
  { path: '/product/:productId/:variantSku', load: ({ productId }) => productPage(productId) },
  { path: '/products/:productId', load: ({ productId }) => [['getProductById', productId]] },
  { path: '/about-us', load: () => [['getPublicStats', undefined]] },
  ...['/contact-us', '/faqs', '/customize', '/customer-support', '/rewards', '/terms-conditions', '/privacy-policy', '/return-policy']
    .map((path) => ({ path, load: () => [] })),
];

function productPage(productId) {
  return [
    ['getProductById', productId],
    ['getProductReviews', productId],
    ['getProducts', { page: 1, limit: 8 }],
    ['getAllFreeShippingBanners', undefined],
  ];
}

// Data every page uses: header categories, and Admin → SEO Pages for this URL.
const globalQueries = (pathname) => [
  ['getProducts', { page: 1, limit: 24 }],
  ['getSeoData', normalizeSeoPath(pathname)],
];

// Logged-in / transactional pages: never server-rendered, the browser renders
// them from the SPA shell as before (they are noindex and need localStorage).
const CLIENT_ONLY = ['/checkout', '/profile', '/orders', '/wishlist', '/settings',
  '/payment-processing', '/payment-failed', '/order-confirm', '/nfc'];

// Any other path renders the NotFound page on the server → a real HTTP 404.
const NOT_FOUND = { path: '*', load: () => [] };

/** Is this path server-rendered? Account, checkout etc. are not. */
export function matchSsrRoute(pathname) {
  if (CLIENT_ONLY.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  for (const route of PREFETCH) {
    const m = matchPath({ path: route.path, end: true }, pathname);
    if (m) return { route, params: m.params };
  }
  return { route: NOT_FOUND, params: {} };
}

async function prefetch(store, pathname, match) {
  const queries = [...globalQueries(pathname), ...match.route.load(match.params)];
  await Promise.all(queries.map(([name, arg]) => store.dispatch(apiSlice.endpoints[name].initiate(arg))));
  await Promise.all(store.dispatch(apiSlice.util.getRunningQueriesThunk()));
}

/**
 * @returns {Promise<null | { appHtml, helmet, state, status }>} null when the path isn't server-rendered
 */
export async function render(url, { timeoutMs = 8000 } = {}) {
  const pathname = new URL(url, 'http://ssr.local').pathname;
  const match = matchSsrRoute(pathname);
  if (!match) return null;

  const store = makeStore();
  await prefetch(store, pathname, match);

  const helmetContext = {};
  let status = 200;
  const ssr = { setStatus: (code) => { status = code; } };
  const app = (
    <SsrContext.Provider value={ssr}>
      <GoogleOAuthProvider clientId={config.googleClientId || ''}>
        <CookiesProvider cookies={new Cookies()}>
          <StaticRouter location={url}>
            <App store={store} helmetContext={helmetContext} />
          </StaticRouter>
        </CookiesProvider>
      </GoogleOAuthProvider>
    </SsrContext.Provider>
  );

  const appHtml = await new Promise((resolve, reject) => {
    let html = '';
    const sink = new PassThrough();
    sink.on('data', (chunk) => { html += chunk; });
    sink.on('end', () => resolve(html));
    const stream = renderToPipeableStream(app, {
      // Wait for every lazy page/component, so crawlers get the full page.
      onAllReady() { stream.pipe(sink); },
      onShellError: reject,
      onError(err) { console.error('[SSR] render error:', err?.message || err); },
    });
    setTimeout(() => stream.abort(new Error('SSR render timeout')), timeoutMs);
  });

  return { appHtml, state: store.getState(), status };
}
