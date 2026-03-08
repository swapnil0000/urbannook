// Service Worker for Urban Nook
// Implements versioned caching with cache-first for static assets
// and network-first for API calls
// Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5

const CACHE_VERSION = 'v2';
const STATIC_CACHE = `urbannook-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `urbannook-dynamic-${CACHE_VERSION}`;
const API_CACHE = `urbannook-api-${CACHE_VERSION}`;

// Static assets to cache immediately on install
// Includes hero images, fonts, and logo for optimal performance
const STATIC_ASSETS = [
  '/',
  '/assets/hero21.webp',
  '/assets/hero2.webp',
  '/assets/logo.webp'
];

// Install event - cache static assets
// Validates: Requirements 5.1, 5.2
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

// Activate event - clean up old cache versions
// Validates: Requirements 5.4
self.addEventListener('activate', (event) => {
  console.log('🔄 SW: Activating version', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete any cache that doesn't match current version
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
// Cache-first for static resources (Requirement 5.2)
// Network-first for API calls (Requirement 5.3)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Network-first strategy for API calls
  // Validates: Requirements 5.3
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache successful API responses
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(API_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log('💾 SW: Serving API from cache (offline):', url.pathname);
              return cachedResponse;
            }
            // Return a basic error response if no cache available
            return new Response(JSON.stringify({ error: 'Offline and no cached data' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // Cache-first strategy for static resources
  // Validates: Requirements 5.2, 5.5
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        // Fetch from network and cache if it's a static asset
        return fetch(request).then((response) => {
          // Don't cache if not a valid response
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Cache static assets (JS, CSS, images, fonts)
          if (url.pathname.match(/\.(js|css|png|jpg|jpeg|webp|svg|woff2?)$/)) {
            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }

          return response;
        }).catch((error) => {
          console.error('❌ SW: Fetch failed:', url.pathname, error);
          // Return cached response if available, even for failed requests
          return caches.match(request);
        });
      })
  );
});