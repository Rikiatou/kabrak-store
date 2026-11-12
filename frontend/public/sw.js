const CACHE_NAME = 'kabrak-v7';
const OFFLINE_URL = '/offline.html';
// Filled at build time by the sw-precache plugin in vite.config.ts
const BUILD_ASSETS = [];

const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/logo.png',
];

// Install: cache offline page + shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => Promise.all(
      [...PRECACHE_URLS, ...BUILD_ASSETS].map((url) =>
        cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined))
    ))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    // Keep the previous build too: a tab still running it can open its pages offline
    caches.keys().then((names) => {
      const builds = names.filter((name) => name.startsWith('kabrak-'));
      const keep = new Set([CACHE_NAME, ...builds.filter((n) => n !== CACHE_NAME).slice(-1)]);
      return Promise.all(names.filter((name) => !keep.has(name)).map((name) => caches.delete(name)));
    })
  );
  self.clients.claim();
});

// Fetch: cache-first for HTML, network-first for API
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API calls — always go to network
  if (event.request.url.includes('/api/')) return;

  // Navigation (HTML): network-first so deploys show up, cached SPA shell when offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/', clone));
          }
          return response;
        })
        .catch(() =>
          caches.match('/').then((shell) => shell || caches.match(OFFLINE_URL))
            .then((response) => response || new Response('Offline', { status: 503 }))
        )
    );
    return;
  }

  // For static assets: cache-first strategy
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache successful responses for static assets
        const type = response.headers.get('content-type') || '';
        if (response.ok && !type.includes('text/html') && (
          event.request.url.endsWith('.js') ||
          event.request.url.endsWith('.css') ||
          event.request.url.endsWith('.png') ||
          event.request.url.endsWith('.svg') ||
          event.request.url.endsWith('.woff2')
        )) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => new Response('', { status: 503 }));
    })
  );
});
