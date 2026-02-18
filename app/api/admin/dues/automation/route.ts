/**
 * Dues automation endpoint for GitHub Actions cron jobs.
 *
 * Actions:
 *   - send-reminders: Email all unpaid members with a dues reminder
 *   - send-overdue:   Email members still unpaid after the cycle end date
 *   - enforce-grace:  Flag members who haven't paid within the grace period
 *
 * Protected by CRON_SECRET header.
 */
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getActiveCycle, getAllDuesForCycle } from '@/lib/services/dues';
import { sendEmail } from '@/lib/email/send';
import { duesReminderEmail } from '@/lib/email/templates';
import { formatCurrency } from '@/lib/utils/format';

function verifySecret(req: Request): boolean {
  const secret = req.headers.get('x-cron-secret') || req.headers.get('authorization')?.replace('Bearer ', '');
  return !!process.env.CRON_SECRET && secret === process.env.CRON_SECRET;
}

export async function POST(req: Request) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { action } = await req.json();

    const cycle = await getActiveCycle();
    if (!cycle) {
      return NextResponse.json({ error: 'No active dues cycle' }, { status: 404 });
    }

    // Get all dues records for the active cycle
    const allDues = await getAllDuesForCycle(cycle.id);
    const paidMemberIds = new Set(
      allDues
        .filter((d) => d.status === 'PAID' || d.status === 'PAID_OFFLINE' || d.status === 'WAIVED')
        .map((d) => d.memberId),
    );

    // Get all active members
    const membersSnap = await adminDb
      .collection('members')
      .where('status', '==', 'active')
      .get();

    const unpaidMembers = membersSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((m: any) => !paidMemberIds.has(m.id));

    switch (action) {
      case 'send-reminders': {
        let sent = 0;
        let failed = 0;

        for (const m of unpaidMembers) {
          const member = m as any;
          const amount = member.memberType === 'student'
            ? cycle.amountStudent
            : cycle.amountProfessional;

          const email = duesReminderEmail(
            member.firstName || member.name || 'Member',
            formatCurrency(amount),
            cycle.name,
          );

          const result = await sendEmail({
            to: member.email,
            subject: email.subject,
            html: email.html,
          });

          if (result.success) sent++;
          else failed++;
        }

        return NextResponse.json({
          action: 'send-reminders',
          sent,
          failed,
          totalUnpaid: unpaidMembers.length,
        });
      }

      case 'send-overdue': {
        // Only send overdue notices after the cycle end date
        const now = new Date();
        const endDate = cycle.endDate ? new Date(cycle.endDate) : null;

        if (!endDate || now < endDate) {
          return NextResponse.json({
            action: 'send-overdue',
            message: 'Cycle has not ended yet — no overdue notices sent',
            sent: 0,
          });
        }

        let sent = 0;
        let failed = 0;

        for (const m of unpaidMembers) {
          const member = m as any;
          const amount = member.memberType === 'student'
            ? cycle.amountStudent
            : cycle.amountProfessional;

          const result = await sendEmail({
            to: member.email,
            subject: `Overdue Dues — ${cycle.name}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2>Overdue Dues Notice</h2>
                <p>Hi ${member.firstName || member.name || 'Member'},</p>
                <p>Your annual dues of <strong>${formatCurrency(amount)}</strong> for the ${cycle.name} Rotary year are now <strong>overdue</strong>.</p>
                <p>Please pay as soon as possible to maintain your active membership status. You have ${cycle.gracePeriodDays || 30} days from the cycle end date before your membership may be flagged as inactive.</p>
                <p style="text-align: center; margin: 24px 0;">
                  <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://rotaractnyc.org'}/portal/dues" style="display: inline-block; background-color: #9B1B30; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Pay Dues Now</a>
                </p>
              </div>
            `,
          });

          if (result.success) sent++;
          else failed++;
        }

        return NextResponse.json({
          action: 'send-overdue',
          sent,
          failed,
          totalOverdue: unpaidMembers.length,
        });
      }

      case 'enforce-grace': {
        // Flag members whose grace period has expired
        const now = new Date();
        const endDate = cycle.endDate ? new Date(cycle.endDate) : null;
        const graceDays = cycle.gracePeriodDays || 30;

        if (!endDate) {
          return NextResponse.json({
            action: 'enforce-grace',
            message: 'No cycle end date set',
            flagged: 0,
          });
        }

        const graceDeadline = new Date(endDate);
        graceDeadline.setDate(graceDeadline.getDate() + graceDays);

        if (now < graceDeadline) {
          return NextResponse.json({
            action: 'enforce-grace',
            message: `Grace period ends ${graceDeadline.toISOString().split('T')[0]} — no action taken`,
            flagged: 0,
          });
        }

        // Flag unpaid members as inactive
        let flagged = 0;
        const batch = adminDb.batch();

        for (const m of unpaidMembers) {
          batch.update(adminDb.collection('members').doc(m.id), {
            status: 'inactive',
            statusReason: `Dues unpaid — grace period expired (${cycle.name})`,
            statusUpdatedAt: new Date().toISOString(),
          });
          flagged++;
        }

        if (flagged > 0) {
          await batch.commit();
        }

        return NextResponse.json({
          action: 'enforce-grace',
          flagged,
          graceDeadline: graceDeadline.toISOString().split('T')[0],
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Use send-reminders, send-overdue, or enforce-grace.` },
          { status: 400 },
        );
    }
  } catch (err: any) {
    console.error('Dues automation error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
