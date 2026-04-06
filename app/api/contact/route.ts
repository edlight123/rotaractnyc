import { NextResponse } from 'next/server';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';
import { sendEmail } from '@/lib/email/send';
import { contactFormEmail } from '@/lib/email/templates';
import { isValidEmail } from '@/lib/utils/sanitize';

export const dynamic = 'force-dynamic';

const TO_EMAIL = process.env.RESEND_TO_EMAIL || 'rotaractnewyorkcity@gmail.com';

export async function POST(request: Request) {
  // Rate limit: 5 submissions per 60 s per IP
  const rlKey = getRateLimitKey(request, 'contact');
  const rl = rateLimit(rlKey, { max: 5, windowSec: 60 });
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required.' },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 },
      );
    }

    // Templates handle HTML escaping internally (defense-in-depth)
    const template = contactFormEmail({
      name,
      email,
      subject: subject || `Contact from ${name}`,
      message,
    });

    const result = await sendEmail({
      to: TO_EMAIL,
      subject: template.subject,
      html: template.html,
      text: template.text,
      replyTo: email,
    });

    if (!result.success) {
      console.error('Contact form email failed:', name, email);
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
