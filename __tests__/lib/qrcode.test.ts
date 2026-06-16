/**
 * Tests for lib/utils/qrcode.ts — generateCheckInUrl(), verifyCheckInSignature()
 */

import {
  generateCheckInUrl,
  generateTicketQRCodeUrls,
  verifyCheckInSignature,
} from '@/lib/utils/qrcode';

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

    it('produces different signatures for different ticket numbers', () => {
      // Same event/member/timestamp must yield distinct sigs per ticket
      const url1 = generateCheckInUrl('event-1', 'member-1', 1);
      const url2 = generateCheckInUrl('event-1', 'member-1', 2);
      const sig1 = new URL(url1).searchParams.get('sig');
      const sig2 = new URL(url2).searchParams.get('sig');
      expect(sig1).not.toBe(sig2);
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
        tk: parsed.searchParams.get('tk'),
      };
    }

    it('returns true for a valid, recently generated signature (no ticket number)', () => {
      const url = generateCheckInUrl('event-1', 'member-1');
      const { m, t, sig } = paramsFrom(url);
      expect(verifyCheckInSignature('event-1', m, t, sig)).toBe(true);
    });

    it('returns true for a valid per-ticket signature', () => {
      const url = generateCheckInUrl('event-1', 'member-1', 2);
      const { m, t, sig } = paramsFrom(url);
      expect(verifyCheckInSignature('event-1', m, t, sig, 2)).toBe(true);
    });

    it('returns false when verifying ticket 2 sig as ticket 1 (cross-ticket spoofing)', () => {
      const url = generateCheckInUrl('event-1', 'member-1', 2);
      const { m, t, sig } = paramsFrom(url);
      expect(verifyCheckInSignature('event-1', m, t, sig, 1)).toBe(false);
    });

    it('returns false when verifying a numbered sig without providing the ticket number', () => {
      const url = generateCheckInUrl('event-1', 'member-1', 1);
      const { m, t, sig } = paramsFrom(url);
      // sig was produced with tk=1 in payload; verifying without tk must fail.
      expect(verifyCheckInSignature('event-1', m, t, sig)).toBe(false);
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

    it('returns false for a signature older than the ticket window (>180 days)', () => {
      // Tickets stay valid long enough to cover advance sales, but not forever.
      // Rewind the timestamp past the 180-day window and re-sign it.
      const url = generateCheckInUrl('event-1', 'member-1');
      const parsed = new URL(url);

      const originalTs = parsed.searchParams.get('t')!;
      const expiredTs = String(Number(originalTs) - 181 * 24 * 60 * 60 * 1000);

      // Re-sign with the expired timestamp using the same HMAC logic
      const crypto = require('crypto');
      const expiredSig = crypto
        .createHmac('sha256', 'test-secret')
        .update(`event-1:member-1:${expiredTs}`)
        .digest('hex');

      expect(verifyCheckInSignature('event-1', 'member-1', expiredTs, expiredSig)).toBe(false);
    });

    it('returns true for a ticket issued weeks before the event (within 180 days)', () => {
      // A ticket purchased 30 days before the event must still validate — this
      // is the gala placeholder regression: advance-issued QR codes were
      // expiring after 24 hours.
      const recentTs = String(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const crypto = require('crypto');
      const recentSig = crypto
        .createHmac('sha256', 'test-secret')
        .update(`event-1:member-1:${recentTs}`)
        .digest('hex');

      expect(verifyCheckInSignature('event-1', 'member-1', recentTs, recentSig)).toBe(true);
    });

    it('returns false for a signature with wrong length (prevents timingSafeEqual crash)', () => {
      expect(verifyCheckInSignature('event-1', 'member-1', String(Date.now()), 'tooshort')).toBe(false);
    });
  });

  // ── generateTicketQRCodeUrls ───────────────────────────────────────────

  describe('generateTicketQRCodeUrls', () => {
    it('returns one URL per ticket', () => {
      const urls = generateTicketQRCodeUrls('event-1', 'member-1', 3);
      expect(urls).toHaveLength(3);
    });

    it('returns hosted /api/events/qr URLs (not data URIs)', () => {
      const [url] = generateTicketQRCodeUrls('event-1', 'member-1', 1);
      expect(url.startsWith('data:')).toBe(false);
      expect(url).toContain('/api/events/qr');
    });

    it('embeds eventId, memberId, ticket number and a valid per-ticket signature', () => {
      const urls = generateTicketQRCodeUrls('event-1', 'member-1', 2);
      const parsed = new URL(urls[0]);
      expect(parsed.searchParams.get('e')).toBe('event-1');
      expect(parsed.searchParams.get('m')).toBe('member-1');
      expect(parsed.searchParams.get('tk')).toBe('1');
      const t = parsed.searchParams.get('t')!;
      const sig = parsed.searchParams.get('sig')!;
      // Must verify with the ticket number included in the payload.
      expect(verifyCheckInSignature('event-1', 'member-1', t, sig, 1)).toBe(true);
      // Verifying without the ticket number must fail (different HMAC payload).
      expect(verifyCheckInSignature('event-1', 'member-1', t, sig)).toBe(false);
    });

    it('numbers tickets sequentially starting at 1', () => {
      const urls = generateTicketQRCodeUrls('event-1', 'member-1', 3);
      expect(new URL(urls[0]).searchParams.get('tk')).toBe('1');
      expect(new URL(urls[1]).searchParams.get('tk')).toBe('2');
      expect(new URL(urls[2]).searchParams.get('tk')).toBe('3');
    });

    it('includes total ticket count (tot) so QR endpoint can name files "X-of-N"', () => {
      const urls = generateTicketQRCodeUrls('event-1', 'member-1', 3);
      for (const url of urls) {
        expect(new URL(url).searchParams.get('tot')).toBe('3');
      }
    });

    it('each URL carries a unique signature (per-ticket HMAC)', () => {
      const urls = generateTicketQRCodeUrls('event-1', 'member-1', 3);
      const sigs = urls.map(u => new URL(u).searchParams.get('sig'));
      const unique = new Set(sigs);
      expect(unique.size).toBe(3);
    });

    it('each URL signature verifies against its own ticket number', () => {
      const urls = generateTicketQRCodeUrls('event-1', 'member-1', 3);
      urls.forEach((url, idx) => {
        const p = new URL(url);
        const t = p.searchParams.get('t')!;
        const sig = p.searchParams.get('sig')!;
        const tk = parseInt(p.searchParams.get('tk')!, 10);
        expect(verifyCheckInSignature('event-1', 'member-1', t, sig, tk)).toBe(true);
        // Trying to use it as a different ticket number must fail.
        const wrongTk = tk === 1 ? 2 : 1;
        expect(verifyCheckInSignature('event-1', 'member-1', t, sig, wrongTk)).toBe(false);
      });
    });
  });
});
