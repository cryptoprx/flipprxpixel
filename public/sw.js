const CACHE_VERSION = '2';
const CACHE_NAME = `flipprx-v${CACHE_VERSION}`;

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/icon.png',
  '/icon-512.png',
  '/croak.png',
  '/flip.png',
  '/helmet.png',
  '/apple-touch-icon.png',
  '/flip.mp3',
  '/fart.mp3',
  '/bro.mp3',
  '/huh.mp3',
  '/sprites/1.png',
  '/sprites/2.png',
  '/sprites/3.png',
  '/sprites/4.png',
  '/sprites/5.png',
  '/sprites/6.png',
  '/sprites/7.png',
  '/sprites/8.png',
  '/sprites/jump1.PNG',
  '/sprites/jump2.PNG',
  '/sprites/jump3.PNG',
  '/sprites/jumpfall.png',
  '/sprites/standing.png',
  '/sprites/step1.PNG',
  '/sprites/step2.PNG',
  '/sprites/step3.PNG',
  '/sprites/step4.PNG',
  '/manifest.json',
];

// Install: pre-cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch: network-first for navigation, cache-first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Navigation requests (HTML pages): network-first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the latest version
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          // Offline: serve from cache
          return caches.match(request).then((cached) => {
            return cached || caches.match('/');
          });
        })
    );
    return;
  }

  // Static assets: cache-first (sprites, sounds, images, JS, CSS)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        // Cache successful responses for future offline use
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        // If both cache and network fail, return nothing
        return new Response('', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
