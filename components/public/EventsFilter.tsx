'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Badge from '@/components/ui/Badge';
import { formatDate, formatCurrency } from '@/lib/utils/format';
import type { RotaractEvent, EventType } from '@/types';

const typeColors: Record<string, 'cranberry' | 'green' | 'azure' | 'gold'> = {
  free: 'green',
  service: 'azure',
  paid: 'gold',
  hybrid: 'cranberry',
};

const typeLabels: Record<string, string> = {
  free: '✓ Free',
  paid: '🎟️ Ticketed',
  service: '🤝 Service',
  hybrid: '⭐ Hybrid',
};

interface EventsFilterProps {
  events: RotaractEvent[];
}

export default function EventsFilter({ events }: EventsFilterProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all');
  const [timeTab, setTimeTab] = useState<'upcoming' | 'past'>('upcoming');

  const now = useMemo(() => new Date(), []);

  const filtered = useMemo(() => {
    const sorted = events
      .filter((e) => {
        const q = search.toLowerCase();
        const matchSearch =
          !q ||
          (e.title || '').toLowerCase().includes(q) ||
          (e.description || '').toLowerCase().includes(q) ||
          (e.tags || []).some((t) => t.toLowerCase().includes(q));
        const matchType = typeFilter === 'all' || e.type === typeFilter;
        const isFuture = new Date(e.date) >= now;
        const matchTime = timeTab === 'upcoming' ? isFuture : !isFuture;
        return matchSearch && matchType && matchTime;
      })
      .sort((a, b) =>
        timeTab === 'upcoming'
          ? new Date(a.date).getTime() - new Date(b.date).getTime()
          : new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    // Collapse each recurring series to a single representative card. The list is
    // already sorted for the active tab, so the first occurrence we keep is the
    // soonest upcoming (or most recent past) — the remaining occurrences are hidden.
    const seenSeries = new Set<string>();
    return sorted.filter((e) => {
      if (!e.isRecurring) return true;
      const key = e.recurrenceParentId || e.id;
      if (seenSeries.has(key)) return false;
      seenSeries.add(key);
      return true;
    });
  }, [events, search, typeFilter, timeTab, now]);

  const frequencyLabel = (e: RotaractEvent) => {
    const f = e.recurrence?.frequency;
    return f ? f.charAt(0).toUpperCase() + f.slice(1) : 'Recurring';
  };

  return (
    <>
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <svg aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events..."
            aria-label="Search events"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-cranberry/30 focus:border-cranberry"
          />
        </div>

        {/* Time tabs */}
        <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {(['upcoming', 'past'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setTimeTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                timeTab === tab
                  ? 'bg-cranberry text-white'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Type filter chips */}
      <div className="flex flex-wrap gap-2 mb-8">
        {(['all', 'free', 'paid', 'service', 'hybrid'] as const).map((val) => (
          <button
            key={val}
            onClick={() => setTypeFilter(val)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              typeFilter === val
                ? 'bg-cranberry text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {val === 'all' ? 'All' : typeLabels[val] || val}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="grid md:grid-cols-2 gap-6">
        {filtered.map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.slug}`}
            className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 overflow-hidden hover:shadow-lg hover:border-cranberry-200 dark:hover:border-cranberry-800 transition-all duration-200"
          >
            {/* Image banner (or gradient fallback) */}
            <div className="relative h-44 overflow-hidden">
              {event.imageURL ? (
                <>
                  <Image
                    src={event.imageURL}
                    alt={event.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-cranberry to-cranberry-800" />
              )}

              {/* Date — bottom left */}
              <div className="absolute bottom-3 left-4 text-white">
                <p className="text-[11px] font-medium opacity-80">{formatDate(event.date, { weekday: 'long' })}</p>
                <p className="text-sm font-bold leading-tight">{formatDate(event.date, { month: 'short', day: 'numeric' })}</p>
              </div>

              {/* Type badge — top right */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                {event.isRecurring && (
                  <Badge variant="cranberry">🔁 {frequencyLabel(event)}</Badge>
                )}
                <Badge variant={typeColors[event.type] || 'gray'}>
                  {event.type === 'service' ? '🤝 Service' : event.type === 'paid' ? '🎟️ Ticketed' : event.type === 'hybrid' ? '⭐ Hybrid' : '✓ Free'}
                </Badge>
                {event.type !== 'free' && (!event.pricing || event.pricing.guestPrice === 0) && (
                  <Badge variant="green">✓ Free</Badge>
                )}
              </div>
            </div>

            <div className="p-6">
              <h3 className="text-lg font-display font-bold text-gray-900 dark:text-white group-hover:text-cranberry transition-colors">
                {event.title}
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {event.description}
              </p>

              <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {event.time}{event.endTime ? ` – ${event.endTime}` : ''}
                </span>
                <span className="flex items-center gap-1.5">
                  <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {event.location?.split(',')[0]}
                </span>
              </div>

              {event.pricing && (event.type === 'paid' || event.type === 'hybrid') && (
                <div className="mt-3 flex items-center gap-3 text-sm">
                  <span className="inline-flex items-center gap-1 bg-cranberry-50 dark:bg-cranberry-900/20 text-cranberry-700 dark:text-cranberry-300 px-2.5 py-1 rounded-lg font-semibold">
                    {event.pricing.memberPrice === 0 ? 'Free for members' : formatCurrency(event.pricing.memberPrice)}
                    <span className="font-normal text-cranberry-500 dark:text-cranberry-400 text-xs">member</span>
                  </span>
                  <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-lg font-semibold">
                    {formatCurrency(event.pricing.guestPrice)}
                    <span className="font-normal text-gray-500 text-xs">guest</span>
                  </span>
                  {event.pricing.earlyBirdPrice != null && event.pricing.earlyBirdDeadline && new Date(event.pricing.earlyBirdDeadline) > new Date() && (
                    <span className="inline-flex items-center gap-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2.5 py-1 rounded-lg text-xs font-medium">
                      🐦 Early bird {formatCurrency(event.pricing.earlyBirdPrice)}
                    </span>
                  )}
                </div>
              )}

              {event.tags && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {event.tags.map((tag) => (
                    <span key={tag} className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">📅</p>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            {search || typeFilter !== 'all'
              ? 'No events match your filters.'
              : timeTab === 'upcoming'
                ? 'No upcoming events. Check back soon!'
                : 'No past events found.'}
          </p>
          {(search || typeFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setTypeFilter('all'); }}
              className="mt-2 text-sm text-cranberry hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </>
  );
}
