'use client';

import { useEffect, useState } from 'react';

export default function PWARegister() {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // If there's already a waiting worker when we load, show the banner
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setShowUpdateBanner(true);
        }

        // Listen for new service workers installing
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            // When the new worker is installed and waiting, prompt the user
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker);
              setShowUpdateBanner(true);
            }
          });
        });
      })
      .catch((err) => {
        console.warn('SW registration failed:', err);
      });

    // When the new SW takes over, reload so the user gets the latest version
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  if (!showUpdateBanner) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-4 right-4 z-[9999] mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl bg-[#9B1B30] px-5 py-3 text-white shadow-lg sm:left-auto sm:right-6 sm:bottom-6"
    >
      <span className="text-sm font-medium">New version available!</span>
      <button
        onClick={handleUpdate}
        className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/30"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
        Refresh
      </button>
    </div>
  );
}
