/**
 * Tests for the 'dues_balance' checkout type in lib/stripe/webhooks.ts
 *
 * A balance payment tops up an existing dues record (e.g. $5 owed after
 * paying $85 on $90 dues). It must add to the recorded amount, never replace
 * it the way a full dues payment does.
 */

const mockDuesUpdate = jest.fn();
const mockDuesDoc = jest.fn();
const mockRecordDuesPayment = jest.fn();
const mockCreateTransaction = jest.fn();

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: (name: string) => {
      if (name === 'transactions') {
        return {
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({ empty: true }),
        };
      }
      if (name === 'memberDues') {
        return { doc: (id: string) => { mockDuesDoc(id); return { update: mockDuesUpdate }; } };
      }
      return {};
    },
  },
  adminAuth: {},
}));

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { increment: (n: number) => ({ __increment: n }) },
}));
jest.mock('@/lib/services/dues', () => ({
  recordDuesPayment: (...args: any[]) => mockRecordDuesPayment(...args),
}));
jest.mock('@/lib/services/events', () => ({ upsertRSVP: jest.fn() }));
jest.mock('@/lib/services/finance', () => ({
  createTransaction: (...args: any[]) => mockCreateTransaction(...args),
}));
jest.mock('@/lib/services/auditLog', () => ({ logAuditEvent: jest.fn() }));
jest.mock('@/lib/email/send', () => ({ sendEmail: jest.fn() }));
jest.mock('@/lib/email/templates', () => ({
  guestTicketConfirmationEmail: jest.fn(),
  memberTicketConfirmationEmail: jest.fn(),
  donationThankYouEmail: jest.fn(),
}));
jest.mock('@/lib/services/tierTracking', () => ({
  adjustTierSoldCount: jest.fn(),
  releaseTierSpot: jest.fn(),
}));

import { handleCheckoutCompleted } from '@/lib/stripe/webhooks';
import type Stripe from 'stripe';

function makeSession(metadata: Record<string, string>): Stripe.Checkout.Session {
  return { id: 'cs_balance_123', amount_total: 500, metadata } as unknown as Stripe.Checkout.Session;
}

describe('dues balance payment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('adds the payment to the existing dues record and clears the balance', async () => {
    await handleCheckoutCompleted(makeSession({ type: 'dues_balance', memberId: 'm1', duesDocId: 'd1' }));

    expect(mockDuesDoc).toHaveBeenCalledWith('d1');
    expect(mockDuesUpdate).toHaveBeenCalledWith(expect.objectContaining({
      amount: { __increment: 500 },
      balanceDue: { __increment: -500 },
    }));
    expect(mockRecordDuesPayment).not.toHaveBeenCalled();
    expect(mockCreateTransaction).toHaveBeenCalledWith(expect.objectContaining({
      amount: 500,
      category: 'Dues',
      relatedMemberId: 'm1',
      stripeSessionId: 'cs_balance_123',
    }));
  });

  it('does nothing when the dues record is not identified', async () => {
    await handleCheckoutCompleted(makeSession({ type: 'dues_balance', memberId: 'm1' }));

    expect(mockDuesUpdate).not.toHaveBeenCalled();
    expect(mockCreateTransaction).not.toHaveBeenCalled();
  });
});
