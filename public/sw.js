// @version 2026-04-06
// Service Worker for PWA offline capabilities
// Version is updated at build time — see next.config.js generateBuildId or update manually.
// Cache name uses a date-stamp so each deployment busts stale caches.
const CACHE_VERSION = '2026-04-06';
const CACHE_NAME = 'rotaractnyc-v' + CACHE_VERSION;

const STATIC_CACHE = CACHE_NAME + '-static';
const PAGE_CACHE = CACHE_NAME + '-pages';

const MAX_STATIC_ENTRIES = 100;
const MAX_PAGE_ENTRIES = 50;

const urlsToCache = [
  '/',
  '/events',
  '/news',
  '/about',
  '/gallery',
  '/manifest.json',
  '/offline.html',
];

// ---------------------------------------------------------------------------
// Helper: trim a cache to a max number of entries (oldest-first eviction)
// ---------------------------------------------------------------------------
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await Promise.all(
      keys.slice(0, keys.length - maxItems).map((key) => cache.delete(key))
    );
  }
}

// ---------------------------------------------------------------------------
// Install — pre-cache critical assets (do NOT skipWaiting so the update
// prompt in PWARegister can let the user decide when to activate)
// ---------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  // skipWaiting is triggered via postMessage from the client (see message listener)
});

// ---------------------------------------------------------------------------
// Activate — clean up old caches
// ---------------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          // Delete any cache that doesn't match the current version prefix
          if (!name.startsWith('rotaractnyc-v' + CACHE_VERSION)) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ---------------------------------------------------------------------------
// Message listener — allows the client to trigger skipWaiting for SW updates
// ---------------------------------------------------------------------------
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ---------------------------------------------------------------------------
// Fetch — network-first for HTML, cache-first for static assets
// ---------------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external URLs (e.g., placeholder images, CDNs)
  if (url.origin !== location.origin) {
    return;
  }

  // Skip API and admin routes — always fetch fresh
  if (url.pathname.includes('/api/') || url.pathname.includes('/admin/') || url.pathname.includes('/portal/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Network-first strategy for HTML / navigation pages
  if (request.headers.get('accept')?.includes('text/html') || request.mode === 'navigate' || url.pathname.endsWith('/') || !url.pathname.includes('.')) {
    event.respondWith(
      fetch(request)
        .then((fetchResponse) => {
          if (fetchResponse.status === 200) {
            const responseToCache = fetchResponse.clone();
            caches.open(PAGE_CACHE).then((cache) => {
              cache.put(request, responseToCache);
              trimCache(PAGE_CACHE, MAX_PAGE_ENTRIES);
            });
          }
          return fetchResponse;
        })
        .catch(async () => {
          // Try the page cache first, then fall back to the offline page
          const cached = await caches.match(request);
          if (cached) return cached;
          return caches.match('/offline.html');
        })
    );
    return;
  }

  // Cache-first strategy for static assets (CSS, JS, images)
  event.respondWith(
    caches.match(request).then((response) => {
      return (
        response ||
        fetch(request).then((fetchResponse) => {
          if (fetchResponse.status === 200) {
            const responseToCache = fetchResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseToCache);
              trimCache(STATIC_CACHE, MAX_STATIC_ENTRIES);
            });
          }
          return fetchResponse;
        })
      );
    })
  );
});
