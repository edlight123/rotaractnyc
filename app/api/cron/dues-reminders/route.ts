/**
 * Cron endpoint for automated dues reminders.
 *
 * Vercel Cron hits this via GET with an Authorization: Bearer <CRON_SECRET> header.
 * For each active member whose dues are unpaid (or missing) for the current
 * Rotary year, sends a reminder email — but no more than once every 7 days.
 */
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { sendEmail } from '@/lib/email/send';
import { duesReminderEmail } from '@/lib/email/templates';
import { SITE } from '@/lib/constants';
import { getCurrentRotaryYear } from '@/lib/utils/rotaryYear';
import type { Member, DuesPaymentStatus } from '@/types';

// ── Helpers ────────────────────────────────────────────────────────────────

function authorize(request: Request): boolean {
  const header = request.headers.get('authorization') ?? '';
  const token = header.replace('Bearer ', '');
  return !!process.env.CRON_SECRET && token === process.env.CRON_SECRET;
}

function formatAmount(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// ── Handler ────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentYear = getCurrentRotaryYear();
  let sent = 0;
  let skipped = 0;
  let errors = 0;

  try {
    // 1. Fetch all active members
    const membersSnap = await adminDb
      .collection('users')
      .where('status', '==', 'active')
      .get();

    const members = membersSnap.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as Member,
    );

    // 2. Process each member individually
    for (const member of members) {
      try {
        // Look up the member's dues record for the current Rotary year
        const duesSnap = await adminDb
          .collection('dues')
          .where('userId', '==', member.id)
          .where('cycleName', '==', currentYear)
          .limit(1)
          .get();

        const duesDoc = duesSnap.docs[0];
        const duesData = duesDoc?.data() as
          | { status: DuesPaymentStatus; amount?: number; lastDuesReminder?: string; reminderCount?: number }
          | undefined;

        // Skip members who have already paid / been waived
        if (duesData && duesData.status !== 'UNPAID') {
          skipped++;
          continue;
        }

        // Throttle: only send if 7+ days since last reminder (or never sent)
        if (duesData?.lastDuesReminder) {
          const lastSent = new Date(duesData.lastDuesReminder).getTime();
          if (Date.now() - lastSent < SEVEN_DAYS_MS) {
            skipped++;
            continue;
          }
        }

        // Determine the amount owed
        const amount =
          duesData?.amount ??
          (member.memberType === 'student'
            ? SITE.dues.student
            : SITE.dues.professional);

        // Build & send the email
        const email = duesReminderEmail(
          member.displayName,
          formatAmount(amount),
          currentYear,
        );

        const result = await sendEmail({
          to: member.email,
          subject: email.subject,
          html: email.html,
          text: email.text,
        });

        if (!result.success) {
          errors++;
          continue;
        }

        // Update (or create) the dues doc with reminder tracking
        const now = new Date().toISOString();
        const reminderCount = (duesData?.reminderCount ?? 0) + 1;

        if (duesDoc) {
          await duesDoc.ref.update({
            lastDuesReminder: now,
            reminderCount,
          });
        } else {
          // No dues doc yet — create one so we track the reminder
          await adminDb.collection('dues').add({
            userId: member.id,
            cycleName: currentYear,
            status: 'UNPAID' as DuesPaymentStatus,
            amount:
              member.memberType === 'student'
                ? SITE.dues.student
                : SITE.dues.professional,
            lastDuesReminder: now,
            reminderCount,
          });
        }

        sent++;
      } catch (err) {
        console.error(`[dues-reminders] Error processing member ${member.id}:`, err);
        errors++;
      }
    }

    // 3. Write an audit log entry
    await adminDb.collection('activity_logs').add({
      action: 'dues_reminder_cron',
      metadata: { sent, skipped, errors },
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ sent, skipped, errors });
  } catch (err) {
    console.error('[dues-reminders] Fatal cron error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: String(err) },
      { status: 500 },
    );
  }
}
