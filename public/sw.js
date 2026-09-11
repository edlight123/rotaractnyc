// @version 2026-07-23.mrwrxtf4
// Service Worker for PWA offline capabilities
// Version is updated at build time — see next.config.js generateBuildId or update manually.
// Cache name uses a date-stamp so each deployment busts stale caches.
const CACHE_VERSION = '2026-07-23.mrwrxtf4';
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
  // Sign-out — drop every cached portal page / API response. These are keyed
  // by URL only, so leaving them behind would expose the previous member's
  // data to the next person who signs in on this device.
  if (event.data && event.data.type === 'CLEAR_PORTAL_CACHE') {
    event.waitUntil(
      caches.keys().then((names) =>
        Promise.all(
          names.filter((name) => name.endsWith('-portal')).map((name) => caches.delete(name)),
        ),
      ),
    );
  }
});

// ---------------------------------------------------------------------------
// Push — fallback handler for non-FCM web-push payloads, and for clicks on
// notifications shown by the FCM SW (so a single tab handler works).
// ---------------------------------------------------------------------------
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Rotaract NYC', body: event.data ? event.data.text() : '' };
  }
  const title = payload.title || 'Rotaract NYC';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: payload.tag,
    data: { url: payload.url || '/portal' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/portal';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes('/portal') && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
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

  // Always bypass: write APIs (POST/PUT/DELETE handled above already), auth/session
  // routes, and the FCM service worker (served by its own dynamic route).
  if (
    url.pathname.startsWith('/api/portal/auth/') ||
    url.pathname.startsWith('/api/auth/') ||
    url.pathname === '/firebase-messaging-sw.js'
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // Portal GETs — network-FIRST against a dedicated cache, so the member
  // portal stays usable on flaky connections (e.g. event venue wifi) without
  // ever serving stale or another member's data while the network works.
  //
  // The cache is an offline fallback only, never a fast path. Serving a cache
  // hit ahead of the network is wrong here for two reasons:
  //   1. Cache entries are keyed by URL alone — the session cookie is NOT part
  //      of the key — so a response stored for one signed-in member would be
  //      replayed for the next member to sign in on the same device, and for a
  //      member whose session has since expired (bypassing the middleware
  //      session check entirely, since no request reaches the server).
  //   2. Portal data is live. A cache hit pins pages like an event's attendee
  //      roster to whatever it looked like on the previous visit, so newly
  //      registered attendees never appear.
  const isPortalRead =
    url.pathname.startsWith('/portal') ||
    url.pathname.startsWith('/api/portal/');

  if (isPortalRead) {
    const PORTAL_CACHE = CACHE_NAME + '-portal';
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          // Only cache successful, basic-origin responses. Browser-initiated
          // navigations use redirect: 'manual', so a middleware redirect
          // arrives as an opaqueredirect (status 0) — passed through for the
          // browser to follow, and never cached.
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches
              .open(PORTAL_CACHE)
              .then((cache) =>
                cache.put(request, copy).then(() => trimCache(PORTAL_CACHE, MAX_PAGE_ENTRIES)),
              )
              .catch(() => {});
          }
          return res;
        } catch {
          const cached = await caches.match(request, { cacheName: PORTAL_CACHE });
          if (cached) return cached;
          // For navigations, fall back to the offline page so members get
          // a branded experience instead of a Chrome dino.
          if (request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
          return new Response(JSON.stringify({ error: 'offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      })(),
    );
    return;
  }

  // Skip remaining /api/ and /admin/ routes — always fetch fresh
  if (url.pathname.includes('/api/') || url.pathname.includes('/admin/')) {
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
