/**
 * Cron endpoint for the automated new-member welcome email sequence.
 *
 * Vercel Cron hits this via GET with an Authorization: Bearer <CRON_SECRET> header.
 *
 * For every recently-joined active member it checks elapsed time since
 * `joinedAt` and sends the appropriate onboarding email:
 *   • Day 2 — profile reminder  (if profile incomplete)
 *   • Day 5 — dues nudge        (if dues unpaid)
 *   • Day 7 — one-week check-in (always)
 *
 * Sent emails are tracked in the `onboarding_emails` collection to prevent
 * duplicates.  Doc ID format: `{userId}_{emailType}`.
 */
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { sendEmail } from '@/lib/email/send';
import {
  profileReminderEmail,
  duesNudgeEmail,
  oneWeekCheckInEmail,
} from '@/lib/email/templates';
import { SITE } from '@/lib/constants';
import type { Member } from '@/types';

// ── Constants ──────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

/** Only look at members who joined within this window (avoids processing the entire table). */
const LOOKBACK_DAYS = 10;

type EmailType = 'profile_reminder' | 'dues_nudge' | 'one_week_check_in';

// ── Helpers ────────────────────────────────────────────────────────────────

function authorize(request: Request): boolean {
  const header = request.headers.get('authorization') ?? '';
  const token = header.replace('Bearer ', '');
  return !!process.env.CRON_SECRET && token === process.env.CRON_SECRET;
}

function daysSince(isoDate: string): number {
  return (Date.now() - new Date(isoDate).getTime()) / DAY_MS;
}

function formatAmount(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

async function alreadySent(userId: string, emailType: EmailType): Promise<boolean> {
  const docId = `${userId}_${emailType}`;
  const doc = await adminDb.collection('onboarding_emails').doc(docId).get();
  return doc.exists;
}

async function markSent(userId: string, emailType: EmailType): Promise<void> {
  const docId = `${userId}_${emailType}`;
  await adminDb.collection('onboarding_emails').doc(docId).set({
    userId,
    emailType,
    sentAt: new Date().toISOString(),
  });
}

function isProfileComplete(member: Member): boolean {
  return !!(member.photoURL && member.bio && member.interests?.length);
}

// ── Handler ────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const summary = { sent: 0, skipped: 0, errors: 0, details: [] as string[] };

  try {
    // Only consider members who joined within the last LOOKBACK_DAYS days
    const cutoff = new Date(Date.now() - LOOKBACK_DAYS * DAY_MS).toISOString();

    const membersSnap = await adminDb
      .collection('members')
      .where('status', '==', 'active')
      .where('joinedAt', '>=', cutoff)
      .get();

    const members = membersSnap.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as Member,
    );

    for (const member of members) {
      const days = daysSince(member.joinedAt);

      // ── Day 2+: Profile reminder ──
      if (days >= 2 && !isProfileComplete(member)) {
        try {
          if (await alreadySent(member.id, 'profile_reminder')) {
            summary.skipped++;
          } else {
            const email = profileReminderEmail(member.displayName);
            const result = await sendEmail({
              to: member.email,
              subject: email.subject,
              html: email.html,
              text: email.text,
            });

            if (result.success) {
              await markSent(member.id, 'profile_reminder');
              summary.sent++;
              summary.details.push(`profile_reminder → ${member.email}`);
            } else {
              summary.errors++;
            }
          }
        } catch (err) {
          console.error(`[welcome-sequence] profile_reminder error for ${member.id}:`, err);
          summary.errors++;
        }
      }

      // ── Day 5+: Dues nudge ──
      if (days >= 5) {
        try {
          // Check if dues have been paid
          const duesSnap = await adminDb
            .collection('memberDues')
            .where('memberId', '==', member.id)
            .where('status', 'in', ['PAID', 'WAIVED'])
            .limit(1)
            .get();

          const duesPaid = !duesSnap.empty;

          if (duesPaid) {
            summary.skipped++;
          } else if (await alreadySent(member.id, 'dues_nudge')) {
            summary.skipped++;
          } else {
            const amount =
              member.memberType === 'student'
                ? SITE.dues.student
                : SITE.dues.professional;

            const email = duesNudgeEmail(member.displayName, formatAmount(amount));
            const result = await sendEmail({
              to: member.email,
              subject: email.subject,
              html: email.html,
              text: email.text,
            });

            if (result.success) {
              await markSent(member.id, 'dues_nudge');
              summary.sent++;
              summary.details.push(`dues_nudge → ${member.email}`);
            } else {
              summary.errors++;
            }
          }
        } catch (err) {
          console.error(`[welcome-sequence] dues_nudge error for ${member.id}:`, err);
          summary.errors++;
        }
      }

      // ── Day 7+: One-week check-in ──
      if (days >= 7) {
        try {
          if (await alreadySent(member.id, 'one_week_check_in')) {
            summary.skipped++;
          } else {
            const email = oneWeekCheckInEmail(member.displayName);
            const result = await sendEmail({
              to: member.email,
              subject: email.subject,
              html: email.html,
              text: email.text,
            });

            if (result.success) {
              await markSent(member.id, 'one_week_check_in');
              summary.sent++;
              summary.details.push(`one_week_check_in → ${member.email}`);
            } else {
              summary.errors++;
            }
          }
        } catch (err) {
          console.error(`[welcome-sequence] one_week_check_in error for ${member.id}:`, err);
          summary.errors++;
        }
      }
    }

    // Audit log
    await adminDb.collection('activity_logs').add({
      action: 'welcome_sequence_cron',
      metadata: { sent: summary.sent, skipped: summary.skipped, errors: summary.errors },
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(summary);
  } catch (err) {
    console.error('[welcome-sequence] Fatal cron error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: String(err) },
      { status: 500 },
    );
  }
}
