// Service Worker for Urban Nook
//
// Scope is deliberately narrow:
//  - Hashed build output (/assets/js, /assets/fonts, /assets/images, /assets/*-<hash>.css)
//    → cache-first. Filenames change on every build, so a cached copy is never stale.
//  - Product / review images from our image hosts → stale-while-revalidate, capped (LRU-ish).
//  - Everything else (HTML, API, GTM / gtag / Meta Pixel / Clarity, other third parties)
//    → NOT intercepted at all. Never cache index.html (chunk names change per deploy) and
//    never cache API responses (cart / price / user must always be fresh).

const CACHE_VERSION = 'v7';
const BUILD_CACHE = `urbannook-build-${CACHE_VERSION}`;
const IMAGE_CACHE = `urbannook-images-${CACHE_VERSION}`;
const MAX_BUILD_ENTRIES = 120;
const MAX_IMAGE_ENTRIES = 60;

// Image caching needs the image hosts to send `Access-Control-Allow-Origin` (see note in
// the fetch handler). They currently don't, so leave this off until S3/CloudFront CORS is
// configured — otherwise every image would be fetched twice (failed CORS + fallback).
const ENABLE_IMAGE_CACHE = false;
const IMAGE_HOSTS = ['assets-prod.urbannook.in', 'd1dhs7xre1cv0d.cloudfront.net'];

const isHashedBuildAsset = (url) =>
  url.origin === self.location.origin &&
  (/^\/assets\/(js|fonts|images)\//.test(url.pathname) ||
    /^\/assets\/.+-[A-Za-z0-9_-]{8}\.css$/.test(url.pathname));

const isRemoteImage = (url) => IMAGE_HOSTS.includes(url.hostname);

// Drop oldest entries (Cache API keeps insertion order) once over the cap.
async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener('install', () => {
  // Nothing to precache — hashed assets are cached on first use.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((n) => n.startsWith('urbannook-') && !n.endsWith(CACHE_VERSION))
            .map((n) => caches.delete(n))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Cache-first for immutable build output.
  if (isHashedBuildAsset(url)) {
    event.respondWith(
      caches.open(BUILD_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        // Never store an HTML fallback (SPA rewrite for a missing chunk).
        if (res.ok && !(res.headers.get('content-type') || '').includes('text/html')) {
          cache.put(request, res.clone()).then(() => trim(BUILD_CACHE, MAX_BUILD_ENTRIES));
        }
        return res;
      })
    );
    return;
  }

  // Stale-while-revalidate for product / review images.
  if (ENABLE_IMAGE_CACHE && isRemoteImage(url) && request.destination === 'image') {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        // <img> requests are no-cors; caching opaque responses costs ~7MB of quota each in
        // Chrome. Re-request in CORS mode so we get a real, measurable response. If the image
        // host doesn't send CORS headers, fall back to the plain request without caching.
        const network = fetch(url.href, { mode: 'cors', credentials: 'omit' })
          .then((res) => {
            if (res.ok) {
              cache.put(request, res.clone()).then(() => trim(IMAGE_CACHE, MAX_IMAGE_ENTRIES));
            }
            return res;
          })
          .catch(() => hit || fetch(request));
        if (hit) {
          event.waitUntil(network);
          return hit;
        }
        return network;
      })
    );
  }

  // Anything else: not intercepted — browser handles it normally.
});
