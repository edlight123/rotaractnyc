'use client';

import { useState } from 'react';
import { Plus, CalendarDays } from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth';
import { usePortalEvents, useMemberRsvps, apiGet, apiPost } from '@/hooks/useFirestore';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Tabs from '@/components/ui/Tabs';
import SearchInput from '@/components/ui/SearchInput';
import EmptyState from '@/components/ui/EmptyState';
import { CardGridSkeleton, ListSkeleton } from '@/components/ui/Skeleton';
import CreateEventModal from '@/components/portal/CreateEventModal';
import EventCheckoutModal from '@/components/portal/EventCheckoutModal';
import EventCard from '@/components/portal/EventCard';
import CalendarView from '@/components/portal/CalendarView';
import PageHeader from '@/components/portal/PageHeader';
import PageContainer from '@/components/portal/PageContainer';
import FilterBar, { FilterSelect } from '@/components/portal/FilterBar';
import DataView, { ViewToggle, type ViewMode } from '@/components/portal/DataView';
import { defaultEvents } from '@/lib/defaults/data';
import type { RotaractEvent, RSVPStatus, EventType, PaymentSettings } from '@/types';

const TYPE_FILTERS = [
  { value: 'all', label: 'All types' },
  { value: 'free', label: 'Free' },
  { value: 'paid', label: 'Ticketed' },
  { value: 'service', label: 'Service' },
  { value: 'hybrid', label: 'Hybrid' },
];

export default function PortalEventsPage() {
  const { user, member } = useAuth();
  const { toast } = useToast();
  const { data: firestoreEvents, loading } = usePortalEvents();
  const { data: memberRsvps } = useMemberRsvps(user?.uid ?? null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [rsvpLoading, setRsvpLoading] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  // Optimistic RSVP state: eventId → status
  const [optimisticRsvps, setOptimisticRsvps] = useState<Record<string, RSVPStatus>>({});
  // Checkout modal state
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutEvent, setCheckoutEvent] = useState<RotaractEvent | null>(null);
  const [checkoutTicketType, setCheckoutTicketType] = useState<'member' | 'guest'>('member');
  const [checkoutPriceCents, setCheckoutPriceCents] = useState(0);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);

  const canManageEvents = member && ['board', 'president', 'treasurer'].includes(member.role);

  // Map of eventId → RSVP loaded from Firestore (authoritative source of truth
  // for whether the current member is already going / has bought a ticket).
  // Used together with `optimisticRsvps` so newly-purchased tickets reflect
  // immediately while older purchases survive page reloads.
  const serverRsvps = (memberRsvps || []).reduce<Record<string, { status: RSVPStatus; paymentStatus?: string; paidAmount?: number; quantity?: number }>>((acc, r: any) => {
    if (r?.eventId && r?.status) {
      acc[r.eventId] = {
        status: r.status as RSVPStatus,
        paymentStatus: r.paymentStatus,
        paidAmount: r.paidAmount,
        quantity: r.quantity,
      };
    }
    return acc;
  }, {});

  const getMyRsvp = (eventId: string): RSVPStatus | undefined =>
    optimisticRsvps[eventId] ?? serverRsvps[eventId]?.status;

  const isTicketLocked = (eventId: string): boolean => {
    const r = serverRsvps[eventId];
    if (!r) return false;
    if (r.status !== 'going') return false;
    // For ANY confirmed-going RSVP on a paid event we treat the ticket as
    // locked. Cancelling a paid ticket must go through the team (refund
    // process) rather than a stray tap on the button. We intentionally do
    // not rely on paymentStatus here — older RSVP rows may be missing it.
    const ev = (firestoreEvents || []).find((e: any) => e.id === eventId) as any;
    const isPaidEvent = ev && (ev.type === 'paid' || ev.type === 'hybrid')
      && ev.pricing && (ev.pricing.memberPrice ?? 0) > 0;
    if (isPaidEvent) return true;
    // Free / pending / paid status fields also lock (defense in depth).
    return ['paid', 'pending', 'pending_offline', 'free'].includes(
      r.paymentStatus || '',
    ) || (r.paidAmount ?? 0) > 0;
  };

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

  // Calendar view spans whole months, so it ignores the upcoming/past split.
  const calendarEvents = allEvents.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch =
      (e.title || '').toLowerCase().includes(q) || (e.description || '').toLowerCase().includes(q);
    const matchType = typeFilter === 'all' || e.type === typeFilter;
    return matchSearch && matchType;
  });

  const handleRSVP = async (eventId: string, status: RSVPStatus) => {
    if (!user) return;
    // Optimistic update — show the status immediately
    const previousStatus = optimisticRsvps[eventId];
    setOptimisticRsvps((prev) => ({ ...prev, [eventId]: status }));
    setRsvpLoading(eventId);
    try {
      await apiPost('/api/portal/events/rsvp', { eventId, status });
      toast(status === 'going' ? "You're going!" : status === 'maybe' ? 'Marked as maybe' : 'RSVP updated');
    } catch (err: any) {
      // Revert optimistic update on error
      setOptimisticRsvps((prev) => {
        const updated = { ...prev };
        if (previousStatus) {
          updated[eventId] = previousStatus;
        } else {
          delete updated[eventId];
        }
        return updated;
      });
      toast(err.message || 'RSVP failed', 'error');
    } finally {
      setRsvpLoading(null);
    }
  };

  const handleTicketPurchase = async (event: RotaractEvent, ticketType: 'member' | 'guest' = 'member') => {
    if (!user) return;
    if (!event.pricing) return;

    const priceCents = ticketType === 'member' ? event.pricing.memberPrice : (event.pricing.guestPrice ?? event.pricing.memberPrice);

    // Free ticket — register directly
    if (priceCents === 0) {
      setRsvpLoading(event.id);
      try {
        await apiPost('/api/portal/events/checkout', { eventId: event.id, ticketType });
        toast("You're in!");
        setOptimisticRsvps((prev) => ({ ...prev, [event.id]: 'going' }));
      } catch (err: any) {
        toast(err.message || 'Ticket purchase failed', 'error');
      } finally {
        setRsvpLoading(null);
      }
      return;
    }

    // Paid ticket — open checkout modal
    if (!paymentSettings) {
      // Fetch settings lazily on first open
      try {
        const settingsData = await apiGet('/api/settings').catch(() => null);
        setPaymentSettings(settingsData?.paymentSettings ?? { zelleEnabled: true, venmoEnabled: true });
      } catch {
        setPaymentSettings({ zelleEnabled: true, venmoEnabled: true });
      }
    }
    setCheckoutEvent(event);
    setCheckoutTicketType(ticketType);
    setCheckoutPriceCents(priceCents);
    setShowCheckoutModal(true);
  };

  const handleStripeCheckout = async (embedded?: boolean, quantity?: number) => {
    if (!checkoutEvent) return null;
    try {
      const canUseEmbeddedCheckout = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) && embedded !== false;
      const res = await apiPost('/api/portal/events/checkout', {
        eventId: checkoutEvent.id,
        ticketType: checkoutTicketType,
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

  const handleOfflinePayment = async (method: string, proofUrl?: string) => {
    if (!checkoutEvent) return;
    try {
      await apiPost('/api/portal/events/checkout', {
        eventId: checkoutEvent.id,
        ticketType: checkoutTicketType,
        paymentMethod: method,
        proofUrl,
      });
      toast(`Payment pending for ${method}. Our treasurer will confirm receipt.`);
      setShowCheckoutModal(false);
      setOptimisticRsvps((prev) => ({ ...prev, [checkoutEvent.id]: 'going' }));
    } catch (err: any) {
      toast(err.message || 'Payment registration failed', 'error');
    }
  };

  const handleCheckoutComplete = () => {
    setShowCheckoutModal(false);
    if (checkoutEvent) {
      setOptimisticRsvps((prev) => ({ ...prev, [checkoutEvent.id]: 'going' }));
      toast("Payment complete! You're in.");
    }
  };

  const views: ViewMode[] = ['list', 'grid', 'calendar'];
  const isCalendar = viewMode === 'calendar';

  return (
    <>
      <PageContainer width="default">
        <PageHeader
          title="Events"
          subtitle="RSVP to upcoming events and track your attendance."
          actions={
            canManageEvents && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 -ml-0.5" />
                Create Event
              </Button>
            )
          }
        />

        {/* Toolbar */}
        <FilterBar trailing={<ViewToggle value={viewMode} onChange={setViewMode} views={views} />}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search events…"
            className="w-full sm:max-w-xs"
          />
          {!isCalendar && (
            <Tabs
              tabs={[
                { id: 'upcoming', label: 'Upcoming' },
                { id: 'past', label: 'Past' },
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
            />
          )}
          <FilterSelect
            label="Filter by type"
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as EventType | 'all')}
            options={TYPE_FILTERS}
          />
        </FilterBar>

        {/* ── Event list ── */}
        {isCalendar ? (
          loading ? (
            <div className="h-[32rem] rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ) : (
            <CalendarView events={calendarEvents} />
          )
        ) : (
          <DataView
            loading={loading}
            isEmpty={events.length === 0}
            skeleton={viewMode === 'grid' ? <CardGridSkeleton count={4} /> : <ListSkeleton rows={3} />}
            empty={
              <EmptyState
                icon={<CalendarDays className="w-7 h-7" />}
                title={activeTab === 'upcoming' ? 'No upcoming events' : 'No past events found'}
                description="Check back soon for new events."
              />
            }
            count={events.length}
            itemLabel="event"
          >
            <div className={viewMode === 'grid' ? 'grid sm:grid-cols-2 gap-5' : 'grid gap-5'}>
              {events.map((event, index) => (
                <EventCard
                  key={event.id}
                  event={event}
                  variant={viewMode === 'grid' ? 'grid' : 'list'}
                  index={index}
                  myRsvp={getMyRsvp(event.id)}
                  ticketLocked={isTicketLocked(event.id)}
                  loading={rsvpLoading === event.id}
                  anyLoading={!!rsvpLoading}
                  isPast={new Date(event.date) < now}
                  onRSVP={(status) => handleRSVP(event.id, status)}
                  onPurchase={(ticketType) => handleTicketPurchase(event, ticketType)}
                />
              ))}
            </div>
          </DataView>
        )}
      </PageContainer>


      {/* Ticket Checkout Modal */}
      {checkoutEvent && (
        <EventCheckoutModal
          open={showCheckoutModal}
          onClose={() => setShowCheckoutModal(false)}
          eventId={checkoutEvent.id}
          eventTitle={checkoutEvent.title}
          ticketType={checkoutTicketType}
          priceCents={checkoutPriceCents}
          existingTicketCount={serverRsvps[checkoutEvent.id]?.status === 'going' ? (serverRsvps[checkoutEvent.id]?.quantity ?? 1) : 0}
          paymentSettings={paymentSettings ?? { zelleEnabled: true, venmoEnabled: true }}
          onStripeCheckout={handleStripeCheckout}
          onOfflinePayment={handleOfflinePayment}
          onCheckoutComplete={handleCheckoutComplete}
        />
      )}

      {/* Create/Edit Event Modal */}
      <CreateEventModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSaved={() => {
          toast('Event saved!');
        }}
      />
    </>
  );
}
