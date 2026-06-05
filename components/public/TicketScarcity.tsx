'use client';

import { getTicketScarcity, type ScarcityLevel } from '@/lib/utils/scarcity';

/**
 * TicketScarcity — a tasteful "X tickets left" urgency badge that nudges
 * visitors to buy without lying about availability. The message escalates as
 * the event fills up:
 *
 *   plenty left   → "🎟 Limited to 80 tickets"        (exclusivity framing)
 *   ≥15% sold     → "🎟 24 tickets sold — going fast!" (social proof)
 *   ≥50% sold     → "⚡ Selling fast — only 32 of 80 left"
 *   ≤12 left      → "🔥 Almost sold out — 9 tickets left"
 *   ≤5 left       → "🔥 Only 4 tickets left!"          (pulsing, red)
 *
 * Sold-out (0 left) returns null on purpose — that state has its own dedicated
 * "Sold Out" banner/button elsewhere, so we don't double up.
 *
 * Scarcity thresholds live in `lib/utils/scarcity.ts` (pure + unit-tested).
 */

const TONE: Record<ScarcityLevel, { wrap: string; text: string; sub: string; dot: string; ping: boolean; icon: string }> = {
  critical: {
    wrap: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/60',
    text: 'text-red-700 dark:text-red-300',
    sub: 'text-red-600/80 dark:text-red-400/80',
    dot: 'bg-red-500',
    ping: true,
    icon: '🔥',
  },
  high: {
    wrap: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800/60',
    text: 'text-orange-700 dark:text-orange-300',
    sub: 'text-orange-600/80 dark:text-orange-400/80',
    dot: 'bg-orange-500',
    ping: true,
    icon: '🔥',
  },
  selling: {
    wrap: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60',
    text: 'text-amber-700 dark:text-amber-300',
    sub: 'text-amber-600/80 dark:text-amber-400/80',
    dot: 'bg-amber-500',
    ping: false,
    icon: '⚡',
  },
  momentum: {
    wrap: 'bg-cranberry-50 dark:bg-cranberry-900/20 border-cranberry-100 dark:border-cranberry-900/40',
    text: 'text-cranberry-700 dark:text-cranberry-300',
    sub: 'text-cranberry-600/80 dark:text-cranberry-400/80',
    dot: 'bg-cranberry-500',
    ping: false,
    icon: '🎟',
  },
  exclusive: {
    wrap: 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700',
    text: 'text-gray-700 dark:text-gray-200',
    sub: 'text-gray-500 dark:text-gray-400',
    dot: 'bg-gray-400',
    ping: false,
    icon: '🎟',
  },
};

interface TicketScarcityProps {
  capacity?: number | null;
  /** Tickets already sold/claimed (one per seat). */
  ticketsSold?: number | null;
  /** `card` = full bordered banner; `inline` = compact one-liner (e.g. above a sticky mobile CTA). */
  variant?: 'card' | 'inline';
  /** For `inline`, only render the genuinely urgent levels to avoid noise. */
  urgentOnly?: boolean;
  className?: string;
}

/** A live, animated indicator dot. */
function LiveDot({ color, ping }: { color: string; ping: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
      {ping && <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${color}`} />}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${color}`} />
    </span>
  );
}

export default function TicketScarcity({
  capacity,
  ticketsSold,
  variant = 'card',
  urgentOnly = false,
  className = '',
}: TicketScarcityProps) {
  const info = getTicketScarcity(capacity, ticketsSold);
  if (!info) return null;
  if (urgentOnly && !['critical', 'high', 'selling'].includes(info.level)) return null;

  const tone = TONE[info.level];

  if (variant === 'inline') {
    return (
      <p className={`flex items-center justify-center gap-1.5 text-xs font-semibold ${tone.text} ${className}`} role="status">
        <LiveDot color={tone.dot} ping={tone.ping} />
        <span>{info.message}</span>
      </p>
    );
  }

  return (
    <div
      role="status"
      className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${tone.wrap} ${className}`}
    >
      <LiveDot color={tone.dot} ping={tone.ping} />
      <div className="min-w-0">
        <p className={`text-sm font-bold leading-tight ${tone.text}`}>
          <span aria-hidden="true" className="mr-1">{tone.icon}</span>
          {info.message}
        </p>
        {info.sub && <p className={`text-xs leading-tight mt-0.5 ${tone.sub}`}>{info.sub}</p>}
      </div>
    </div>
  );
}
