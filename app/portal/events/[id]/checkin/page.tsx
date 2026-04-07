'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiPost } from '@/hooks/useFirestore';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';

type CheckinStatus = 'loading' | 'success' | 'already' | 'expired' | 'error';

interface CheckinResult {
  eventName?: string;
  checkedInAt?: string;
  message?: string;
}

export default function EventCheckinPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<CheckinStatus>('loading');
  const [result, setResult] = useState<CheckinResult>({});
  const [errorMsg, setErrorMsg] = useState('');
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    const m = searchParams.get('m') ?? '';
    const t = searchParams.get('t') ?? '';
    const sig = searchParams.get('sig') ?? '';

    async function doCheckin() {
      try {
        const data = await apiPost<{
          success: boolean;
          eventName?: string;
          checkedInAt?: string;
          alreadyCheckedIn?: boolean;
          expired?: boolean;
          message?: string;
        }>(`/api/portal/events/${eventId}/checkin`, {
          memberId: m,
          timestamp: t,
          signature: sig,
        });

        if (data.alreadyCheckedIn) {
          setStatus('already');
          setResult({ eventName: data.eventName, checkedInAt: data.checkedInAt });
        } else if (data.expired) {
          setStatus('expired');
        } else {
          setStatus('success');
          setResult({
            eventName: data.eventName,
            checkedInAt: data.checkedInAt,
          });
        }
      } catch (err: any) {
        const msg = err?.message || 'Check-in failed. Please try again.';
        if (msg.toLowerCase().includes('already')) {
          setStatus('already');
          setResult({ message: msg });
        } else if (msg.toLowerCase().includes('expired')) {
          setStatus('expired');
        } else {
          setStatus('error');
          setErrorMsg(msg);
        }
      }
    }

    doCheckin();
  }, [eventId, searchParams]);

  function handleRetry() {
    attemptedRef.current = false;
    setStatus('loading');
    setErrorMsg('');
    // Re-trigger by toggling the ref
    const m = searchParams.get('m') ?? '';
    const t = searchParams.get('t') ?? '';
    const sig = searchParams.get('sig') ?? '';

    apiPost(`/api/portal/events/${eventId}/checkin`, {
      memberId: m,
      timestamp: t,
      signature: sig,
    })
      .then((data: any) => {
        if (data.alreadyCheckedIn) {
          setStatus('already');
          setResult({ eventName: data.eventName, checkedInAt: data.checkedInAt });
        } else {
          setStatus('success');
          setResult({ eventName: data.eventName, checkedInAt: data.checkedInAt });
        }
      })
      .catch((err: any) => {
        setStatus('error');
        setErrorMsg(err?.message || 'Check-in failed. Please try again.');
      });
  }

  const formattedTime = result.checkedInAt
    ? new Date(result.checkedInAt).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-md text-center">
        {/* Loading */}
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4 animate-in fade-in">
            <Spinner size="lg" />
            <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
              Checking you in…
            </p>
          </div>
        )}

        {/* Success */}
        {status === 'success' && (
          <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 animate-bounce-once">
              <svg
                className="w-10 h-10 text-green-600 dark:text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              You&apos;re checked in! ✅
            </h1>
            {result.eventName && (
              <p className="text-lg text-gray-700 dark:text-gray-300">{result.eventName}</p>
            )}
            {formattedTime && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Checked in at {formattedTime}
              </p>
            )}
            <Link href={`/portal/events/${eventId}`} className="mt-4">
              <Button variant="primary" size="lg">
                View Event
              </Button>
            </Link>
          </div>
        )}

        {/* Already checked in */}
        {status === 'already' && (
          <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <svg
                className="w-10 h-10 text-blue-600 dark:text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              You&apos;ve already checked in
            </h1>
            {result.eventName && (
              <p className="text-lg text-gray-700 dark:text-gray-300">{result.eventName}</p>
            )}
            {formattedTime && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Originally checked in at {formattedTime}
              </p>
            )}
            <Link href={`/portal/events/${eventId}`} className="mt-4">
              <Button variant="azure" size="lg">
                View Event
              </Button>
            </Link>
          </div>
        )}

        {/* Expired */}
        {status === 'expired' && (
          <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <svg
                className="w-10 h-10 text-amber-600 dark:text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              This check-in link has expired
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Please ask the event organiser for a new QR code or check-in link.
            </p>
            <Link href={`/portal/events/${eventId}`} className="mt-4">
              <Button variant="secondary" size="lg">
                View Event
              </Button>
            </Link>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30">
              <svg
                className="w-10 h-10 text-red-600 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Check-in failed
            </h1>
            <p className="text-red-600 dark:text-red-400">{errorMsg}</p>
            <div className="flex gap-3 mt-4">
              <Button variant="primary" size="lg" onClick={handleRetry}>
                Try Again
              </Button>
              <Link href={`/portal/events/${eventId}`}>
                <Button variant="secondary" size="lg">
                  View Event
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Bounce-once keyframe for the success checkmark */}
      <style jsx global>{`
        @keyframes bounce-once {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.1); }
          70% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-once {
          animation: bounce-once 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
