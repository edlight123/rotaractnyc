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
  /** Extra headers, e.g. List-Unsubscribe for newsletter sends. */
  headers?: Record<string, string>;
  /**
   * Bypass the EMAILS_PAUSED kill switch for a single transactional send.
   * Use ONLY for admin-initiated, one-recipient, credential-style messages
   * (e.g. Workspace account provisioning) where the recipient needs the email
   * to use the thing that was just created. Never set this on bulk/cron sends.
   */
  ignorePause?: boolean;
}

/**
 * Global kill switch: set EMAILS_PAUSED=true in the environment to silently
 * skip ALL outbound email (crons, welcome sequence, RSVP confirmations,
 * broadcasts…). Sends report success so callers don't error or retry.
 * Remove the env var (and redeploy) to resume sending.
 */
function emailsPaused(): boolean {
  return process.env.EMAILS_PAUSED === 'true';
}

// Resend allows only a few requests per second per account. A rejected
// request is safe to repeat, so wait and retry instead of dropping the email.
const RATE_LIMIT_RETRIES = 4;
const RATE_LIMIT_BACKOFF_MS = 1000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRateLimitRetry<T extends { error: { name?: string } | null }>(
  request: () => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const result = await request();
    if (result.error?.name !== 'rate_limit_exceeded' || attempt >= RATE_LIMIT_RETRIES) return result;
    await sleep(RATE_LIMIT_BACKOFF_MS * (attempt + 1));
  }
}

export async function sendEmail({ to, subject, html, replyTo, text, attachments, headers, ignorePause }: SendEmailOptions) {
  if (emailsPaused() && !ignorePause) {
    console.warn(`✋ EMAILS_PAUSED — skipped send: "${subject}" → ${Array.isArray(to) ? to.join(', ') : to}`);
    return { success: true, id: 'paused-skip' };
  }
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — email not sent:', subject);
    return { success: false, error: 'Email not configured' };
  }

  try {
    const { data, error } = await withRateLimitRetry(() => getResend().emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      ...(text && { text }),
      ...(replyTo && { replyTo }),
      ...(headers && { headers }),
      ...(attachments && attachments.length > 0 && {
        attachments: attachments.map((a) => ({
          filename: a.filename,
          content: a.content,
          ...(a.contentType && { contentType: a.contentType }),
        })),
      }),
    }));

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

// Resend's batch endpoint takes up to 100 emails in one request, so a whole
// member list costs one request instead of one per recipient. Firing those
// individually, ten at a time, tripped the rate limit and dropped most of a
// 39-recipient broadcast.
const BATCH_SIZE = 100;
const BATCH_DELAY_MS = 600;

export interface BulkEmailResult {
  sent: number;
  failed: number;
  total: number;
  /** Addresses that did not go out, so a retry can target only them. */
  failedRecipients: string[];
}

export async function sendBulkEmail(
  recipients: string[],
  subject: string,
  html: string,
  text?: string,
  attachments?: EmailAttachment[],
): Promise<BulkEmailResult> {
  if (emailsPaused()) {
    console.warn(`✋ EMAILS_PAUSED — skipped bulk send: "${subject}" → ${recipients.length} recipients`);
    return { sent: 0, failed: 0, total: recipients.length, failedRecipients: [] };
  }
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — bulk email not sent:', subject);
    return { sent: 0, failed: recipients.length, total: recipients.length, failedRecipients: [...recipients] };
  }

  const failedRecipients: string[] = [];

  if (attachments && attachments.length > 0) {
    // The batch endpoint doesn't accept attachments; send one at a time.
    for (const to of recipients) {
      const result = await sendEmail({ to, subject, html, text, attachments });
      if (!result.success) failedRecipients.push(to);
    }
  } else {
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const chunk = recipients.slice(i, i + BATCH_SIZE);
      try {
        const { error } = await withRateLimitRetry(() => getResend().batch.send(
          chunk.map((to) => ({ from: FROM_EMAIL, to: [to], subject, html, ...(text && { text }) })),
        ));
        if (error) {
          console.error('Resend batch error:', error);
          failedRecipients.push(...chunk);
        }
      } catch (err) {
        console.error('Resend batch send failed:', err);
        failedRecipients.push(...chunk);
      }
      if (i + BATCH_SIZE < recipients.length) await sleep(BATCH_DELAY_MS);
    }
  }

  return {
    sent: recipients.length - failedRecipients.length,
    failed: failedRecipients.length,
    total: recipients.length,
    failedRecipients,
  };
}
