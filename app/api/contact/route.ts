import { NextResponse } from 'next/server';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';
import { sendEmail } from '@/lib/email/send';
import { contactFormEmail } from '@/lib/email/templates';
import { isValidEmail } from '@/lib/utils/sanitize';

export const dynamic = 'force-dynamic';

const TO_EMAIL = process.env.RESEND_TO_EMAIL || 'info@rotaractnyc.org';

export async function POST(request: Request) {
  // Rate limit: 5 submissions per 60 s per IP
  const rlKey = getRateLimitKey(request, 'contact');
  const rl = await rateLimit(rlKey, { max: 5, windowSec: 60 });
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  try {
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const { name, email, subject, message } = body as Record<string, unknown>;

    const trimName    = typeof name    === 'string' ? name.trim()    : '';
    const trimEmail   = typeof email   === 'string' ? email.trim()   : '';
    const trimSubject = typeof subject === 'string' ? subject.trim() : '';
    const trimMessage = typeof message === 'string' ? message.trim() : '';

    if (!trimName || !trimEmail || !trimMessage) {
      return NextResponse.json(
        { error: 'Name, email, and message are required.' },
        { status: 400 },
      );
    }

    if (!isValidEmail(trimEmail)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 },
      );
    }

    if (trimName.length > 100) {
      return NextResponse.json({ error: 'Name must be 100 characters or fewer.' }, { status: 400 });
    }
    if (trimSubject.length > 200) {
      return NextResponse.json({ error: 'Subject must be 200 characters or fewer.' }, { status: 400 });
    }
    if (trimMessage.length > 5000) {
      return NextResponse.json({ error: 'Message must be 5,000 characters or fewer.' }, { status: 400 });
    }

    // Templates handle HTML escaping internally (defense-in-depth)
    const template = contactFormEmail({
      name:    trimName,
      email:   trimEmail,
      subject: trimSubject || `Contact from ${trimName}`,
      message: trimMessage,
    });

    const result = await sendEmail({
      to: TO_EMAIL,
      subject: template.subject,
      html: template.html,
      text: template.text,
      replyTo: trimEmail,
    });

    if (!result.success) {
      console.error('Contact form email failed:', trimName, trimEmail);
      return NextResponse.json(
        { error: 'Failed to send message. Please try again later.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, message: 'Message sent successfully.' });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Failed to send message. Please try again.' },
      { status: 500 },
    );
  }
}
