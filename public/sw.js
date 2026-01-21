// Service Worker for PWA offline capabilities
const CACHE_NAME = 'rotaractnyc-v1'
const urlsToCache = [
  '/',
  '/events',
  '/rcun-news',
  '/about',
  '/mission',
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

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return (
        response ||
        fetch(event.request).then((fetchResponse) => {
          // Don't cache API calls or admin routes
          if (
            event.request.url.includes('/api/') ||
            event.request.url.includes('/admin/')
          ) {
            return fetchResponse
          }

          // Cache successful GET requests
          if (
            event.request.method === 'GET' &&
            fetchResponse.status === 200
          ) {
            const responseToCache = fetchResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache)
            })
          }

          return fetchResponse
        })
      )
    })
  )
})
