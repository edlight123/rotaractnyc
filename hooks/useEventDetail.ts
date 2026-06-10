'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth';
import {
  apiDelete,
  apiGet,
  apiPost,
  useGuestRsvps,
  useRsvps,
} from '@/hooks/useFirestore';
import { useToast } from '@/components/ui/Toast';
import type { RotaractEvent, RSVP, RSVPStatus, PaymentSettings } from '@/types';
import type {
  DonationSummary,
  EventDonation,
  GuestRsvpLite,
  Purchaser,
  PurchaserSummary,
} from '@/components/portal/event-detail/types';

const MANAGE_ROLES = ['board', 'president', 'treasurer'];

/**
 * useEventDetail
 * --------------
 * Owns every piece of state, data-fetching, and the handler logic for the
 * portal event-detail page. Keeping it here lets the page itself stay a thin,
 * declarative composition of presentational panels.
 */
export function useEventDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, member } = useAuth();
  const { toast } = useToast();

  const [event, setEvent] = useState<RotaractEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRSVP, setCurrentRSVP] = useState<RSVPStatus | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);

  // ── Modal / dialog state ──
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateEvent, setDuplicateEvent] = useState<RotaractEvent | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Checkout params ──
  const [checkoutTicketType, setCheckoutTicketType] = useState<'member' | 'guest'>('member');
  const [checkoutTierId, setCheckoutTierId] = useState<string | null>(null);
  const [checkoutPriceCents, setCheckoutPriceCents] = useState(0);

  // ── Admin panels data ──
  const [guestRsvps, setGuestRsvps] = useState<GuestRsvpLite[]>([]);
  const [purchasers, setPurchasers] = useState<Purchaser[]>([]);
  const [purchaserSummary, setPurchaserSummary] = useState<PurchaserSummary | null>(null);
  const [donations, setDonations] = useState<EventDonation[]>([]);
  const [donationSummary, setDonationSummary] = useState<DonationSummary | null>(null);

  const { data: rsvps } = useRsvps(id);
  const canManageEvents = Boolean(member && MANAGE_ROLES.includes(member.role));

  // Real-time guest RSVPs (board+ only — Firestore rules block other roles).
  // Replaces a one-shot fetch so admins viewing the event page see new
  // bookings appear immediately without a manual refresh.
  const { data: liveGuestRsvps } = useGuestRsvps(id, canManageEvents);
  useEffect(() => {
    if (canManageEvents) setGuestRsvps(liveGuestRsvps as unknown as GuestRsvpLite[]);
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
          }),
        ),
        apiGet('/api/settings').catch(() => null),
      ]);
      setEvent(eventData);
      if (settingsData?.paymentSettings) {
        setPaymentSettings(settingsData.paymentSettings);
      }
    } catch {
      toast('Failed to load event', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  useEffect(() => {
    if (rsvps && user) {
      const myRsvp = rsvps.find((r) => r.memberId === user.uid);
      setCurrentRSVP((myRsvp?.status as RSVPStatus) || null);
    }
  }, [rsvps, user]);

  const refreshPurchasers = useCallback(() => {
    if (!canManageEvents || !id) return;
    apiGet(`/api/portal/events/${id}/purchasers`)
      .then((data) => {
        if (data?.purchasers) setPurchasers(data.purchasers);
        if (data?.summary) setPurchaserSummary(data.summary);
      })
      .catch((err) => {
        console.error('Failed to load purchasers:', err);
      });
  }, [canManageEvents, id]);

  useEffect(() => {
    if (!canManageEvents || !id) return;
    // Refetch purchasers/donations whenever the underlying RSVP/guest
    // collections change so the admin panels stay in sync with real-time
    // bookings without requiring a manual page refresh. The dependency on
    // rsvps/liveGuestRsvps lengths covers both adds and cancellations.
    refreshPurchasers();
    apiGet(`/api/portal/events/${id}/donations`)
      .then((data) => {
        if (Array.isArray(data?.donations)) setDonations(data.donations);
        if (data?.summary) setDonationSummary(data.summary);
      })
      .catch((err) => {
        // Non-fatal: just log; the panel will hide when no data
        console.error('Failed to load event donations:', err);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageEvents, id, rsvps?.length, liveGuestRsvps?.length, refreshPurchasers]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const notifyLinkCopied = useCallback(() => {
    toast('Link copied to clipboard!');
  }, [toast]);

  const handleRSVP = useCallback(
    async (status: RSVPStatus) => {
      try {
        await apiPost('/api/portal/events/rsvp', { eventId: id, status });
        setCurrentRSVP(status);
        toast(status === 'going' ? "You're going!" : 'RSVP updated');
      } catch (err: any) {
        toast(err.message || 'RSVP failed', 'error');
      }
    },
    [id, toast],
  );

  const handlePurchaseTicket = useCallback(
    async (ticketType: 'member' | 'guest', tierId?: string) => {
      if (!event?.pricing) return;

      // ── Tier-based pricing ──
      if (event.pricing.tiers?.length) {
        const tier = tierId
          ? event.pricing.tiers.find((t) => t.id === tierId)
          : event.pricing.tiers[0];
        if (!tier) return;

        const priceCents =
          member && ticketType !== 'guest' ? tier.memberPrice : tier.guestPrice;

        if (priceCents === 0) {
          try {
            await apiPost('/api/portal/events/checkout', {
              eventId: id,
              ticketType,
              tierId: tier.id,
            });
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
    },
    [event, id, member, toast],
  );

  const handleStripeCheckout = useCallback(
    async (embedded?: boolean, quantity?: number) => {
      try {
        const canUseEmbeddedCheckout =
          Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) && embedded !== false;
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
    },
    [checkoutTicketType, checkoutTierId, id, toast],
  );

  const handleCheckoutComplete = useCallback(() => {
    setShowCheckoutModal(false);
    setCurrentRSVP('going');
    toast("Payment complete! You're in.");
  }, [toast]);

  const handleCancelTicket = useCallback(async () => {
    try {
      const res = await apiPost(`/api/portal/events/${id}/cancel-ticket`, {});
      setCurrentRSVP('not_going');
      toast(res?.message || 'Your ticket has been cancelled.');
      // Refresh event-level counters & purchasers list so the UI reflects
      // the released spot immediately.
      fetchEvent();
      refreshPurchasers();
    } catch (err: any) {
      toast(err.message || 'Failed to cancel ticket', 'error');
      throw err;
    }
  }, [fetchEvent, id, refreshPurchasers, toast]);

  const handleOfflinePayment = useCallback(
    async (method: string, proofUrl?: string) => {
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
    },
    [checkoutTicketType, checkoutTierId, id, toast],
  );

  const handleDelete = useCallback(async () => {
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
  }, [id, router, toast]);

  const handleDuplicate = useCallback(() => {
    if (!event) return;
    // Pre-populate a new event from the current one and open create modal
    const duplicatedEvent: RotaractEvent = {
      ...event,
      id: '', // Force create mode
      title: `${event.title} (Copy)`,
      slug: `${event.slug}-copy`,
      status: 'draft',
      attendeeCount: 0,
      date: '', // Clear date so user picks a new one
      createdAt: '',
    };
    setDuplicateEvent(duplicatedEvent);
    setShowDuplicateModal(true);
  }, [event]);

  const closeDuplicateModal = useCallback(() => {
    setShowDuplicateModal(false);
    setDuplicateEvent(null);
  }, []);

  const onDuplicateSaved = useCallback(() => {
    closeDuplicateModal();
    toast('Event duplicated as draft!');
    router.push('/portal/events');
  }, [closeDuplicateModal, router, toast]);

  // ── Derived counts ──────────────────────────────────────────────────────────

  // `goingCount` reports "spots remaining" so it must represent TICKETS (one
  // per seat). Admins get the authoritative count from the purchasers API;
  // others fall back to summing RSVP quantity.
  const memberTicketCount =
    rsvps
      ?.filter((r) => r.status === 'going')
      .reduce((sum: number, r: { quantity?: number }) => sum + (r.quantity || 1), 0) || 0;
  const guestTicketCount = guestRsvps
    .filter((r) => r.status === 'going')
    .reduce((sum: number, r) => sum + (r.quantity || 1), 0);
  const computedTicketCount = memberTicketCount + guestTicketCount;
  const goingCount =
    purchaserSummary?.totalTickets != null
      ? purchaserSummary.totalTickets
      : Math.max(computedTicketCount, event?.attendeeCount ?? 0);

  // Distinct attendees — one badge per person; admins get the authoritative
  // distinct count from the API, others fall back to RSVP doc counts (which
  // are one-per-person by data model).
  const memberGoingPeople = rsvps?.filter((r) => r.status === 'going').length || 0;
  const guestGoingPeople = guestRsvps.filter((r) => r.status === 'going').length;
  const distinctAttendeeCount =
    purchaserSummary?.totalAttendees != null
      ? purchaserSummary.totalAttendees
      : memberGoingPeople + guestGoingPeople;

  const isPast = event ? new Date(event.date) < new Date() : false;

  return {
    // identity
    id,
    // core data
    event,
    loading,
    member,
    canManageEvents,
    currentRSVP,
    paymentSettings,
    rsvps: (rsvps ?? []) as unknown as RSVP[],
    guestRsvps,
    purchasers,
    purchaserSummary,
    donations,
    donationSummary,
    // derived
    goingCount,
    distinctAttendeeCount,
    isPast,
    // checkout params
    checkoutTicketType,
    checkoutPriceCents,
    // modal state
    showEditModal,
    setShowEditModal,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showCheckoutModal,
    setShowCheckoutModal,
    showDuplicateModal,
    duplicateEvent,
    deleteLoading,
    closeDuplicateModal,
    onDuplicateSaved,
    // handlers
    fetchEvent,
    notifyLinkCopied,
    handleRSVP,
    handlePurchaseTicket,
    handleStripeCheckout,
    handleCheckoutComplete,
    handleCancelTicket,
    handleOfflinePayment,
    handleDelete,
    handleDuplicate,
    // navigation
    goBack: router.back,
    goToEvents: () => router.push('/portal/events'),
  };
}

export type UseEventDetailReturn = ReturnType<typeof useEventDetail>;
