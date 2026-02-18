/**
 * Email sending via Resend.
 */
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder');

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Rotaract NYC <noreply@rotaractnyc.org>';

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, replyTo, text }: SendEmailOptions) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — email not sent:', subject);
    return { success: false, error: 'Email not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      ...(text && { text }),
      ...(replyTo && { replyTo }),
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error('Email send failed:', err);
    return { success: false, error: err.message };
  }
}

export async function sendBulkEmail(
  recipients: string[],
  subject: string,
  html: string,
) {
  const results = await Promise.allSettled(
    recipients.map((to) => sendEmail({ to, subject, html })),
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  return { sent, failed, total: recipients.length };
}
