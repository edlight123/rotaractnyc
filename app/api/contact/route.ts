import { NextResponse } from 'next/server';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';
import { sendEmail } from '@/lib/email/send';
import { contactFormEmail } from '@/lib/email/templates';
import { escapeHtml, isValidEmail } from '@/lib/utils/sanitize';

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

    // Sanitize inputs before rendering in HTML email
    const safe = {
      name: escapeHtml(name),
      email: escapeHtml(email),
      subject: escapeHtml(subject || `Contact from ${name}`),
      message: escapeHtml(message),
    };

    const template = contactFormEmail(safe);

    const result = await sendEmail({
      to: TO_EMAIL,
      subject: template.subject,
      html: template.html,
      replyTo: email,
    });

    if (!result.success) {
      console.log('Contact form (email not sent):', safe.name, safe.email);
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
