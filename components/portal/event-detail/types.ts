/**
 * Shared types for the portal event-detail feature.
 *
 * These describe the API-shaped data rendered by the admin-only panels
 * (ticket purchasers, donations) and the lightweight guest RSVP records
 * surfaced on the event page. They live here so the page, the
 * `useEventDetail` hook, and the presentational panels can all share a
 * single source of truth.
 */

/** A single ticket purchaser row (member or guest). */
export interface Purchaser {
  id: string;
  kind: 'guest' | 'member';
  name: string;
  email: string;
  phone?: string | null;
  status: string;
  paymentStatus: string;
  quantity: number;
  amountCents: number;
  tierId: string | null;
  createdAt: string;
  source?: 'transaction' | 'offline_payment' | 'rsvp' | 'guest_rsvp';
  orderId?: string | null;
}

/** Aggregated totals for the ticket-purchasers panel. */
export interface PurchaserSummary {
  totalRevenueCents: number;
  totalRevenue: number;
  guestCount: number;
  memberCount: number;
  totalTickets: number;
  totalAttendees?: number;
  orderCount?: number;
}

/** A single donation row attributed to the event. */
export interface EventDonation {
  id: string;
  donorName: string;
  donorEmail: string | null;
  amountCents: number;
  message: string | null;
  createdAt: string;
}

/** Aggregated totals for the donations panel. */
export interface DonationSummary {
  count: number;
  totalCents: number;
  eventTotalCents: number;
  eventTotalCount: number;
  fundraisingGoalCents: number | null;
}

/** Lightweight guest RSVP record used for attendee chips + counts. */
export interface GuestRsvpLite {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  paymentStatus?: string;
  /** Number of seats in this guest booking (group bookings > 1). */
  quantity?: number;
  createdAt: string;
}
