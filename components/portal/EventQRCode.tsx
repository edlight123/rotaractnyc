'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Button from '@/components/ui/Button';

interface EventQRCodeProps {
  eventId: string;
}

export default function EventQRCode({ eventId }: EventQRCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const fetchQR = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/portal/events/${eventId}/qrcode`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to load QR code' }));
        throw new Error(err.error || 'Failed to load QR code');
      }

      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        // API returns JSON with a dataUrl or url field
        const data = await res.json();
        setQrDataUrl(data.dataUrl || data.url || data.qrCode);
      } else {
        // API returns an image blob
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setQrDataUrl(url);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load QR code');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchQR();

    return () => {
      // Revoke object URL on unmount to prevent memory leaks
      if (qrDataUrl && qrDataUrl.startsWith('blob:')) {
        URL.revokeObjectURL(qrDataUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchQR]);

  function handleDownload() {
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `checkin-qr-${eventId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const [fullScreen, setFullScreen] = useState(false);

  return (
    <>
      <div className="space-y-3">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Show this at the event to check in
        </p>

        {/* Loading skeleton */}
        {loading && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-[200px] h-[200px] rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <div className="w-32 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
              </svg>
            </div>
            <p className="text-xs text-red-600 dark:text-red-400 text-center">{error}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                fetchedRef.current = false;
                fetchQR();
              }}
            >
              Retry
            </Button>
          </div>
        )}

        {/* QR code */}
        {!loading && !error && qrDataUrl && (
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => setFullScreen(true)}
              className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white p-2 hover:shadow-lg transition-shadow cursor-pointer group relative"
              aria-label="View full screen"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="Event check-in QR code"
                width={200}
                height={200}
                className="w-[200px] h-[200px] object-contain"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/5 rounded-xl">
                <span className="bg-black/70 text-white text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  Full screen
                </span>
              </div>
            </button>
            <Button variant="secondary" size="sm" onClick={handleDownload}>
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
              </svg>
              Download
            </Button>
          </div>
        )}
      </div>

      {/* Full-screen QR overlay for easy scanning at events */}
      {fullScreen && qrDataUrl && (
        <div
          className="fixed inset-0 z-[100] bg-white dark:bg-gray-950 flex flex-col items-center justify-center animate-in fade-in duration-200"
          onClick={() => setFullScreen(false)}
        >
          <button
            onClick={() => setFullScreen(false)}
            className="absolute top-6 right-6 p-3 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close full screen"
          >
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="bg-white p-6 rounded-3xl shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt="Event check-in QR code"
              className="w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] object-contain"
            />
          </div>
          <p className="mt-6 text-lg font-display font-semibold text-gray-700 dark:text-gray-300">
            Scan to check in
          </p>
          <p className="mt-2 text-sm text-gray-400">Tap anywhere to close</p>
        </div>
      )}
    </>
  );
}
