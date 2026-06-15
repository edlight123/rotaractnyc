'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { RotaractEvent, EventType } from '@/types';

/* Coloured dot / pill per event type. */
const typeDot: Record<EventType, string> = {
  free: 'bg-emerald-500',
  paid: 'bg-amber-500',
  service: 'bg-azure',
  hybrid: 'bg-cranberry',
};

const typePill: Record<EventType, string> = {
  free: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  paid: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  service: 'bg-azure-50 text-azure-700 dark:bg-azure-900/30 dark:text-azure-300',
  hybrid: 'bg-cranberry-50 text-cranberry-700 dark:bg-cranberry-900/30 dark:text-cranberry-300',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

interface CalendarViewProps {
  events: RotaractEvent[];
  /** Month to open on (defaults to today). */
  initialMonth?: Date;
}

/**
 * CalendarView — a month grid that places events on their day.
 *
 * Manages its own visible-month state with prev/next/today navigation. Each
 * event renders as a coloured pill that links to the event detail page. Days
 * with more events than fit show a "+N more" affordance.
 */
export default function CalendarView({ events, initialMonth }: CalendarViewProps) {
  const [cursor, setCursor] = useState(() => startOfMonth(initialMonth ?? new Date()));

  // Group events by day-key for O(1) lookup while rendering cells.
  const eventsByDay = useMemo(() => {
    const map = new Map<string, RotaractEvent[]>();
    for (const e of events) {
      const date = new Date(e.date);
      if (Number.isNaN(date.getTime())) continue;
      const key = ymd(date);
      const list = map.get(key);
      if (list) list.push(e);
      else map.set(key, [e]);
    }
    // Sort each day's events by time.
    for (const list of Array.from(map.values())) {
      list.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    }
    return map;
  }, [events]);

  // Build the 6-week (42-cell) grid covering the visible month.
  const cells = useMemo(() => {
    const first = startOfMonth(cursor);
    const startDay = first.getDay(); // 0=Sun
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - startDay);
    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + i);
      return date;
    });
  }, [cursor]);

  const today = new Date();
  const todayKey = ymd(today);
  const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const goPrev = () => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  const goNext = () => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
  const goToday = () => setCursor(startOfMonth(new Date()));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 overflow-hidden">
      {/* ── Month toolbar ── */}
      <div className="flex items-center justify-between gap-3 p-4 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white">{monthLabel}</h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={goToday}
            className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-cranberry/40 hover:text-cranberry dark:hover:text-cranberry-400 transition-colors"
          >
            Today
          </button>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous month"
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-cranberry/40 hover:text-cranberry dark:hover:text-cranberry-400 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next month"
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-cranberry/40 hover:text-cranberry dark:hover:text-cranberry-400 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Weekday header ── */}
      <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500"
          >
            <span className="hidden sm:inline">{w}</span>
            <span className="sm:hidden">{w[0]}</span>
          </div>
        ))}
      </div>

      {/* ── Day grid ── */}
      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          const inMonth = date.getMonth() === cursor.getMonth();
          const key = ymd(date);
          const isToday = key === todayKey;
          const dayEvents = eventsByDay.get(key) ?? [];
          const visible = dayEvents.slice(0, 3);
          const overflow = dayEvents.length - visible.length;

          return (
            <div
              key={i}
              className={cn(
                'min-h-[5.5rem] sm:min-h-[7rem] border-b border-r border-gray-100 dark:border-gray-800 p-1.5 flex flex-col gap-1',
                i % 7 === 0 && 'border-l',
                !inMonth && 'bg-gray-50/60 dark:bg-gray-950/40',
              )}
            >
              <div className="flex justify-end">
                <span
                  className={cn(
                    'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold',
                    isToday
                      ? 'bg-cranberry text-white'
                      : inMonth
                        ? 'text-gray-700 dark:text-gray-300'
                        : 'text-gray-300 dark:text-gray-600',
                  )}
                >
                  {date.getDate()}
                </span>
              </div>

              <div className="flex flex-col gap-1 overflow-hidden">
                {visible.map((e) => (
                  <Link
                    key={e.id}
                    href={`/portal/events/${e.id}`}
                    title={`${e.time ? e.time + ' · ' : ''}${e.title}`}
                    className={cn(
                      'group flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium truncate transition-colors',
                      typePill[e.type],
                    )}
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', typeDot[e.type])} />
                    <span className="truncate">{e.title}</span>
                  </Link>
                ))}
                {overflow > 0 && (
                  <span className="px-1.5 text-[10px] font-medium text-gray-400 dark:text-gray-500">
                    +{overflow} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 p-3 text-xs text-gray-500 dark:text-gray-400">
        {(['free', 'paid', 'service', 'hybrid'] as EventType[]).map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5 capitalize">
            <span className={cn('w-2 h-2 rounded-full', typeDot[t])} />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
