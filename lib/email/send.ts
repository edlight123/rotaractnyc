/**
 * Email sending via Resend.
 */
import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  console.warn(
    '⚠️  RESEND_API_KEY is not set. All email sends will be skipped.',
  );
}

// Lazy-initialized Resend client. We can't construct it at module load
// because Node-loaded CLI scripts (e.g. scripts/send-gala-invites.ts) run
// `dotenv.config()` AFTER imports are hoisted — so the env var isn't
// populated yet at module-evaluation time. Building the client on first
// use lets the script populate process.env before we read it.
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY || 'placeholder');
  }
  return _resend;
}

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ||
  process.env.RESEND_FROM || // production uses RESEND_FROM on Vercel
  'Rotaract NYC <noreply@rotaractnyc.org>';

interface EmailAttachment {
  filename: string;
  /** Either a Node Buffer or a base64-encoded string. */
  content: Buffer | string;
  contentType?: string;
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  text?: string;
  attachments?: EmailAttachment[];
}

export async function sendEmail({ to, subject, html, replyTo, text, attachments }: SendEmailOptions) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — email not sent:', subject);
    return { success: false, error: 'Email not configured' };
  }

  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      ...(text && { text }),
      ...(replyTo && { replyTo }),
      ...(attachments && attachments.length > 0 && {
        attachments: attachments.map((a) => ({
          filename: a.filename,
          content: a.content,
          ...(a.contentType && { contentType: a.contentType }),
        })),
      }),
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

const BULK_CHUNK_SIZE = 10;
const BULK_CHUNK_DELAY_MS = 100;

export async function sendBulkEmail(
  recipients: string[],
  subject: string,
  html: string,
  text?: string,
  attachments?: EmailAttachment[],
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — bulk email not sent:', subject);
    return { sent: 0, failed: recipients.length, total: recipients.length };
  }

  let sent = 0;
  let failed = 0;

  // Process recipients in chunks to avoid Resend rate limits
  for (let i = 0; i < recipients.length; i += BULK_CHUNK_SIZE) {
    const chunk = recipients.slice(i, i + BULK_CHUNK_SIZE);

    const results = await Promise.allSettled(
      chunk.map((to) => sendEmail({ to, subject, html, text, attachments })),
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.success) {
        sent++;
      } else {
        failed++;
      }
    }

    // Small delay between chunks to stay within rate limits
    if (i + BULK_CHUNK_SIZE < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, BULK_CHUNK_DELAY_MS));
    }
  }

  return { sent, failed, total: recipients.length };
}
