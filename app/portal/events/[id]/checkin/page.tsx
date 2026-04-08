'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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

/** Tiny confetti burst for successful check-in */
function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#e11d48', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];
    const particles: Array<{
      x: number; y: number; r: number; color: string;
      vx: number; vy: number; gravity: number; opacity: number;
      rotation: number; rotationSpeed: number; shape: 'circle' | 'rect';
    }> = [];

    // Create burst from center
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.35;
    for (let i = 0; i < 80; i++) {
      const angle = (Math.PI * 2 * i) / 80 + Math.random() * 0.5;
      const speed = 4 + Math.random() * 8;
      particles.push({
        x: cx, y: cy,
        r: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        gravity: 0.12 + Math.random() * 0.05,
        opacity: 1,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        shape: Math.random() > 0.5 ? 'circle' : 'rect',
      });
    }

    let frame: number;
    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.99;
        p.opacity -= 0.008;
        p.rotation += p.rotationSpeed;
        if (p.opacity <= 0) continue;
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
        }
        ctx.restore();
      }
      if (alive) frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      aria-hidden="true"
    />
  );
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
            <ConfettiCanvas />
            <div className="flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 animate-bounce-once shadow-lg shadow-green-200/50 dark:shadow-green-900/20">
              <svg
                className="w-12 h-12 text-green-600 dark:text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white">
              You&apos;re checked in! 🎉
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
