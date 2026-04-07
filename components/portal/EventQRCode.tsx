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

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-1">
        Your Check-In QR Code
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-5">
        Show this at the event to check in
      </p>

      {/* Loading skeleton */}
      {loading && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-[250px] h-[250px] rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          <div className="w-32 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30">
            <svg
              className="w-7 h-7 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
              />
            </svg>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
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
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt="Event check-in QR code"
              width={250}
              height={250}
              className="w-[250px] h-[250px] object-contain"
            />
          </div>
          <Button variant="secondary" size="sm" onClick={handleDownload}>
            <svg
              className="w-4 h-4 mr-1.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3"
              />
            </svg>
            Download QR
          </Button>
        </div>
      )}
    </div>
  );
}
