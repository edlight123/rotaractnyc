'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import jsQR from 'jsqr';
import { useAuth } from '@/lib/firebase/auth';
import { apiGet, apiPost } from '@/hooks/useFirestore';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CheckinResult {
  // The /api/portal/events/[id]/checkin route responds with these flags
  // rather than a single `status` enum. We map them to a status in the UI.
  success?: boolean;
  alreadyCheckedIn?: boolean;
  expired?: boolean;
  member?: { displayName?: string; name?: string };
  memberName?: string;
  ticketNumber?: number;
  eventName?: string;
  checkedInAt?: string;
  error?: string;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  memberName: string;
  ticketNumber: number | null;
  status: 'success' | 'already' | 'expired' | 'invalid' | 'error';
  message?: string;
}

// ─── Web Audio beep ──────────────────────────────────────────────────────────

function playBeep(freq: number, duration: number) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration / 1000);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration / 1000);
    osc.onended = () => ctx.close();
  } catch {
    // Audio not available — silent fail
  }
}

// ─── Inline SVG icons ────────────────────────────────────────────────────────

function IconCheck() {
  return (
    <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function IconWarning() {
  return (
    <svg className="w-5 h-5 text-yellow-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  );
}

function IconX() {
  return (
    <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function IconCamera() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconStop() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="6" y="6" width="12" height="12" rx="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Scanning overlay corners ─────────────────────────────────────────────────

function ScanOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {/* Dark vignette outside the scan box */}
      <div className="absolute inset-0 bg-black/40" style={{ maskImage: 'radial-gradient(ellipse 55% 55% at center, transparent 60%, black 100%)' }} />
      {/* Scan box */}
      <div className="relative w-64 h-64">
        {/* Animated corner brackets */}
        {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
          <span
            key={corner}
            className="absolute w-8 h-8 border-cranberry"
            style={{
              borderColor: '#9B1B30',
              borderTopWidth: corner.startsWith('t') ? 3 : 0,
              borderBottomWidth: corner.startsWith('b') ? 3 : 0,
              borderLeftWidth: corner.endsWith('l') ? 3 : 0,
              borderRightWidth: corner.endsWith('r') ? 3 : 0,
              top: corner.startsWith('t') ? 0 : undefined,
              bottom: corner.startsWith('b') ? 0 : undefined,
              left: corner.endsWith('l') ? 0 : undefined,
              right: corner.endsWith('r') ? 0 : undefined,
              borderRadius: corner === 'tl' ? '6px 0 0 0' : corner === 'tr' ? '0 6px 0 0' : corner === 'bl' ? '0 0 0 6px' : '0 0 6px 0',
            }}
          />
        ))}
        {/* Scanning line animation */}
        <div className="absolute left-2 right-2 h-0.5 bg-cranberry/80 animate-scan-line" style={{ background: '#9B1B30', opacity: 0.85 }} />
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ScanPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const { member } = useAuth();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectorRef = useRef<any>(null);
  const recentScansRef = useRef<Map<string, number>>(new Map());

  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [browserSupported, setBrowserSupported] = useState<boolean | null>(null);
  const [eventName, setEventName] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [processing, setProcessing] = useState(false);
  // Optional camera capabilities — populated after the stream starts.
  // `torchSupported` is true on most Android Chrome devices with a flash;
  // iOS Safari currently exposes no torch API and `focusMode: 'single-shot'`
  // is also typically unavailable, so the controls hide themselves there.
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [focusSupported, setFocusSupported] = useState(false);

  // jsQR works in every modern browser, including iOS Safari. We still keep
  // a `browserSupported` flag for the (extremely unlikely) case where
  // `getUserMedia` is unavailable, but assume support by default.
  useEffect(() => {
    setBrowserSupported(
      typeof navigator !== 'undefined' &&
        !!navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === 'function',
    );
  }, []);

  // Fetch the event title so the header can display "<Event Name>" instead
  // of an opaque Firestore id. Best-effort — silent on failure.
  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    apiGet(`/api/portal/events?id=${eventId}`)
      .catch(() => apiGet(`/api/events?id=${eventId}`))
      .then((data) => {
        if (cancelled) return;
        const ev = Array.isArray(data) ? data.find((e: any) => e?.id === eventId) : data;
        if (ev?.title) setEventName(ev.title as string);
      })
      .catch(() => { /* non-fatal */ });
    return () => { cancelled = true; };
  }, [eventId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
    setTorchOn(false);
    setTorchSupported(false);
    setFocusSupported(false);
  }, []);

  const addLog = useCallback((entry: Omit<LogEntry, 'id'>) => {
    setLog((prev) => [{ ...entry, id: `${Date.now()}-${Math.random()}` }, ...prev].slice(0, 50));
  }, []);

  const handleDetected = useCallback(
    async (url: string) => {
      // Debounce same URL within 3 seconds
      const now = Date.now();
      const lastScan = recentScansRef.current.get(url);
      if (lastScan && now - lastScan < 3000) return;
      recentScansRef.current.set(url, now);

      // Parse URL params. The QR encodes a full check-in URL of the form:
      //   /portal/events/{eventId}/checkin?m={memberId}&t={ts}&sig={hmac}&tk={n}
      // We forward all four signed params (including `m`) to the JSON
      // check-in endpoint. Forgetting to send `m` makes the API return
      // "Missing required parameters" and every scan looks "Invalid".
      let parsedParams: Record<string, string | number> = {};
      try {
        const parsed = new URL(url);
        parsedParams = {
          memberId: parsed.searchParams.get('m') ?? '',
          timestamp: parsed.searchParams.get('t') ?? '',
          signature: parsed.searchParams.get('sig') ?? '',
          tk: Number(parsed.searchParams.get('tk') ?? 0),
          tot: Number(parsed.searchParams.get('tot') ?? 0),
        };
        if (!parsedParams.memberId || !parsedParams.timestamp || !parsedParams.signature) {
          throw new Error('QR is missing required parameters');
        }
      } catch {
        addLog({
          timestamp: new Date(),
          memberName: 'Unknown',
          ticketNumber: null,
          status: 'error',
          message: 'Invalid QR code format',
        });
        playBeep(300, 200);
        return;
      }

      setProcessing(true);
      try {
        const result: CheckinResult = await apiPost(`/api/portal/events/${eventId}/checkin`, parsedParams);

        const memberName =
          result.member?.displayName ||
          result.member?.name ||
          result.memberName ||
          'Member';

        if (result.alreadyCheckedIn) {
          playBeep(500, 200);
          addLog({
            timestamp: new Date(),
            memberName,
            ticketNumber: result.ticketNumber ?? null,
            status: 'already',
            message: 'Already checked in',
          });
        } else if (result.success) {
          playBeep(800, 150);
          if (typeof navigator.vibrate === 'function') navigator.vibrate(100);
          addLog({
            timestamp: new Date(),
            memberName,
            ticketNumber: result.ticketNumber ?? null,
            status: 'success',
          });
        } else if (result.expired) {
          playBeep(300, 300);
          addLog({
            timestamp: new Date(),
            memberName,
            ticketNumber: result.ticketNumber ?? null,
            status: 'expired',
            message: 'Ticket expired',
          });
        } else {
          playBeep(300, 300);
          addLog({
            timestamp: new Date(),
            memberName,
            ticketNumber: result.ticketNumber ?? null,
            status: 'invalid',
            message: result.error || 'Invalid ticket',
          });
        }
      } catch (err: any) {
        // Map common API errors to friendlier statuses for the log row.
        const msg: string = err?.message ?? 'Check-in failed';
        const lower = msg.toLowerCase();
        let status: LogEntry['status'] = 'error';
        if (lower.includes('expired')) status = 'expired';
        else if (lower.includes('invalid')) status = 'invalid';
        playBeep(300, 300);
        addLog({
          timestamp: new Date(),
          memberName: 'Unknown',
          ticketNumber: null,
          status,
          message: msg,
        });
      } finally {
        setProcessing(false);
      }
    },
    [eventId, addLog]
  );

  const startScanning = useCallback(
    (_stream: MediaStream, detector: any) => {
      if (!videoRef.current) return;

      // Lazily create a hidden canvas for jsQR pixel sampling.
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      const scan = async () => {
        const video = videoRef.current;
        if (!video || video.readyState < 2) {
          rafRef.current = requestAnimationFrame(scan);
          return;
        }
        try {
          if (detector) {
            // Fast path: native BarcodeDetector (Chrome / Edge / Safari 17.4+).
            const barcodes: any[] = await detector.detect(video);
            for (const barcode of barcodes) {
              if (barcode.rawValue) {
                await handleDetected(barcode.rawValue);
              }
            }
          } else if (ctx) {
            // Fallback: jsQR on every other browser, including iOS Safari.
            // Downscale to ~640px max width to keep CPU usage reasonable.
            const vw = video.videoWidth;
            const vh = video.videoHeight;
            if (vw && vh) {
              const scale = Math.min(1, 640 / vw);
              const w = Math.floor(vw * scale);
              const h = Math.floor(vh * scale);
              if (canvas.width !== w) canvas.width = w;
              if (canvas.height !== h) canvas.height = h;
              ctx.drawImage(video, 0, 0, w, h);
              const imgData = ctx.getImageData(0, 0, w, h);
              const code = jsQR(imgData.data, w, h, { inversionAttempts: 'dontInvert' });
              if (code?.data) {
                await handleDetected(code.data);
              }
            }
          }
        } catch {
          // Detection frame error — continue
        }
        rafRef.current = requestAnimationFrame(scan);
      };

      rafRef.current = requestAnimationFrame(scan);
    },
    [handleDetected]
  );

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      // Prefer the native BarcodeDetector when available (faster, less CPU).
      // Fall back to jsQR (handled inside startScanning) on iOS Safari and
      // any other browser without BarcodeDetector.
      let detector: any = null;
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        } catch {
          detector = null;
        }
      }
      detectorRef.current = detector;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setScanning(true);
      startScanning(stream, detector);

      // Probe the active video track for torch / focus capabilities so we can
      // expose UI controls only when they'll actually do something. Wrapped
      // in try/catch because `getCapabilities()` is non-standard and missing
      // on iOS Safari.
      try {
        const [track] = stream.getVideoTracks();
        const caps: any = track && typeof (track as any).getCapabilities === 'function'
          ? (track as any).getCapabilities()
          : {};
        if (caps?.torch) setTorchSupported(true);
        if (Array.isArray(caps?.focusMode) && caps.focusMode.length > 0) {
          setFocusSupported(true);
        }
      } catch {
        // Capability probing is best-effort.
      }
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setCameraError('Camera permission denied. Please allow camera access in your browser settings and try again.');
      } else if (err?.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError(`Could not start camera: ${err?.message ?? 'Unknown error'}`);
      }
    }
  }, [startScanning]);

  // Toggle the back-camera flashlight (Android Chrome only).
  const toggleTorch = useCallback(async () => {
    const stream = streamRef.current;
    if (!stream) return;
    const [track] = stream.getVideoTracks();
    if (!track) return;
    const next = !torchOn;
    try {
      await (track as any).applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch (err) {
      console.warn('Torch toggle failed:', err);
      setTorchSupported(false);
    }
  }, [torchOn]);

  // Tap-to-focus: ask the camera for a one-shot autofocus pass when supported.
  // Useful in low light or when a printed ticket sits flat against a table.
  const handleVideoTap = useCallback(async () => {
    if (!focusSupported) return;
    const stream = streamRef.current;
    if (!stream) return;
    const [track] = stream.getVideoTracks();
    if (!track) return;
    try {
      const caps: any = (track as any).getCapabilities?.() ?? {};
      const modes: string[] = caps.focusMode || [];
      const mode =
        modes.find((m) => m === 'single-shot') ||
        modes.find((m) => m === 'continuous') ||
        modes[0];
      if (!mode) return;
      await (track as any).applyConstraints({ advanced: [{ focusMode: mode }] });
    } catch {
      // Non-fatal — most platforms keep continuous autofocus by default.
    }
  }, [focusSupported]);

  // ─── Role guard ───────────────────────────────────────────────────────────

  const BOARD_ROLES = ['board', 'president', 'treasurer'];
  if (member && !BOARD_ROLES.includes(member.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 max-w-sm w-full text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <IconX />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Access Restricted</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This page is only accessible to board members and administrators.
          </p>
        </div>
      </div>
    );
  }

  // ─── Unsupported browser ──────────────────────────────────────────────────

  if (browserSupported === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 max-w-sm w-full text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto mb-4">
            <IconWarning />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Camera Not Available</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            QR scanning needs camera access via your browser. This device or
            browser doesn&apos;t expose a camera API. Try Safari or Chrome on
            an iPhone/Android, or any modern desktop browser.
          </p>
        </div>
      </div>
    );
  }

  // ─── Main UI ──────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Event Check-in</p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">QR Scanner</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
          {eventName ?? 'Loading event\u2026'}
        </p>
      </div>

      {/* Camera card */}
      <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800 bg-black overflow-hidden relative">
        {/* Video element */}
        <video
          ref={videoRef}
          onClick={handleVideoTap}
          className={`w-full aspect-[4/3] object-cover ${focusSupported ? 'cursor-pointer' : ''}`}
          playsInline
          muted
          style={{ display: scanning ? 'block' : 'none' }}
        />

        {/* Torch toggle (Android Chrome only — hidden when unsupported) */}
        {scanning && torchSupported && (
          <button
            type="button"
            onClick={toggleTorch}
            aria-pressed={torchOn}
            aria-label={torchOn ? 'Turn flashlight off' : 'Turn flashlight on'}
            className={`absolute top-3 left-3 rounded-full p-2.5 transition-colors ${
              torchOn ? 'bg-yellow-400 text-gray-900' : 'bg-black/60 text-white hover:bg-black/80'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>
        )}

        {/* Placeholder when not scanning */}
        {!scanning && (
          <div className="w-full aspect-[4/3] flex flex-col items-center justify-center gap-3 bg-gray-950">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">Camera off</p>
          </div>
        )}

        {/* Scanning overlay */}
        {scanning && <ScanOverlay />}

        {/* Processing indicator */}
        {processing && (
          <div className="absolute top-3 right-3 bg-black/70 rounded-full px-3 py-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cranberry animate-pulse" style={{ background: '#9B1B30' }} />
            <span className="text-white text-xs font-medium">Processing…</span>
          </div>
        )}
      </div>

      {/* Camera error */}
      {cameraError && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4 flex gap-3">
          <IconX />
          <p className="text-sm text-red-700 dark:text-red-300">{cameraError}</p>
        </div>
      )}

      {/* Action button */}
      <div className="flex gap-3">
        {!scanning ? (
          <button
            onClick={startCamera}
            disabled={browserSupported === null}
            className="flex items-center gap-2 text-white rounded-xl px-5 py-2.5 font-medium text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: '#9B1B30' }}
          >
            <IconCamera />
            Start Scanner
          </button>
        ) : (
          <button
            onClick={stopCamera}
            className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl px-5 py-2.5 font-medium text-sm transition-colors hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            <IconStop />
            Stop Scanner
          </button>
        )}
        {log.length > 0 && (
          <button
            onClick={() => setLog([])}
            className="ml-auto text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors px-3 py-2"
          >
            Clear log
          </button>
        )}
      </div>

      {/* Stats row */}
      {log.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              { label: 'Checked In', status: 'success', color: 'text-green-600 dark:text-green-400' },
              { label: 'Already In', status: 'already', color: 'text-yellow-600 dark:text-yellow-400' },
              { label: 'Invalid', status: ['expired', 'invalid', 'error'], color: 'text-red-600 dark:text-red-400' },
            ] as const
          ).map(({ label, status, color }) => {
            const count = log.filter((e) =>
              Array.isArray(status) ? status.includes(e.status as any) : e.status === status
            ).length;
            return (
              <div
                key={label}
                className="rounded-xl border border-gray-200/60 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 text-center"
              >
                <p className={`text-2xl font-bold ${color}`}>{count}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Check-in log */}
      {log.length > 0 && (
        <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Check-in Log</h2>
          </div>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {log.map((entry) => (
              <li key={entry.id} className="flex items-center gap-3 px-4 py-3">
                {/* Status icon */}
                {entry.status === 'success' && <IconCheck />}
                {entry.status === 'already' && <IconWarning />}
                {(entry.status === 'expired' || entry.status === 'invalid' || entry.status === 'error') && <IconX />}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{entry.memberName}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {entry.ticketNumber != null ? `Ticket #${entry.ticketNumber}` : ''}
                    {entry.message ? (entry.ticketNumber != null ? ` · ${entry.message}` : entry.message) : ''}
                  </p>
                </div>

                {/* Status badge */}
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                    entry.status === 'success'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : entry.status === 'already'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}
                >
                  {entry.status === 'success'
                    ? 'Checked In'
                    : entry.status === 'already'
                    ? 'Already In'
                    : entry.status === 'expired'
                    ? 'Expired'
                    : entry.status === 'invalid'
                    ? 'Invalid'
                    : 'Error'}
                </span>

                {/* Time */}
                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 tabular-nums">
                  {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Empty state */}
      {log.length === 0 && scanning && (
        <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">Point the camera at a ticket QR code to scan.</p>
        </div>
      )}

      {/* Scan line animation style */}
      <style>{`
        @keyframes scan-line {
          0%   { top: 8px; }
          50%  { top: calc(100% - 8px); }
          100% { top: 8px; }
        }
        .animate-scan-line {
          animation: scan-line 2s ease-in-out infinite;
          position: absolute;
        }
      `}</style>
    </div>
  );
}
