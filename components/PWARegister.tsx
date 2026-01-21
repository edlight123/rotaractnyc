'use client'

import { useEffect } from 'react'

export default function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration)

          // Check for updates every hour
          setInterval(() => {
            registration.update()
          }, 60 * 60 * 1000)

          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker available, reload to activate
                  console.log('New version available! Reloading...')
                  window.location.reload()
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error)
        })

      // Force reload when a new service worker takes control
      let refreshing = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true
          window.location.reload()
        }
      })
    }
  }, [])

  return null
}
