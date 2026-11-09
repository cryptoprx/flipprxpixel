const CACHE_VERSION = '7';
const CACHE_NAME = `flipprx-v${CACHE_VERSION}`;

// Assets to pre-cache on install for full offline PWA & Android TWA play
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icon.png',
  '/icon-512.png',
  '/croak.png',
  '/flip.png',
  '/flip-pixel.png',
  '/helmet.png',
  '/apple-touch-icon.png',
  '/flip.mp3',
  '/fart.mp3',
  '/bro.mp3',
  '/huh.mp3',
  // Shared & Classic (guy1) sprites
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
  // Speedster (guy2) sprites
  '/sprites/guy2/standing.png',
  '/sprites/guy2/step1.png',
  '/sprites/guy2/step2.png',
  '/sprites/guy2/step3.png',
  '/sprites/guy2/step4.png',
  '/sprites/guy2/jump1.png',
  '/sprites/guy2/jump2.png',
  '/sprites/guy2/jump3.png',
  '/sprites/guy2/jumpfall.png',
  // Slammer (guy3) sprites
  '/sprites/guy3/standing.png',
  '/sprites/guy3/step1.png',
  '/sprites/guy3/step2.png',
  '/sprites/guy3/step3.png',
  '/sprites/guy3/step4.png',
  '/sprites/guy3/jump1.png',
  '/sprites/guy3/jump2.png',
  '/sprites/guy3/jump3.png',
  '/sprites/guy3/jumpfall.png',
  // Boss sprites (Stage 5 Emperor Viper & Stage 10 Overlord Rektus Phase 1 & 2)
  '/sprites/boss/mini_idle1.png',
  '/sprites/boss/mini_idle2.png',
  '/sprites/boss/mini_charge.png',
  '/sprites/boss/mini_attack.png',
  '/sprites/boss/mini_hurt.png',
  '/sprites/boss/boss_idle1.png',
  '/sprites/boss/boss_idle2.png',
  '/sprites/boss/boss_walk1.png',
  '/sprites/boss/boss_walk2.png',
  '/sprites/boss/boss_roar.png',
  '/sprites/boss/boss_attack.png',
  '/sprites/boss/boss_slam.png',
  '/sprites/boss/boss_hurt.png',
  '/sprites/boss/boss_p2_idle1.png',
  '/sprites/boss/boss_p2_idle2.png',
  '/sprites/boss/boss_p2_walk1.png',
  '/sprites/boss/boss_p2_walk2.png',
  '/sprites/boss/boss_p2_roar.png',
  '/sprites/boss/boss_p2_attack.png',
  '/sprites/boss/boss_p2_slam.png',
  '/sprites/boss/boss_p2_hurt.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (request.mode === 'navigate' || url.pathname.startsWith('/_next/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || (request.mode === 'navigate' ? caches.match('/') : new Response('', { status: 503 })))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => new Response('', { status: 503, statusText: 'Offline' }));
    })
  );
});
