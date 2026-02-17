import { NextResponse } from 'next/server';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';
import { sendEmail } from '@/lib/email/send';
import { membershipInterestEmail } from '@/lib/email/templates';
import { escapeHtml, isValidEmail } from '@/lib/utils/sanitize';

export const dynamic = 'force-dynamic';

const TO_EMAIL = process.env.RESEND_TO_EMAIL || 'rotaractnewyorkcity@gmail.com';

export async function POST(request: Request) {
  // Rate limit: 3 submissions per 60 s per IP
  const rlKey = getRateLimitKey(request, 'membership-interest');
  const rl = rateLimit(rlKey, { max: 3, windowSec: 60 });
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    const body = await request.json();
    const { firstName, lastName, email, age, occupation, reason } = body;

    if (!firstName || !email) {
      return NextResponse.json(
        { error: 'First name and email are required.' },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 },
      );
    }

    const fullName = [firstName, lastName].filter(Boolean).join(' ');

    const template = membershipInterestEmail({
      name: escapeHtml(fullName),
      email: escapeHtml(email),
      message: reason ? escapeHtml(reason) : undefined,
    });

    const result = await sendEmail({
      to: TO_EMAIL,
      subject: template.subject,
      html: template.html,
      replyTo: email,
    });

    if (!result.success) {
      console.log('Membership interest (email not sent):', fullName, email);
    }

    return NextResponse.json({ success: true, message: 'Interest submitted successfully.' });
  } catch (error: any) {
    console.error('Membership interest error:', error);
    return NextResponse.json(
      { error: 'Failed to submit. Please try again.' },
      { status: 500 },
    );
  }
}
