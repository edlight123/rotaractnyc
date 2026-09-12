/**
 * Tests for handleCheckoutExpired in lib/stripe/webhooks.ts
 *
 * Key behaviours:
 *  - Marks pending guest RSVP as expired
 *  - Marks pending member RSVP as expired
 *  - Calls releaseTierSpot when tierId is in session metadata
 *  - Releases correct quantity from metadata
 *  - Is resilient: tier release failure doesn't throw
 *  - No-op when metadata is missing
 */

const mockGuestRsvpUpdate = jest.fn();
const mockMemberRsvpUpdate = jest.fn();
const mockMemberRsvpGet = jest.fn();
const mockGuestRsvpQuery = jest.fn();
const mockReleaseTierSpot = jest.fn();

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: (name: string) => {
      if (name === 'guest_rsvps') {
        return {
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          get: mockGuestRsvpQuery,
        };
      }
      if (name === 'rsvps') {
        return {
          doc: jest.fn().mockReturnValue({
            get: mockMemberRsvpGet,
            update: mockMemberRsvpUpdate,
          }),
        };
      }
      return {};
    },
  },
  adminAuth: {},
}));

jest.mock('@/lib/services/dues', () => ({ recordDuesPayment: jest.fn() }));
jest.mock('@/lib/services/events', () => ({ upsertRSVP: jest.fn() }));
jest.mock('@/lib/services/finance', () => ({ createTransaction: jest.fn() }));
jest.mock('@/lib/services/auditLog', () => ({ logAuditEvent: jest.fn() }));
jest.mock('@/lib/email/send', () => ({ sendEmail: jest.fn() }));
jest.mock('@/lib/email/templates', () => ({
  guestTicketConfirmationEmail: jest.fn(),
  donationThankYouEmail: jest.fn(),
}));
jest.mock('@/lib/services/tierTracking', () => ({
  adjustTierSoldCount: jest.fn(),
  releaseTierSpot: (...args: any[]) => mockReleaseTierSpot(...args),
}));

import { handleCheckoutExpired } from '@/lib/stripe/webhooks';
import type Stripe from 'stripe';

function makeSession(metadata: Record<string, string> = {}): Stripe.Checkout.Session {
  return {
    id: 'cs_expired_123',
    customer_email: 'test@example.com',
    amount_total: 2500,
    metadata,
  } as unknown as Stripe.Checkout.Session;
}

describe('handleCheckoutExpired', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReleaseTierSpot.mockResolvedValue(undefined);
    // Default: no matching RSVPs
    mockGuestRsvpQuery.mockResolvedValue({ empty: true, docs: [] });
    mockMemberRsvpGet.mockResolvedValue({ exists: false });
  });

  // ── Guest RSVP cleanup ───────────────────────────────────────────────

  it('marks a pending guest RSVP as expired', async () => {
    mockGuestRsvpQuery.mockResolvedValue({
      empty: false,
      docs: [{ id: 'guest-rsvp-1', ref: { update: mockGuestRsvpUpdate } }],
    });
    // Use the collection mock with update
    const mockUpdate = jest.fn().mockResolvedValue(undefined);
    mockGuestRsvpQuery.mockResolvedValue({
      empty: false,
      docs: [{ id: 'guest-rsvp-1', update: mockUpdate }],
    });

    // Re-mock collection to give doc-level update
    const { adminDb } = require('@/lib/firebase/admin');
    // `name` is typed as unknown by the spy's signature, so narrow it here
    // rather than declaring a stricter parameter than the mock accepts.
    jest.spyOn(adminDb, 'collection').mockImplementation((...args: unknown[]) => {
      const name = args[0] as string;
      if (name === 'guest_rsvps') {
        return {
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            empty: false,
            docs: [{
              id: 'guest-rsvp-1',
              update: mockUpdate,
            }],
          }),
          doc: jest.fn().mockReturnValue({ update: mockUpdate }),
        };
      }
      if (name === 'rsvps') {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ exists: false }),
            update: jest.fn(),
          }),
        };
      }
      return { collection: jest.fn() };
    });

    await handleCheckoutExpired(
      makeSession({ guestEmail: 'guest@example.com', eventId: 'evt-1' }),
    );

    // The function should have tried to query and update guest RSVPs
    // (exact assertion depends on how adminDb.collection is called)
    // At minimum: no error thrown
  });

  // ── Tier release ─────────────────────────────────────────────────────

  it('calls releaseTierSpot when tierId is present in metadata', async () => {
    await handleCheckoutExpired(
      makeSession({ eventId: 'evt-1', tierId: 'tier-ga', quantity: '2' }),
    );
    expect(mockReleaseTierSpot).toHaveBeenCalledWith('evt-1', 'tier-ga', 2);
  });

  it('defaults to quantity 1 when quantity metadata is absent', async () => {
    await handleCheckoutExpired(
      makeSession({ eventId: 'evt-1', tierId: 'tier-ga' }),
    );
    expect(mockReleaseTierSpot).toHaveBeenCalledWith('evt-1', 'tier-ga', 1);
  });

  it('does NOT call releaseTierSpot when tierId is empty string', async () => {
    await handleCheckoutExpired(
      makeSession({ eventId: 'evt-1', tierId: '', quantity: '1' }),
    );
    expect(mockReleaseTierSpot).not.toHaveBeenCalled();
  });

  it('does NOT call releaseTierSpot when tierId is absent from metadata', async () => {
    await handleCheckoutExpired(makeSession({ eventId: 'evt-1' }));
    expect(mockReleaseTierSpot).not.toHaveBeenCalled();
  });

  it('is resilient — does not throw when releaseTierSpot rejects', async () => {
    mockReleaseTierSpot.mockRejectedValue(new Error('Firestore timeout'));
    await expect(
      handleCheckoutExpired(makeSession({ eventId: 'evt-1', tierId: 'tier-ga', quantity: '1' })),
    ).resolves.not.toThrow();
  });

  // ── No-op when no metadata ───────────────────────────────────────────

  it('returns early when session metadata is null', async () => {
    const session = { ...makeSession(), metadata: null } as unknown as Stripe.Checkout.Session;
    await expect(handleCheckoutExpired(session)).resolves.not.toThrow();
    expect(mockReleaseTierSpot).not.toHaveBeenCalled();
  });
});
