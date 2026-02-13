import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const TO_EMAIL = process.env.RESEND_TO_EMAIL || 'rotaractnewyorkcity@gmail.com';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@rotaractnyc.org';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, age, occupation, reason } = body;

    if (!firstName || !email) {
      return NextResponse.json(
        { error: 'First name and email are required.' },
        { status: 400 },
      );
    }

    const fullName = [firstName, lastName].filter(Boolean).join(' ');

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: `Rotaract NYC Website <${FROM_EMAIL}>`,
        to: [TO_EMAIL],
        replyTo: email,
        subject: `[Membership Interest] ${fullName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #9B1B30;">New Membership Interest</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #666; width: 100px;"><strong>Name:</strong></td><td style="padding: 8px 0;">${fullName}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;"><strong>Email:</strong></td><td style="padding: 8px 0;"><a href="mailto:${email}">${email}</a></td></tr>
              ${age ? `<tr><td style="padding: 8px 0; color: #666;"><strong>Age:</strong></td><td style="padding: 8px 0;">${age}</td></tr>` : ''}
              ${occupation ? `<tr><td style="padding: 8px 0; color: #666;"><strong>Occupation:</strong></td><td style="padding: 8px 0;">${occupation}</td></tr>` : ''}
            </table>
            ${reason ? `
            <div style="margin-top: 16px; padding: 16px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #EBC85B;">
              <p style="margin: 0 0 4px; font-weight: bold; color: #666;">Why they want to join:</p>
              <p style="margin: 0; white-space: pre-wrap;">${reason}</p>
            </div>` : ''}
            <p style="margin-top: 24px; font-size: 12px; color: #999;">Submitted via rotaractnyc.org membership interest form</p>
          </div>
        `,
      });
    } else {
      console.log('Membership interest (Resend not configured):', { fullName, email, age, occupation, reason });
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
