'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth';
import { apiGet, apiPost, apiDelete, useRsvps } from '@/hooks/useFirestore';
import { useToast } from '@/components/ui/Toast';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Avatar from '@/components/ui/Avatar';
import EventRegistration from '@/components/portal/EventRegistration';
import EventCheckoutModal from '@/components/portal/EventCheckoutModal';
import CreateEventModal from '@/components/portal/CreateEventModal';
import { formatDate, formatCurrency } from '@/lib/utils/format';
import type { RotaractEvent, RSVPStatus, PaymentSettings } from '@/types';

const typeColors: Record<string, 'green' | 'cranberry' | 'azure' | 'gold' | 'gray'> = {
  free: 'green',
  paid: 'gold',
  service: 'azure',
  hybrid: 'cranberry',
};

const typeGradients: Record<string, string> = {
  free: 'from-emerald-500 to-teal-600',
  paid: 'from-amber-500 to-orange-600',
  service: 'from-blue-500 to-blue-700',
  hybrid: 'from-cranberry to-cranberry-800',
};

const typeIcons: Record<string, string> = {
  free: '🎉',
  paid: '🎟',
  service: '🤝',
  hybrid: '✨',
};

export default function PortalEventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, member } = useAuth();
  const { toast } = useToast();
  const [event, setEvent] = useState<RotaractEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRSVP, setCurrentRSVP] = useState<RSVPStatus | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutTicketType, setCheckoutTicketType] = useState<'member' | 'guest'>('member');
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [checkoutPriceCents, setCheckoutPriceCents] = useState(0);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { data: rsvps } = useRsvps(id);

  const canManageEvents = member && ['board', 'president', 'treasurer'].includes(member.role);

  const fetchEvent = useCallback(async () => {
    try {
      const [eventData, settingsData] = await Promise.all([
        apiGet(`/api/portal/events?id=${id}`).catch(() =>
          apiGet(`/api/events?id=${id}`).then((data) => {
            if (Array.isArray(data)) {
              return data.find((e: RotaractEvent) => e.id === id) || null;
            }
            return data;
          })
        ),
        apiGet('/api/settings').catch(() => null),
      ]);
      setEvent(eventData);
      if (settingsData?.paymentSettings) {
        setPaymentSettings(settingsData.paymentSettings);
      }
    } catch (error) {
      toast('Failed to load event', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { fetchEvent(); }, [fetchEvent]);

  useEffect(() => {
    if (rsvps && user) {
      const myRsvp = rsvps.find((r) => r.memberId === user.uid);
      setCurrentRSVP((myRsvp?.status as RSVPStatus) || null);
    }
  }, [rsvps, user]);

  const handleRSVP = async (status: RSVPStatus) => {
    try {
      await apiPost('/api/portal/events/rsvp', { eventId: id, status });
      setCurrentRSVP(status);
      toast(status === 'going' ? "You're going!" : 'RSVP updated');
    } catch (err: any) {
      toast(err.message || 'RSVP failed', 'error');
    }
  };

  const handlePurchaseTicket = async (ticketType: 'member' | 'guest') => {
    if (!event?.pricing) return;
    
    const now = new Date();
    const earlyBirdActive =
      event.pricing.earlyBirdPrice != null &&
      event.pricing.earlyBirdDeadline &&
      new Date(event.pricing.earlyBirdDeadline) > now;

    let priceCents: number;
    if (earlyBirdActive && event.pricing.earlyBirdPrice != null) {
      priceCents = event.pricing.earlyBirdPrice;
    } else if (member && ticketType !== 'guest') {
      priceCents = event.pricing.memberPrice;
    } else {
      priceCents = event.pricing.guestPrice;
    }

    if (priceCents === 0) {
      // Free ticket - RSVP directly
      try {
        await apiPost('/api/portal/events/checkout', { eventId: id, ticketType });
        toast("You're in!");
        setCurrentRSVP('going');
      } catch (err: any) {
        toast(err.message || 'Checkout failed', 'error');
      }
    } else {
      // Show payment modal
      setCheckoutTicketType(ticketType);
      setCheckoutPriceCents(priceCents);
      setShowCheckoutModal(true);
    }
  };

  const handleStripeCheckout = async () => {
    try {
      const res = await apiPost('/api/portal/events/checkout', {
        eventId: id,
        ticketType: checkoutTicketType,
        paymentMethod: 'stripe',
      });
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (err: any) {
      toast(err.message || 'Checkout failed', 'error');
    }
  };

  const handleOfflinePayment = async (method: string, proofUrl?: string) => {
    try {
      await apiPost('/api/portal/events/checkout', {
        eventId: id,
        ticketType: checkoutTicketType,
        paymentMethod: method,
        proofUrl,
      });
      toast(`Payment pending for ${method}. Our treasurer will confirm receipt.`);
      setShowCheckoutModal(false);
      setCurrentRSVP('going'); // Mark as going pending payment confirmation
    } catch (err: any) {
      toast(err.message || 'Payment registration failed', 'error');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) return;
    setDeleteLoading(true);
    try {
      await apiDelete(`/api/portal/events?id=${id}`);
      toast('Event deleted');
      router.push('/portal/events');
    } catch (err: any) {
      toast(err.message || 'Failed to delete event', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!event) return (
    <div className="text-center py-20">
      <p className="text-gray-500 mb-4">Event not found.</p>
      <Button variant="secondary" onClick={() => router.push('/portal/events')}>Back to Events</Button>
    </div>
  );

  const goingCount = rsvps?.filter((r) => r.status === 'going').length || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 page-enter pb-28 lg:pb-6">
      {/* Back */}
      <button onClick={() => router.back()} className="group text-sm text-gray-500 hover:text-cranberry transition-colors flex items-center gap-1.5">
        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        Back to events
      </button>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        {/* ── Main ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Hero banner */}
          <div className="rounded-2xl overflow-hidden shadow-sm">
            {event.imageURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.imageURL} alt={event.title} className="w-full h-56 sm:h-72 object-cover" />
            ) : (
              <div className={`h-40 sm:h-52 bg-gradient-to-br ${typeGradients[event.type] || typeGradients.free} relative flex items-end`}>
                <div
                  className="absolute inset-0 opacity-[0.08]"
                  style={{ backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 0)', backgroundSize: '28px 28px' }}
                />
                <div className="relative p-6">
                  <span className="text-5xl">{typeIcons[event.type] || '📅'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Title + badges + meta */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6 sm:p-8 space-y-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={typeColors[event.type] || 'gray'} className="capitalize">{event.type}</Badge>
                {(event as RotaractEvent & { isFeatured?: boolean }).isFeatured && <Badge variant="gold">⭐ Featured</Badge>}
                {event.status === 'draft' && <Badge variant="gray">Draft</Badge>}
                {event.status === 'cancelled' && <Badge variant="cranberry">Cancelled</Badge>}
                {event.isRecurring && !event.recurrenceParentId && <Badge variant="azure">🔁 Recurring</Badge>}
                {event.recurrenceParentId && <Badge variant="azure">🔁 Series #{(event.occurrenceIndex ?? 0) + 1}</Badge>}
              </div>
              {canManageEvents && (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setShowEditModal(true)}>Edit</Button>
                  <Button size="sm" variant="ghost" loading={deleteLoading} onClick={handleDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20">Delete</Button>
                </div>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900 dark:text-white leading-tight">{event.title}</h1>

            {/* Meta grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                {
                  icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
                  label: 'Date',
                  text: formatDate(event.date),
                },
                {
                  icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
                  label: 'Time',
                  text: event.time + (event.endTime ? ` – ${event.endTime}` : ''),
                },
                event.location
                  ? {
                      icon: 'M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z',
                      label: 'Location',
                      text: event.location,
                    }
                  : null,
                event.capacity
                  ? {
                      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
                      label: 'Capacity',
                      text: `${event.capacity} spots`,
                    }
                  : null,
              ]
                .filter(Boolean)
                .map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60">
                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-700 shadow-sm flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-cranberry" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={item!.icon} />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider leading-none mb-0.5">{item!.label}</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item!.text}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Description */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6 sm:p-8">
            <h2 className="font-display font-semibold text-gray-900 dark:text-white mb-4 text-lg">About this event</h2>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">{event.description}</p>
            </div>
            {event.tags && event.tags.length > 0 && (
              <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-1.5">
                {event.tags.map((tag) => (
                  <span key={tag} className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">#{tag}</span>
                ))}
              </div>
            )}
          </div>

          {/* Pricing Details */}
          {event.pricing && (event.type === 'paid' || event.type === 'hybrid') && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6">
              <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4 text-lg">Pricing</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-cranberry-50 dark:bg-cranberry-900/20 rounded-xl p-4 border border-cranberry-100 dark:border-cranberry-900/40">
                  <p className="text-xs font-bold text-cranberry uppercase tracking-wider mb-1.5">Member Price</p>
                  <p className="text-3xl font-display font-bold text-gray-900 dark:text-white">
                    {event.pricing.memberPrice === 0 ? 'Free' : formatCurrency(event.pricing.memberPrice)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Guest Price</p>
                  <p className="text-3xl font-display font-bold text-gray-900 dark:text-white">{formatCurrency(event.pricing.guestPrice)}</p>
                </div>
              </div>
              {event.pricing.earlyBirdPrice != null && event.pricing.earlyBirdDeadline && (
                <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-800/50 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Early Bird: {formatCurrency(event.pricing.earlyBirdPrice)}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                      Available until {formatDate(event.pricing.earlyBirdDeadline)}
                      {new Date(event.pricing.earlyBirdDeadline) < new Date() && ' — expired'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Attendees */}
          {rsvps && rsvps.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6">
              <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4 text-lg">
                Attendees <span className="text-gray-400 dark:text-gray-500 font-normal text-base">({goingCount})</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {rsvps
                  .filter((r) => r.status === 'going')
                  .map((r) => (
                    <div key={r.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-full pl-1 pr-3 py-1 border border-gray-100 dark:border-gray-700">
                      <Avatar src={r.memberPhoto} alt={r.memberName} size="sm" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{r.memberName}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="lg:sticky lg:top-6">
          <EventRegistration event={event} currentRSVP={currentRSVP} onRSVP={handleRSVP} onPurchaseTicket={handlePurchaseTicket} attendeeCount={goingCount} />
        </div>
      </div>

      {canManageEvents && (
        <CreateEventModal open={showEditModal} onClose={() => setShowEditModal(false)} event={event} onSaved={() => { fetchEvent(); }} />
      )}

      {event && paymentSettings && (
        <EventCheckoutModal
          open={showCheckoutModal}
          onClose={() => setShowCheckoutModal(false)}
          eventId={id}
          eventTitle={event.title}
          ticketType={checkoutTicketType}
          priceCents={checkoutPriceCents}
          paymentSettings={paymentSettings}
          onStripeCheckout={handleStripeCheckout}
          onOfflinePayment={handleOfflinePayment}
        />
      )}
    </div>
  );
}
