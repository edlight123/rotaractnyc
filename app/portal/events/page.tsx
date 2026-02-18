'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/auth';
import { usePortalEvents, apiPost } from '@/hooks/useFirestore';
import { useToast } from '@/components/ui/Toast';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Tabs from '@/components/ui/Tabs';
import SearchInput from '@/components/ui/SearchInput';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import CreateEventModal from '@/components/portal/CreateEventModal';
import { defaultEvents } from '@/lib/defaults/data';
import { formatCurrency } from '@/lib/utils/format';
import type { RotaractEvent, RSVPStatus, EventType } from '@/types';

/* Gradient placeholder colours per event type */
const typeGradients: Record<EventType, string> = {
  free: 'from-emerald-500/80 to-teal-600/80',
  paid: 'from-amber-500/80 to-orange-600/80',
  service: 'from-azure to-azure-800',
  hybrid: 'from-cranberry to-cranberry-800',
};
const typeIcons: Record<EventType, string> = { free: '✓', paid: '🎟️', service: '🤝', hybrid: '⭐' };

export default function PortalEventsPage() {
  const { user, member } = useAuth();
  const { toast } = useToast();
  const { data: firestoreEvents, loading } = usePortalEvents();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all');
  const [rsvpLoading, setRsvpLoading] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const canManageEvents = member && ['board', 'president', 'treasurer'].includes(member.role);

  const allEvents = ((firestoreEvents || []).length > 0 ? firestoreEvents : defaultEvents) as RotaractEvent[];
  const now = new Date();

  const events = allEvents
    .filter((e) => {
      const title = (e.title || '').toLowerCase();
      const desc = (e.description || '').toLowerCase();
      const q = search.toLowerCase();
      const matchSearch = title.includes(q) || desc.includes(q);
      const matchType = typeFilter === 'all' || e.type === typeFilter;
      const isFuture = new Date(e.date) >= now;
      return activeTab === 'upcoming' ? matchSearch && matchType && isFuture : matchSearch && matchType && !isFuture;
    })
    .sort((a, b) =>
      activeTab === 'upcoming'
        ? new Date(a.date).getTime() - new Date(b.date).getTime()
        : new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

  const handleRSVP = async (eventId: string, status: RSVPStatus) => {
    if (!user) return;
    setRsvpLoading(eventId);
    try {
      await apiPost('/api/portal/events/rsvp', { eventId, status });
      toast(status === 'going' ? "You're going! 🎉" : 'RSVP updated');
    } catch (err: any) {
      toast(err.message || 'RSVP failed', 'error');
    } finally {
      setRsvpLoading(null);
    }
  };

  const handleTicketPurchase = async (eventId: string, ticketType: 'member' | 'guest' = 'member') => {
    if (!user) return;
    setRsvpLoading(eventId);
    try {
      const res = await apiPost('/api/portal/events/checkout', { eventId, ticketType });
      if (res.free) {
        toast(res.message || "You're in! 🎉");
      } else if (res.url) {
        window.location.href = res.url;
      }
    } catch (err: any) {
      toast(err.message || 'Ticket purchase failed', 'error');
    } finally {
      setRsvpLoading(null);
    }
  };

  /* ---- Helpers ---- */
  const isPaid = (e: RotaractEvent) => (e.type === 'paid' || e.type === 'hybrid') && e.pricing;

  const formatEventDay = (d: string) => ({
    month: new Date(d).toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: new Date(d).getDate(),
    weekday: new Date(d).toLocaleDateString('en-US', { weekday: 'short' }),
  });

  const spotsLeft = (e: RotaractEvent) =>
    e.capacity ? Math.max(0, e.capacity - (e.attendeeCount ?? 0)) : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Events</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">RSVP to upcoming events and track your attendance.</p>
        </div>
        {canManageEvents && (
          <Button onClick={() => setShowCreateModal(true)} className="shrink-0">
            + Create Event
          </Button>
        )}
      </div>

      {/* ── Search & Tabs ── */}
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search events..." className="sm:max-w-xs" />
        <Tabs
          tabs={[
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'past', label: 'Past' },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* ── Type filter chips ── */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['all', 'All'],
            ['free', '✓ Free'],
            ['paid', '🎟️ Ticketed'],
            ['service', '🤝 Service'],
            ['hybrid', '⭐ Hybrid'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTypeFilter(value as EventType | 'all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              typeFilter === value
                ? 'bg-cranberry text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Event list ── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon="📅"
          title={activeTab === 'upcoming' ? 'No upcoming events' : 'No past events found'}
          description="Check back soon for new events."
        />
      ) : (
        <div className="grid gap-5">
          {events.map((event) => {
            const d = formatEventDay(event.date);
            const paid = isPaid(event);
            const spots = spotsLeft(event);
            const isFuture = new Date(event.date) >= now;
            const hasEarlyBird =
              event.pricing?.earlyBirdPrice != null &&
              event.pricing?.earlyBirdDeadline &&
              new Date(event.pricing.earlyBirdDeadline) > now;

            return (
              <div
                key={event.id}
                className="group relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
              >
                {/* Coloured top accent bar */}
                <div className={`h-1 bg-gradient-to-r ${typeGradients[event.type]}`} />

                <div className="flex flex-col md:flex-row">
                  {/* ── Left: Image / Date block ── */}
                  <Link
                    href={`/portal/events/${event.id}`}
                    className="relative md:w-52 shrink-0 overflow-hidden"
                  >
                    {event.imageURL ? (
                      <div className="relative h-40 md:h-full w-full">
                        <Image
                          src={event.imageURL}
                          alt={event.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {/* Date overlay on image */}
                        <div className="absolute top-3 left-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl px-3 py-2 text-center shadow-sm">
                          <p className="text-[10px] font-bold text-cranberry leading-none">{d.month}</p>
                          <p className="text-xl font-display font-bold text-gray-900 dark:text-white leading-tight">{d.day}</p>
                        </div>
                      </div>
                    ) : (
                      /* No-image placeholder with date centred */
                      <div
                        className={`h-32 md:h-full min-h-[8rem] bg-gradient-to-br ${typeGradients[event.type]} flex flex-col items-center justify-center gap-0.5 text-white`}
                      >
                        <p className="text-xs font-bold uppercase tracking-wider opacity-90">{d.weekday}</p>
                        <p className="text-4xl font-display font-extrabold leading-none">{d.day}</p>
                        <p className="text-xs font-semibold uppercase tracking-wider opacity-90">{d.month}</p>
                      </div>
                    )}
                    {/* Type icon chip */}
                    <span className="absolute bottom-3 right-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm text-xs font-semibold rounded-full px-2 py-1 shadow-sm">
                      {typeIcons[event.type]}
                    </span>
                  </Link>

                  {/* ── Right: Content ── */}
                  <div className="flex-1 p-5 md:p-6 flex flex-col justify-between gap-4">
                    <div>
                      {/* Title row */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Link
                          href={`/portal/events/${event.id}`}
                          className="text-lg font-display font-bold text-gray-900 dark:text-white group-hover:text-cranberry dark:group-hover:text-cranberry-400 transition-colors"
                        >
                          {event.title}
                        </Link>
                        <Badge variant={event.type === 'service' ? 'azure' : event.type === 'paid' ? 'gold' : event.type === 'hybrid' ? 'cranberry' : 'green'}>
                          {event.type}
                        </Badge>
                        {event.status === 'draft' && <Badge variant="gray">Draft</Badge>}
                        {event.status === 'cancelled' && <Badge variant="red">Cancelled</Badge>}
                      </div>

                      {/* Description */}
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">{event.description}</p>

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 text-sm text-gray-500 dark:text-gray-400">
                        <span className="inline-flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {event.time}{event.endTime ? ` – ${event.endTime}` : ''}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          {event.location?.split(',')[0]}
                        </span>
                        {spots !== null && (
                          <span className={`inline-flex items-center gap-1.5 font-medium ${spots <= 5 ? 'text-red-500' : spots <= 15 ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            {spots === 0 ? 'Sold out' : `${spots} spot${spots !== 1 ? 's' : ''} left`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ── Bottom row: Pricing + Actions ── */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                      {/* Pricing block */}
                      {paid && event.pricing ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="inline-flex items-center gap-1.5 bg-cranberry-50 dark:bg-cranberry-900/30 text-cranberry-700 dark:text-cranberry-300 pl-1.5 pr-2.5 py-1 rounded-lg">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cranberry-100 dark:bg-cranberry-800/50 text-[10px]">👤</span>
                            <span className="text-sm font-bold">
                              {event.pricing.memberPrice === 0 ? 'Free' : formatCurrency(event.pricing.memberPrice)}
                            </span>
                            <span className="text-[10px] uppercase font-semibold text-cranberry-500 dark:text-cranberry-400">Member</span>
                          </div>
                          <div className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 pl-1.5 pr-2.5 py-1 rounded-lg">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-[10px]">🎫</span>
                            <span className="text-sm font-bold">{formatCurrency(event.pricing.guestPrice)}</span>
                            <span className="text-[10px] uppercase font-semibold">Guest</span>
                          </div>
                          {hasEarlyBird && event.pricing.earlyBirdPrice != null && (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg animate-pulse">
                              🐦 Early bird {formatCurrency(event.pricing.earlyBirdPrice)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          Free event
                        </span>
                      )}

                      {/* Action buttons */}
                      {isFuture ? (
                        <div className="flex gap-2 w-full sm:w-auto">
                          {paid && event.pricing && event.pricing.memberPrice > 0 ? (
                            <>
                              <Button
                                size="sm"
                                variant="gold"
                                loading={rsvpLoading === event.id}
                                onClick={() => handleTicketPurchase(event.id, 'member')}
                                className="flex-1 sm:flex-initial"
                              >
                                🎟️ Buy Ticket
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleRSVP(event.id, 'maybe')}>
                                Maybe
                              </Button>
                            </>
                          ) : paid && event.pricing && event.pricing.memberPrice === 0 ? (
                            <>
                              <Button
                                size="sm"
                                variant="primary"
                                loading={rsvpLoading === event.id}
                                onClick={() => handleTicketPurchase(event.id, 'member')}
                                className="flex-1 sm:flex-initial"
                              >
                                🎫 Free Ticket
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleRSVP(event.id, 'maybe')}>
                                Maybe
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="primary"
                                loading={rsvpLoading === event.id}
                                onClick={() => handleRSVP(event.id, 'going')}
                                className="flex-1 sm:flex-initial"
                              >
                                I&apos;m Going
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleRSVP(event.id, 'maybe')}>
                                Maybe
                              </Button>
                            </>
                          )}
                        </div>
                      ) : (
                        <Link
                          href={`/portal/events/${event.id}`}
                          className="text-sm font-medium text-cranberry hover:text-cranberry-700 dark:text-cranberry-400 dark:hover:text-cranberry-300 transition-colors"
                        >
                          View recap →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Event Modal */}
      <CreateEventModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSaved={() => {
          toast('Event saved! 🎉');
        }}
      />
    </div>
  );
}
