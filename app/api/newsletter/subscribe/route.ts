import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { adminDb } from '@/lib/firebase/admin';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';
import { sendEmail } from '@/lib/email/send';
import { newsletterConfirmEmail } from '@/lib/email/templates';
import { isValidEmail } from '@/lib/utils/sanitize';
import { SITE } from '@/lib/constants';
import type { NewsletterSubscriber } from '@/types';

export const dynamic = 'force-dynamic';

const COLLECTION = 'newsletter_subscribers';
const ALLOWED_SOURCES: NewsletterSubscriber['source'][] = ['footer', 'event', 'donate', 'account'];

/** Stable, idempotent doc id from an email address. */
function emailKey(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
}

export async function POST(request: Request) {
  // Rate limit: 3 submissions per 60s per IP
  const rlKey = getRateLimitKey(request, 'newsletter-subscribe');
  const rl = await rateLimit(rlKey, { max: 3, windowSec: 60 });
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : undefined;
    const source: NewsletterSubscriber['source'] = ALLOWED_SOURCES.includes(body.source)
      ? body.source
      : 'footer';

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 },
      );
    }

    const normalized = email.toLowerCase();
    const ref = adminDb.collection(COLLECTION).doc(emailKey(normalized));
    const existing = await ref.get();

    // Already confirmed? Nothing to do — respond success without re-sending.
    if (existing.exists && existing.data()?.confirmed === true) {
      return NextResponse.json({ success: true, message: "You're already subscribed." });
    }

    const token = randomUUID();
    const now = new Date().toISOString();

    const record: NewsletterSubscriber = {
      email: normalized,
      ...(name && { name }),
      source,
      confirmed: false,
      createdAt: existing.exists ? existing.data()?.createdAt || now : now,
    };

    // Persist subscriber + the confirmation token (token stored alongside the record).
    await ref.set({ ...record, token }, { merge: true });

    const confirmUrl = `${SITE.url}/api/newsletter/confirm?token=${token}`;
    const template = newsletterConfirmEmail({ name, confirmUrl });
    const result = await sendEmail({
      to: normalized,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    if (!result.success) {
      console.info('Newsletter subscribe (confirmation email not sent):', normalized);
    }

    return NextResponse.json({
      success: true,
      message: 'Almost there! Check your inbox to confirm your subscription.',
    });
  } catch (error: any) {
    console.error('Newsletter subscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe. Please try again.' },
      { status: 500 },
    );
  }
}
