'use client';

import dynamic from 'next/dynamic';
import { ChevronLeft } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useEventDetail } from '@/hooks/useEventDetail';
import EventDetailSkeleton from '@/components/portal/event-detail/EventDetailSkeleton';
import EventHero from '@/components/portal/event-detail/EventHero';
import EventHeader from '@/components/portal/event-detail/EventHeader';
import EventAbout from '@/components/portal/event-detail/EventAbout';
import EventPricingPanel from '@/components/portal/event-detail/EventPricingPanel';
import EventAttendeesPanel from '@/components/portal/event-detail/EventAttendeesPanel';
import EventAdminLinks from '@/components/portal/event-detail/EventAdminLinks';
import EventPurchasersPanel from '@/components/portal/event-detail/EventPurchasersPanel';
import EventDonationsPanel from '@/components/portal/event-detail/EventDonationsPanel';
import EventSidebar from '@/components/portal/event-detail/EventSidebar';
import DeleteEventDialog from '@/components/portal/event-detail/DeleteEventDialog';

/* Heavy, conditionally-used modals are code-split out of the initial route
   bundle. CreateEventModal is ~1.3k lines (plus Firebase upload) and
   EventCheckoutModal pulls in the entire Stripe SDK — neither is needed to
   view an event, so they only download when an admin opens the editor or a
   member starts checkout. */
const CreateEventModal = dynamic(() => import('@/components/portal/CreateEventModal'), { ssr: false });
const EventCheckoutModal = dynamic(() => import('@/components/portal/EventCheckoutModal'), { ssr: false });

export default function PortalEventDetailPage() {
  const ev = useEventDetail();

  if (ev.loading) return <EventDetailSkeleton />;

  if (!ev.event) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">Event not found.</p>
        <Button variant="secondary" onClick={ev.goToEvents}>Back to Events</Button>
      </div>
    );
  }

  const { event, canManageEvents } = ev;

  return (
    <>
      <div className="max-w-5xl mx-auto space-y-6 page-enter pb-32 lg:pb-6 overflow-hidden">
        {/* Back */}
        <button onClick={ev.goBack} className="group inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-cranberry dark:text-gray-400 dark:hover:text-cranberry-400 transition-colors">
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          Back to events
        </button>

        <div className="grid lg:grid-cols-3 gap-6 items-start">
          {/* ── Main ── */}
          <div className="lg:col-span-2 space-y-5 min-w-0">
            <EventHero event={event} />

            <EventHeader
              event={event}
              canManageEvents={canManageEvents}
              onEdit={() => ev.setShowEditModal(true)}
              onDuplicate={ev.handleDuplicate}
              onDelete={() => ev.setShowDeleteConfirm(true)}
              onCopiedLink={ev.notifyLinkCopied}
            />

            <EventAbout event={event} />

            <EventPricingPanel event={event} />

            <EventAttendeesPanel
              rsvps={ev.rsvps}
              guestRsvps={ev.guestRsvps}
              distinctAttendeeCount={ev.distinctAttendeeCount}
              goingCount={ev.goingCount}
            />

            {canManageEvents && (
              <>
                <EventAdminLinks eventId={ev.id} />
                <EventPurchasersPanel
                  eventId={ev.id}
                  purchasers={ev.purchasers}
                  summary={ev.purchaserSummary}
                  onRefresh={ev.refreshPurchasers}
                />
                <EventDonationsPanel
                  acceptsDonations={event.acceptsDonations}
                  donations={ev.donations}
                  summary={ev.donationSummary}
                />
              </>
            )}
          </div>

          {/* ── Sidebar ── */}
          <EventSidebar
            event={event}
            currentRSVP={ev.currentRSVP}
            goingCount={ev.goingCount}
            isPast={ev.isPast}
            onRSVP={ev.handleRSVP}
            onPurchaseTicket={ev.handlePurchaseTicket}
          />
        </div>
      </div>

      {/* Modals must live outside the page-enter div — its translateY animation
          creates a new containing block that confines position:fixed children
          (the backdrop) to the div, so the modal renders below the page rather
          than centered on the viewport. Same pattern used in portal/page.tsx
          and portal/documents/page.tsx. */}

      {canManageEvents && ev.showEditModal && (
        <CreateEventModal
          open
          onClose={() => ev.setShowEditModal(false)}
          event={event}
          onSaved={() => ev.fetchEvent()}
        />
      )}

      {ev.showCheckoutModal && ev.paymentSettings && (
        <EventCheckoutModal
          open
          onClose={() => ev.setShowCheckoutModal(false)}
          eventId={ev.id}
          eventTitle={event.title}
          ticketType={ev.checkoutTicketType}
          priceCents={ev.checkoutPriceCents}
          paymentSettings={ev.paymentSettings}
          onStripeCheckout={ev.handleStripeCheckout}
          onOfflinePayment={ev.handleOfflinePayment}
          onCheckoutComplete={ev.handleCheckoutComplete}
        />
      )}

      <DeleteEventDialog
        open={ev.showDeleteConfirm}
        eventTitle={event.title}
        loading={ev.deleteLoading}
        onCancel={() => ev.setShowDeleteConfirm(false)}
        onConfirm={ev.handleDelete}
      />

      {/* Duplicate event modal */}
      {canManageEvents && ev.showDuplicateModal && ev.duplicateEvent && (
        <CreateEventModal
          open
          onClose={ev.closeDuplicateModal}
          event={ev.duplicateEvent}
          onSaved={ev.onDuplicateSaved}
        />
      )}
    </>
  );
}
