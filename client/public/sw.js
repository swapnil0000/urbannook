// Service Worker for Urban Nook
const CACHE_NAME = 'urbannook-v1';
const STATIC_CACHE = 'urbannook-static-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/assets/hero2.webp',
  '/assets/logo.webp',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap',
  'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('🛠️ SW: Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('💾 SW: Caching static assets:', STATIC_ASSETS);
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

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('🔄 SW: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
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

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip API calls
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          console.log('💾 SW: Serving from cache:', event.request.url);
          return response;
        }

        console.log('🌐 SW: Fetching from network:', event.request.url);
        return fetch(event.request).then((response) => {
          // Don't cache if not a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Cache JS, CSS, and image files
          if (event.request.url.match(/\.(js|css|png|jpg|jpeg|webp|svg|woff2?)$/)) {
            caches.open(CACHE_NAME)
              .then((cache) => {
                console.log('💾 SW: Caching new file:', event.request.url);
                cache.put(event.request, responseToCache);
              });
          }

          return response;
        });
      })
  );
});