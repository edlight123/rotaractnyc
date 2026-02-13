// Service Worker for PWA offline capabilities
// Update version on each deployment to force cache refresh
const CACHE_NAME = 'rotaractnyc-v' + Date.now()
const urlsToCache = [
  '/',
  '/events',
  '/news',
  '/about',
  '/gallery',
  '/manifest.json',
]

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache)
    })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Fetch event - network-first strategy for HTML, cache-first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip external URLs (e.g., placeholder images, CDNs)
  if (url.origin !== location.origin) {
    return
  }

  // Skip API and admin routes - always fetch fresh
  if (url.pathname.includes('/api/') || url.pathname.includes('/admin/') || url.pathname.includes('/portal/')) {
    event.respondWith(fetch(request))
    return
  }

  // Network-first strategy for HTML pages
  if (request.headers.get('accept')?.includes('text/html') || url.pathname.endsWith('/') || !url.pathname.includes('.')) {
    event.respondWith(
      fetch(request)
        .then((fetchResponse) => {
          // Update cache with fresh content
          if (fetchResponse.status === 200) {
            const responseToCache = fetchResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache)
            })
          }
          return fetchResponse
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request)
        })
    )
    return
  }

  // Cache-first strategy for static assets (CSS, JS, images)
  event.respondWith(
    caches.match(request).then((response) => {
      return (
        response ||
        fetch(request).then((fetchResponse) => {
          // Cache successful responses
          if (fetchResponse.status === 200) {
            const responseToCache = fetchResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache)
            })
          }
          return fetchResponse
        })
      )
    })
  )
})
