// Service Worker for Urban Nook
// Implements versioned caching with cache-first for static assets
// and strictly NO caching for API calls to prevent cart/price sync issues

const CACHE_VERSION = 'v4'; // Incremented to force update
const STATIC_CACHE = `urbannook-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `urbannook-dynamic-${CACHE_VERSION}`;

// Static assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/assets/hero21.webp',
  '/assets/hero2.webp',
  '/assets/logo.webp'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('🛠️ SW: Installing version', CACHE_VERSION);
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('💾 SW: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ SW: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ SW: Installation failed:', error);
      })
  );
});

// Activate event - clean up ALL old cache versions
self.addEventListener('activate', (event) => {
  console.log('🔄 SW: Activating version', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete ANY old cache to ensure fresh start
          if (cacheName.startsWith('urbannook-') && !cacheName.includes(CACHE_VERSION)) {
            console.log('🗑️ SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ SW: Activation complete');
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // CRITICAL: NEVER cache API calls. Dynamic data (Cart, Price, User) must always come from network.
  if (url.pathname.includes('/api/') || url.hostname.includes('api.')) {
    return; // Let browser handle network request normally
  }

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Cache-first strategy for static resources ONLY
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          // Don't cache if not a valid response
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Cache only static assets (JS, CSS, images, fonts)
          if (url.pathname.match(/\.(js|css|png|jpg|jpeg|webp|svg|woff2?)$/)) {
            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }

          return response;
        }).catch((error) => {
          // Silent fail for network errors in static assets
          return caches.match(request);
        });
      })
  );
});
