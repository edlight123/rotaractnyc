import crypto from 'crypto';
import QRCode from 'qrcode';
import { SITE } from '@/lib/constants';

const SIGNATURE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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
 */
export function generateCheckInUrl(eventId: string, memberId: string): string {
  const timestamp = Date.now().toString();
  const signature = hmac(`${eventId}:${memberId}:${timestamp}`);
  return `${SITE.url}/portal/events/${eventId}/checkin?m=${memberId}&t=${timestamp}&sig=${signature}`;
}

/**
 * Verify that a check-in signature is valid and not expired (24-hour window).
 */
export function verifyCheckInSignature(
  eventId: string,
  memberId: string,
  timestamp: string,
  signature: string,
): boolean {
  const expected = hmac(`${eventId}:${memberId}:${timestamp}`);
  if (!crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))) {
    return false;
  }
  const ts = Number(timestamp);
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < SIGNATURE_TTL_MS;
}

/**
 * Generate a QR code PNG as a base-64 data URL.
 */
export async function generateCheckInQRCode(eventId: string, memberId: string): Promise<string> {
  const url = generateCheckInUrl(eventId, memberId);
  return QRCode.toDataURL(url, { width: 300, margin: 2 });
}
