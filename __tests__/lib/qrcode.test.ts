/**
 * Tests for lib/utils/qrcode.ts — generateCheckInUrl(), verifyCheckInSignature()
 */

import { generateCheckInUrl, verifyCheckInSignature } from '@/lib/utils/qrcode';

describe('QR Code utilities', () => {
  const ORIGINAL_ENV = process.env;

  beforeAll(() => {
    process.env = { ...ORIGINAL_ENV, CRON_SECRET: 'test-secret' };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  // ── generateCheckInUrl ─────────────────────────────────────────────────

  describe('generateCheckInUrl', () => {
    it('returns a valid URL containing the eventId', () => {
      const url = generateCheckInUrl('event-123', 'member-456');
      expect(url).toContain('/portal/events/event-123/checkin');
    });

    it('returns a valid URL containing the memberId', () => {
      const url = generateCheckInUrl('event-123', 'member-456');
      const parsed = new URL(url);
      expect(parsed.searchParams.get('m')).toBe('member-456');
    });

    it('includes a signature parameter', () => {
      const url = generateCheckInUrl('event-123', 'member-456');
      const parsed = new URL(url);
      expect(parsed.searchParams.get('sig')).toBeTruthy();
      // HMAC-SHA256 hex digest = 64 chars
      expect(parsed.searchParams.get('sig')).toHaveLength(64);
    });

    it('includes a timestamp parameter', () => {
      const url = generateCheckInUrl('event-123', 'member-456');
      const parsed = new URL(url);
      const ts = parsed.searchParams.get('t');
      expect(ts).toBeTruthy();
      expect(Number(ts)).toBeGreaterThan(0);
    });
  });

  // ── verifyCheckInSignature ─────────────────────────────────────────────

  describe('verifyCheckInSignature', () => {
    /** Helper: extract params from a generated URL. */
    function paramsFrom(url: string) {
      const parsed = new URL(url);
      return {
        m: parsed.searchParams.get('m')!,
        t: parsed.searchParams.get('t')!,
        sig: parsed.searchParams.get('sig')!,
      };
    }

    it('returns true for a valid, recently generated signature', () => {
      const url = generateCheckInUrl('event-1', 'member-1');
      const { m, t, sig } = paramsFrom(url);
      expect(verifyCheckInSignature('event-1', m, t, sig)).toBe(true);
    });

    it('returns false when the eventId has been tampered with', () => {
      const url = generateCheckInUrl('event-1', 'member-1');
      const { m, t, sig } = paramsFrom(url);
      expect(verifyCheckInSignature('event-TAMPERED', m, t, sig)).toBe(false);
    });

    it('returns false when the memberId has been tampered with', () => {
      const url = generateCheckInUrl('event-1', 'member-1');
      const { t, sig } = paramsFrom(url);
      expect(verifyCheckInSignature('event-1', 'member-TAMPERED', t, sig)).toBe(false);
    });

    it('returns false for an expired timestamp (>24 hours old)', () => {
      // Generate a URL, then rewind the timestamp by 25 hours
      const url = generateCheckInUrl('event-1', 'member-1');
      const parsed = new URL(url);

      const originalTs = parsed.searchParams.get('t')!;
      const expiredTs = String(Number(originalTs) - 25 * 60 * 60 * 1000);

      // Re-sign with the expired timestamp using the same HMAC logic
      const crypto = require('crypto');
      const expiredSig = crypto
        .createHmac('sha256', 'test-secret')
        .update(`event-1:member-1:${expiredTs}`)
        .digest('hex');

      expect(verifyCheckInSignature('event-1', 'member-1', expiredTs, expiredSig)).toBe(false);
    });

    it('returns true for a recent timestamp within 24 hours', () => {
      // Generate a URL, then set the timestamp to 23 hours ago
      const recentTs = String(Date.now() - 23 * 60 * 60 * 1000);

      const crypto = require('crypto');
      const recentSig = crypto
        .createHmac('sha256', 'test-secret')
        .update(`event-1:member-1:${recentTs}`)
        .digest('hex');

      expect(verifyCheckInSignature('event-1', 'member-1', recentTs, recentSig)).toBe(true);
    });
  });
});
