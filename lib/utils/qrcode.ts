import crypto from 'crypto';
import QRCode from 'qrcode';
import { SITE } from '@/lib/constants';

/**
 * How long a ticket check-in signature stays valid.
 *
 * Tickets are emailed at *purchase* time, which can be days or weeks before an
 * event. The signed timestamp `t` is the issuance time, so this window must be
 * long enough to cover advance ticket sales. With the old 24-hour window, the
 * QR `<img>` in a confirmation email 403'd as soon as the recipient (or an
 * email client's image proxy, e.g. Gmail) loaded it more than a day after
 * purchase — showing a broken-image placeholder — and the scan itself failed
 * at the door. (This is exactly what happened to many 2026 gala tickets.)
 *
 * 180 days comfortably covers any realistic advance-sale window. Security is
 * unaffected: the HMAC still authenticates each (event, member, ticket), and
 * check-in is idempotent (a second scan reports "already checked in"), so a
 * longer validity window enables neither forgery nor double-entry.
 */
const TICKET_SIGNATURE_TTL_MS = 180 * 24 * 60 * 60 * 1000; // 180 days

function getSecret(): string {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error('CRON_SECRET environment variable is not set');
  return secret;
}

/**
 * Build an HMAC-SHA256 signature for a check-in URL.
 */
function hmac(data: string): string {
  return crypto.createHmac('sha256', getSecret()).update(data).digest('hex');
}

/**
 * Generate a signed check-in URL for a specific event + member.
 *
 * When a ticket number is supplied the HMAC payload includes it
 * (`eventId:memberId:timestamp:ticketNumber`), making each QR
 * cryptographically distinct. A forged QR for ticket 2 cannot be
 * validated as ticket 1 or vice versa.
 *
 * Omitting ticketNumber produces the legacy payload (`eventId:memberId:timestamp`)
 * for backward compatibility with existing single-ticket QR codes.
 */
export function generateCheckInUrl(
  eventId: string,
  memberId: string,
  ticketNumber?: number,
): string {
  const timestamp = Date.now().toString();
  const payload = ticketNumber && ticketNumber > 0
    ? `${eventId}:${memberId}:${timestamp}:${ticketNumber}`
    : `${eventId}:${memberId}:${timestamp}`;
  const signature = hmac(payload);
  const tk = ticketNumber && ticketNumber > 0 ? `&tk=${ticketNumber}` : '';
  return `${SITE.url}/portal/events/${eventId}/checkin?m=${memberId}&t=${timestamp}&sig=${signature}${tk}`;
}

/**
 * Verify that a check-in signature is valid and not expired (see
 * TICKET_SIGNATURE_TTL_MS — long enough to cover advance ticket sales).
 *
 * When `ticketNumber` is supplied the verification uses the ticket-specific
 * HMAC payload (`eventId:memberId:timestamp:ticketNumber`), matching the
 * signature produced by generateCheckInUrl. Omit it to verify legacy
 * single-ticket codes signed without a ticket number.
 */
export function verifyCheckInSignature(
  eventId: string,
  memberId: string,
  timestamp: string,
  signature: string,
  ticketNumber?: number,
): boolean {
  const payload = ticketNumber && ticketNumber > 0
    ? `${eventId}:${memberId}:${timestamp}:${ticketNumber}`
    : `${eventId}:${memberId}:${timestamp}`;
  const expected = hmac(payload);
  // Signatures must be 64-char hex (SHA-256). Reject anything else to avoid
  // a crash inside timingSafeEqual on a length mismatch.
  if (signature.length !== 64) return false;
  if (!crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))) {
    return false;
  }
  const ts = Number(timestamp);
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < TICKET_SIGNATURE_TTL_MS;
}

/**
 * Generate a QR code PNG as a base-64 data URL.
 */
export async function generateCheckInQRCode(eventId: string, memberId: string): Promise<string> {
  const url = generateCheckInUrl(eventId, memberId);
  return QRCode.toDataURL(url, { width: 300, margin: 2 });
}

/**
 * Generate one QR code per ticket. Returns an array of base-64 PNG data URLs.
 *
 * Used for paid tickets where quantity > 1 — each attendee gets their own
 * scannable QR code in the confirmation email.
 */
export async function generateTicketQRCodes(
  eventId: string,
  memberId: string,
  quantity: number,
): Promise<string[]> {
  const n = Math.max(1, Math.floor(quantity));
  const codes: string[] = [];
  for (let i = 1; i <= n; i++) {
    const url = generateCheckInUrl(eventId, memberId, i);
    codes.push(await QRCode.toDataURL(url, { width: 300, margin: 2 }));
  }
  return codes;
}

/**
 * Returns hosted HTTPS URLs to render each ticket's QR code as a PNG image.
 *
 * Prefer this over generateTicketQRCodes() for emails — many email clients
 * (Gmail in particular) strip `data:` URIs from `<img src>` for security,
 * so embedded data-URI QR codes appear as broken-image placeholders.
 *
 * The URL is signed with the same HMAC the check-in endpoint uses, so the
 * /api/events/qr route can verify authenticity before rendering the PNG.
 */
export function generateTicketQRCodeUrls(
  eventId: string,
  memberId: string,
  quantity: number,
): string[] {
  const n = Math.max(1, Math.floor(quantity));
  // Each ticket gets its own HMAC — signatures are not interchangeable
  // across ticket numbers. generateCheckInUrl handles the per-ticket payload.
  const urls: string[] = [];
  for (let i = 1; i <= n; i++) {
    const checkInUrl = generateCheckInUrl(eventId, memberId, i);
    // Parse out the signed params so we can forward them to /api/events/qr,
    // which will verify the signature before rendering the PNG.
    const parsed = new URL(checkInUrl);
    const t = parsed.searchParams.get('t')!;
    const sig = parsed.searchParams.get('sig')!;
    const base =
      `${SITE.url}/api/events/qr` +
      `?e=${encodeURIComponent(eventId)}` +
      `&m=${encodeURIComponent(memberId)}` +
      `&t=${t}` +
      `&sig=${sig}` +
      `&tk=${i}` +
      `&tot=${n}`;
    urls.push(base);
  }
  return urls;
}
