'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth';
import { apiGet, apiPost, apiDelete, useRsvps, useGuestRsvps } from '@/hooks/useFirestore';
import { useToast } from '@/components/ui/Toast';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Avatar from '@/components/ui/Avatar';
import EventRegistration from '@/components/portal/EventRegistration';
import EventCheckoutModal from '@/components/portal/EventCheckoutModal';
import CreateEventModal from '@/components/portal/CreateEventModal';
import EventActionBar from '@/components/portal/EventActionBar';
import EventQRCode from '@/components/portal/EventQRCode';
import EventDescription from '@/components/public/EventDescription';
import EventDonateSection from '@/components/public/EventDonateSection';
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateEvent, setDuplicateEvent] = useState<RotaractEvent | null>(null);
  const [checkoutTicketType, setCheckoutTicketType] = useState<'member' | 'guest'>('member');
  const [checkoutTierId, setCheckoutTierId] = useState<string | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [checkoutPriceCents, setCheckoutPriceCents] = useState(0);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [guestRsvps, setGuestRsvps] = useState<Array<{ id: string; name: string; email: string; phone?: string; status: string; paymentStatus?: string; createdAt: string }>>([]);
  const [purchasers, setPurchasers] = useState<Array<{
    id: string; kind: 'guest' | 'member'; name: string; email: string;
    phone?: string | null; status: string; paymentStatus: string;
    quantity: number; amountCents: number; tierId: string | null; createdAt: string;
    source?: 'transaction' | 'offline_payment' | 'rsvp' | 'guest_rsvp';
    orderId?: string | null;
  }>>([]);
  const [purchaserSummary, setPurchaserSummary] = useState<{ totalRevenueCents: number; totalRevenue: number; guestCount: number; memberCount: number; totalTickets: number; totalAttendees?: number; orderCount?: number } | null>(null);
  const [donations, setDonations] = useState<Array<{
    id: string; donorName: string; donorEmail: string | null;
    amountCents: number; message: string | null; createdAt: string;
  }>>([]);
  const [donationSummary, setDonationSummary] = useState<{
    count: number; totalCents: number; eventTotalCents: number;
    eventTotalCount: number; fundraisingGoalCents: number | null;
  } | null>(null);
  const { data: rsvps } = useRsvps(id);

  const canManageEvents = member && ['board', 'president', 'treasurer'].includes(member.role);

  // Real-time guest RSVPs (board+ only — Firestore rules block other roles).
  // Replaces a one-shot fetch so admins viewing the event page see new
  // bookings appear immediately without a manual refresh.
  const { data: liveGuestRsvps } = useGuestRsvps(id, !!canManageEvents);
  useEffect(() => {
    if (canManageEvents) setGuestRsvps(liveGuestRsvps as any);
  }, [canManageEvents, liveGuestRsvps]);

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

  useEffect(() => {
    if (canManageEvents && id) {
      // Refetch purchasers whenever the underlying RSVP/guest collections
      // change so the admin "Ticket Purchasers" panel stays in sync with
      // real-time bookings without requiring a manual page refresh. The
      // dependency on rsvps/liveGuestRsvps lengths covers both adds and
      // cancellations.
      apiGet(`/api/portal/events/${id}/purchasers`).then((data) => {
        if (data?.purchasers) setPurchasers(data.purchasers);
        if (data?.summary) setPurchaserSummary(data.summary);
      }).catch((err) => {
        console.error('Failed to load purchasers:', err);
      });
      apiGet(`/api/portal/events/${id}/donations`).then((data) => {
        if (Array.isArray(data?.donations)) setDonations(data.donations);
        if (data?.summary) setDonationSummary(data.summary);
      }).catch((err) => {
        // Non-fatal: just log; the panel will hide when no data
        console.error('Failed to load event donations:', err);
      });
    }
  }, [canManageEvents, id, rsvps?.length, liveGuestRsvps?.length]);

  const handleRSVP = async (status: RSVPStatus) => {
    try {
      await apiPost('/api/portal/events/rsvp', { eventId: id, status });
      setCurrentRSVP(status);
      toast(status === 'going' ? "You're going!" : 'RSVP updated');
    } catch (err: any) {
      toast(err.message || 'RSVP failed', 'error');
    }
  };

  const handlePurchaseTicket = async (ticketType: 'member' | 'guest', tierId?: string) => {
    if (!event?.pricing) return;

    // ── Tier-based pricing ──
    if (event.pricing.tiers?.length) {
      const tier = tierId
        ? event.pricing.tiers.find((t) => t.id === tierId)
        : event.pricing.tiers[0];
      if (!tier) return;

      const priceCents = member && ticketType !== 'guest' ? tier.memberPrice : tier.guestPrice;

      if (priceCents === 0) {
        try {
          await apiPost('/api/portal/events/checkout', { eventId: id, ticketType, tierId: tier.id });
          toast("You're in!");
          setCurrentRSVP('going');
        } catch (err: any) {
          toast(err.message || 'Checkout failed', 'error');
        }
      } else {
        setCheckoutTicketType(ticketType);
        setCheckoutTierId(tier.id);
        setCheckoutPriceCents(priceCents);
        setShowCheckoutModal(true);
      }
      return;
    }

    // ── Legacy flat pricing ──
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
      setCheckoutTierId(null);
      setCheckoutPriceCents(priceCents);
      setShowCheckoutModal(true);
    }
  };

  const handleStripeCheckout = async (embedded?: boolean, quantity?: number) => {
    try {
      const canUseEmbeddedCheckout = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) && embedded !== false;
      const res = await apiPost('/api/portal/events/checkout', {
        eventId: id,
        ticketType: checkoutTicketType,
        ...(checkoutTierId ? { tierId: checkoutTierId } : {}),
        paymentMethod: 'stripe',
        embedded: canUseEmbeddedCheckout,
        quantity: quantity || 1,
      });
      return res;
    } catch (err: any) {
      toast(err.message || 'Checkout failed', 'error');
      return null;
    }
  };

  const handleCheckoutComplete = () => {
    setShowCheckoutModal(false);
    setCurrentRSVP('going');
    toast("Payment complete! You're in.");
  };

  const handleCancelTicket = async () => {
    try {
      const res = await apiPost(`/api/portal/events/${id}/cancel-ticket`, {});
      setCurrentRSVP('not_going');
      toast(res?.message || 'Your ticket has been cancelled.');
      // Refresh event-level counters & purchasers list so the UI reflects
      // the released spot immediately.
      fetchEvent();
      if (canManageEvents) {
        apiGet(`/api/portal/events/${id}/purchasers`).then((data) => {
          if (data?.purchasers) setPurchasers(data.purchasers);
          if (data?.summary) setPurchaserSummary(data.summary);
        }).catch(() => { /* non-blocking */ });
      }
    } catch (err: any) {
      toast(err.message || 'Failed to cancel ticket', 'error');
      throw err;
    }
  };

  const handleOfflinePayment = async (method: string, proofUrl?: string) => {
    try {
      await apiPost('/api/portal/events/checkout', {
        eventId: id,
        ticketType: checkoutTicketType,
        ...(checkoutTierId ? { tierId: checkoutTierId } : {}),
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
    setDeleteLoading(true);
    try {
      await apiDelete(`/api/portal/events?id=${id}`);
      toast('Event deleted');
      router.push('/portal/events');
    } catch (err: any) {
      toast(err.message || 'Failed to delete event', 'error');
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDuplicate = () => {
    if (!event) return;
    // Pre-populate a new event from the current one and open create modal
    const duplicatedEvent = {
      ...event,
      id: '', // Force create mode
      title: `${event.title} (Copy)`,
      slug: `${event.slug}-copy`,
      status: 'draft' as const,
      attendeeCount: 0,
      date: '', // Clear date so user picks a new one
      createdAt: '',
    };
    setDuplicateEvent(duplicatedEvent);
    setShowDuplicateModal(true);
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="h-4 w-28 bg-gray-200 dark:bg-gray-800 rounded" />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="h-52 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6 space-y-4">
            <div className="flex gap-2">
              <div className="h-6 w-16 bg-gray-200 dark:bg-gray-800 rounded-full" />
              <div className="h-6 w-20 bg-gray-200 dark:bg-gray-800 rounded-full" />
            </div>
            <div className="h-8 w-3/4 bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="grid grid-cols-2 gap-2.5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800/60 rounded-xl" />
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6 space-y-3">
            <div className="h-6 w-40 bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-800 rounded" />
          </div>
        </div>
        <div className="h-80 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
      </div>
    </div>
  );
  if (!event) return (
    <div className="text-center py-20">
      <p className="text-gray-500 mb-4">Event not found.</p>
      <Button variant="secondary" onClick={() => router.push('/portal/events')}>Back to Events</Button>
    </div>
  );

  // ── Capacity / tickets sold ──
  // `goingCount` is used by EventRegistration to report "spots remaining" so
  // it must represent TICKETS (one per seat). Admins get the authoritative
  // count from the purchasers API; others fall back to summing RSVP quantity.
  const memberTicketCount = rsvps
    ?.filter((r) => r.status === 'going')
    .reduce((sum: number, r: any) => sum + (r.quantity || 1), 0) || 0;
  const guestTicketCount = guestRsvps
    .filter((r) => r.status === 'going')
    .reduce((sum: number, r: any) => sum + (r.quantity || 1), 0);
  const computedTicketCount = memberTicketCount + guestTicketCount;
  const goingCount = purchaserSummary?.totalTickets != null
    ? purchaserSummary.totalTickets
    : Math.max(
        computedTicketCount,
        (event as RotaractEvent & { attendeeCount?: number }).attendeeCount ?? 0,
      );

  // ── Distinct attendees ──
  // The chip list shows one badge per person; admins get the authoritative
  // distinct count from the API, others fall back to RSVP doc counts (which
  // are one-per-person by data model).
  const memberGoingPeople = rsvps?.filter((r) => r.status === 'going').length || 0;
  const guestGoingPeople = guestRsvps.filter((r) => r.status === 'going').length;
  const distinctAttendeeCount = purchaserSummary?.totalAttendees != null
    ? purchaserSummary.totalAttendees
    : memberGoingPeople + guestGoingPeople;
  const isPast = new Date(event.date) < new Date();

  return (
    <>
    <div className="max-w-4xl mx-auto space-y-6 page-enter pb-28 lg:pb-6">
      {/* Back */}
      <button onClick={() => router.back()} className="group text-sm text-gray-500 hover:text-cranberry transition-colors flex items-center gap-1.5">
        <svg aria-hidden="true" className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
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
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setShowEditModal(true)}>
                    <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleDuplicate} title="Duplicate this event">
                    <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    Duplicate
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(true)} className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20">Delete</Button>
                </div>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900 dark:text-white leading-tight">{event.title}</h1>

            {/* ── Action Bar: Calendar, Share, Directions ── */}
            <EventActionBar event={event} onCopied={() => toast('Link copied to clipboard!')} />

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
                      <svg aria-hidden="true" className="w-4 h-4 text-cranberry" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
            <EventDescription
              text={event.description}
              className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed"
            />
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

              {event.pricing.tiers?.length ? (
                /* ── Tier grid ── */
                <div className="space-y-3">
                  {[...event.pricing.tiers].sort((a, b) => a.sortOrder - b.sortOrder).map((tier) => {
                    const expired = tier.deadline && new Date(tier.deadline) < new Date();
                    const soldOut = tier.capacity != null && (tier.soldCount ?? 0) >= tier.capacity;
                    const spots = tier.capacity != null ? Math.max(0, tier.capacity - (tier.soldCount ?? 0)) : null;

                    return (
                      <div
                        key={tier.id}
                        className={`rounded-xl p-4 border ${expired || soldOut ? 'opacity-60 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30' : 'border-cranberry-100 dark:border-cranberry-900/40 bg-cranberry-50/30 dark:bg-cranberry-900/10'}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-gray-900 dark:text-white">{tier.label}</h4>
                              {expired && <Badge variant="gray">Expired</Badge>}
                              {soldOut && <Badge variant="cranberry">Sold Out</Badge>}
                            </div>
                            {tier.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{tier.description}</p>
                            )}
                            {tier.deadline && !expired && (
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                                Available until {formatDate(tier.deadline)}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="flex gap-4">
                              <div>
                                <p className="text-xs font-bold text-cranberry uppercase tracking-wider">Member</p>
                                <p className="text-2xl font-display font-bold text-gray-900 dark:text-white">
                                  {tier.memberPrice === 0 ? 'Free' : formatCurrency(tier.memberPrice)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Guest</p>
                                <p className="text-2xl font-display font-bold text-gray-900 dark:text-white">
                                  {formatCurrency(tier.guestPrice)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        {spots !== null && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${spots <= 5 ? 'bg-red-500' : spots <= 15 ? 'bg-amber-500' : 'bg-cranberry'}`}
                                style={{ width: `${Math.min(100, Math.round(((tier.soldCount ?? 0) / tier.capacity!) * 100))}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium ${spots <= 5 ? 'text-red-500' : 'text-gray-400'}`}>
                              {spots === 0 ? 'Sold out' : `${spots}/${tier.capacity} left`}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* ── Legacy member/guest grid ── */
                <>
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
                        <svg aria-hidden="true" className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
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
                </>
              )}
            </div>
          )}

          {/* Attendees */}
          {(distinctAttendeeCount > 0) && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6">
              <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4 text-lg">
                Attendees <span className="text-gray-400 dark:text-gray-500 font-normal text-base">({distinctAttendeeCount})</span>
                {goingCount > distinctAttendeeCount && (
                  <span className="text-gray-400 dark:text-gray-500 font-normal text-sm ml-1">
                    · {goingCount} ticket{goingCount !== 1 ? 's' : ''}
                  </span>
                )}
              </h3>
              <div className="flex flex-wrap gap-2">
                {rsvps
                  ?.filter((r) => r.status === 'going')
                  .map((r) => (
                    <div key={r.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-full pl-1 pr-3 py-1 border border-gray-100 dark:border-gray-700 group/attendee relative">
                      <Avatar src={r.memberPhoto} alt={r.memberName} size="sm" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{r.memberName}</span>
                      {r.checkedIn && (
                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/40" title={`Checked in${r.checkedInAt ? ` at ${new Date(r.checkedInAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}`}>
                          <svg className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                    </div>
                  ))}
                {guestRsvps
                  .filter((r) => r.status === 'going')
                  .map((r) => (
                    <div key={r.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-full pl-1 pr-3 py-1 border border-gray-100 dark:border-gray-700">
                      <Avatar src={undefined} alt={r.name} size="sm" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{r.name}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md text-azure-700 bg-azure-50 dark:bg-azure-900/20">guest</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Scan Tickets — board only */}
          {canManageEvents && (
            <div className="grid sm:grid-cols-2 gap-3">
              <a
                href={`/portal/events/${id}/attendees`}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-4 flex items-center justify-between gap-4 hover:border-cranberry/40 hover:shadow-sm transition-all group"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">View All Attendees</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Full roster · export PDF or Excel</p>
                </div>
                <div className="shrink-0 w-9 h-9 rounded-xl bg-cranberry/10 text-cranberry flex items-center justify-center group-hover:bg-cranberry group-hover:text-white transition-colors">
                  <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
              </a>
              <div className="bg-cranberry/5 dark:bg-cranberry/10 rounded-2xl border border-cranberry/20 p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-cranberry text-sm">Scan Attendee Tickets</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Camera scanner for door check-in</p>
                </div>
                <a
                  href={`/portal/events/${id}/scan`}
                  className="shrink-0 inline-flex items-center gap-2 bg-cranberry text-white text-sm font-semibold rounded-xl px-3 py-2 hover:bg-cranberry/90 transition-colors"
                >
                  <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Scan
                </a>
              </div>
            </div>
          )}

          {/* Ticket Purchasers — admin only */}
          {canManageEvents && (purchasers.length > 0 || purchaserSummary) && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6">
              <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
                <h3 className="font-display font-semibold text-gray-900 dark:text-white text-lg">
                  Ticket Purchasers
                  {purchaserSummary && (
                    <span className="text-gray-400 dark:text-gray-500 font-normal text-base ml-2">
                      ({purchaserSummary.orderCount ?? purchasers.length} order{(purchaserSummary.orderCount ?? purchasers.length) !== 1 ? 's' : ''}
                      {' · '}
                      {purchaserSummary.totalTickets} ticket{purchaserSummary.totalTickets !== 1 ? 's' : ''})
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-3">
                  <a
                    href={`/portal/events/${id}/attendees`}
                    className="text-xs font-semibold text-cranberry hover:text-cranberry/80 inline-flex items-center gap-1"
                  >
                    Open full roster
                    <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                  {purchaserSummary && purchaserSummary.totalRevenueCents > 0 && (
                    <div className="text-right">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Revenue</p>
                      <p className="text-2xl font-display font-bold text-cranberry">
                        {formatCurrency(purchaserSummary.totalRevenueCents)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {purchaserSummary && (
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Members</p>
                    <p className="text-xl font-display font-bold text-gray-900 dark:text-white">{purchaserSummary.memberCount}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Guests</p>
                    <p className="text-xl font-display font-bold text-gray-900 dark:text-white">{purchaserSummary.guestCount}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Tickets</p>
                    <p className="text-xl font-display font-bold text-gray-900 dark:text-white">{purchaserSummary.totalTickets}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {purchasers.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                          p.kind === 'member'
                            ? 'text-cranberry bg-cranberry-50 dark:bg-cranberry-900/20'
                            : 'text-azure-700 bg-azure-50 dark:bg-azure-900/20'
                        }`}>
                          {p.kind}
                        </span>
                        {p.source === 'offline_payment' && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md text-amber-700 bg-amber-50 dark:bg-amber-900/20">
                            offline
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {p.email}{p.phone ? ` · ${p.phone}` : ''}
                        {p.createdAt ? ` · ${formatDate(p.createdAt)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {p.quantity > 1 && (
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          ×{p.quantity}
                        </span>
                      )}
                      {p.amountCents > 0 && (
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(p.amountCents)}
                        </span>
                      )}
                      {p.paymentStatus === 'paid' ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">Paid</span>
                      ) : p.paymentStatus === 'free' ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">Free</span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">Pending</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Donations Received — admin only. Hidden when there are no
              donations to keep the page clean for events without any. */}
          {canManageEvents && event.acceptsDonations && donations.length > 0 && donationSummary && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6">
              <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
                <h3 className="font-display font-semibold text-gray-900 dark:text-white text-lg">
                  Donations Received
                  <span className="text-gray-400 dark:text-gray-500 font-normal text-base ml-2">
                    ({donationSummary.eventTotalCount} {donationSummary.eventTotalCount === 1 ? 'donation' : 'donations'})
                  </span>
                </h3>
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Raised</p>
                  <p className="text-2xl font-display font-bold text-cranberry">
                    {formatCurrency(donationSummary.eventTotalCents)}
                  </p>
                  {donationSummary.fundraisingGoalCents && donationSummary.fundraisingGoalCents > 0 && (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      of {formatCurrency(donationSummary.fundraisingGoalCents)} goal
                      {' · '}
                      {Math.min(100, Math.round((donationSummary.eventTotalCents / donationSummary.fundraisingGoalCents) * 100))}%
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {donations.map((d) => (
                  <div key={d.id} className="flex flex-col gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{d.donorName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {d.donorEmail || 'No email'}
                          {d.createdAt ? ` · ${formatDate(d.createdAt)}` : ''}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(d.amountCents)}
                      </span>
                    </div>
                    {d.message && (
                      <blockquote className="text-xs italic text-gray-600 dark:text-gray-400 border-l-2 border-cranberry/40 pl-3 py-0.5">
                        &ldquo;{d.message}&rdquo;
                      </blockquote>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="lg:sticky lg:top-6 space-y-4">
          <EventRegistration event={event} currentRSVP={currentRSVP} onRSVP={handleRSVP} onPurchaseTicket={handlePurchaseTicket} onCancelTicket={handleCancelTicket} attendeeCount={goingCount} />

          {/* Donations — opt-in per event */}
          {event.acceptsDonations && !isPast && (
            <EventDonateSection
              eventId={event.id}
              eventTitle={event.title}
              eventSlug={event.slug}
              fundraisingGoalCents={event.fundraisingGoalCents}
              donationsTotalCents={event.donationsTotalCents}
              donationsCount={event.donationsCount}
              suggestedDonationCents={event.suggestedDonationCents}
            />
          )}

          {/* QR Code for check-in */}
          {!isPast && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-5">
              <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-3 text-sm">Your Check-in QR Code</h3>
              <EventQRCode eventId={id} />
            </div>
          )}
        </div>
      </div>
    </div>
    {/* Modals must live outside the page-enter div — its translateY animation
        creates a new containing block that confines position:fixed children
        (the backdrop) to the div, so the modal renders below the page rather
        than centered on the viewport. Same pattern used in portal/page.tsx
        and portal/documents/page.tsx. */}

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
          onCheckoutComplete={handleCheckoutComplete}
        />
      )}

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="font-display font-semibold text-gray-900 dark:text-white">Delete Event</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete <strong>&ldquo;{event?.title}&rdquo;</strong>? All RSVPs and check-in data will be permanently removed.
            </p>
            <div className="flex gap-3 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              <Button size="sm" loading={deleteLoading} onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete Event</Button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate event modal */}
      {canManageEvents && duplicateEvent && (
        <CreateEventModal
          open={showDuplicateModal}
          onClose={() => { setShowDuplicateModal(false); setDuplicateEvent(null); }}
          event={duplicateEvent}
          onSaved={() => {
            setShowDuplicateModal(false);
            setDuplicateEvent(null);
            toast('Event duplicated as draft!');
            router.push('/portal/events');
          }}
        />
      )}
    </>
  );
}
