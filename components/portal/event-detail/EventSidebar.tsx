import EventRegistration from '@/components/portal/EventRegistration';
import EventQRCode from '@/components/portal/EventQRCode';
import EventDonateSection from '@/components/public/EventDonateSection';
import type { RotaractEvent, RSVPStatus } from '@/types';

interface EventSidebarProps {
  event: RotaractEvent;
  currentRSVP: RSVPStatus | null;
  goingCount: number;
  isPast: boolean;
  onRSVP: (status: RSVPStatus) => Promise<void>;
  onPurchaseTicket: (ticketType: 'member' | 'guest', tierId?: string) => Promise<void>;
}

/**
 * Sticky sidebar: registration/ticketing widget, optional event donations
 * section, and the member's personal check-in QR code (upcoming events only).
 */
export default function EventSidebar({
  event,
  currentRSVP,
  goingCount,
  isPast,
  onRSVP,
  onPurchaseTicket,
}: EventSidebarProps) {
  return (
    <div className="lg:sticky lg:top-6 space-y-4">
      <EventRegistration
        event={event}
        currentRSVP={currentRSVP}
        onRSVP={onRSVP}
        onPurchaseTicket={onPurchaseTicket}
        attendeeCount={goingCount}
      />

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
          <EventQRCode eventId={event.id} />
        </div>
      )}
    </div>
  );
}
