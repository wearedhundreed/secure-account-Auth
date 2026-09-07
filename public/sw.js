// AuthForge Service Worker with Full Online Internet Connectivity & Offline Sync
const CACHE_NAME = 'authforge-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
];

// Install: pre-cache shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Online Network-First strategy (connects to live internet, falls back to offline cache)
self.addEventListener('fetch', (event) => {
  // Pass through all mutation requests (POST, PUT, PATCH, DELETE) directly to the live server
  if (event.request.method !== 'GET') {
    return;
  }

  // Always route /api/* directly to live network
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch((err) => {
        return new Response(JSON.stringify({
          success: false,
          error: {
            code: 'NETWORK_OFFLINE',
            message: 'You are currently disconnected from the internet. Please reconnect to perform live API operations.',
            timestamp: new Date().toISOString()
          }
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // For app assets & pages: ONLINE-FIRST (Live Internet priority, offline fallback)
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // When online, serve fresh live response and asynchronously update cache
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache only when offline / no internet connection
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/');
          }
          return new Response('Internet connection required', { status: 503, statusText: 'Offline' });
        });
      })
  );
});

