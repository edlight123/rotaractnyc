import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveDuesCycle,
  getAllMemberDuesForCycle,
} from '@/lib/firebase/duesCycles';
import { getAllMembers, updateMemberStatus } from '@/lib/firebase/members';
import { Resend } from 'resend';
import { getCurrentRotaryCycleId } from '@/lib/utils/rotaryYear';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const AUTOMATION_API_KEY = process.env.AUTOMATION_API_KEY;
const resend = new Resend(process.env.RESEND_API_KEY);

// Email helper
async function sendEmail(options: { to: string; subject: string; html: string }) {
  return await resend.emails.send({
    from: 'Rotaract NYC <noreply@rotaractnewyork.org>',
    ...options,
  });
}

/**
 * Verify API key for automation endpoints
 */
function verifyApiKey(request: NextRequest): boolean {
  if (!AUTOMATION_API_KEY) {
    console.warn('AUTOMATION_API_KEY not configured');
    return false;
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);
  return token === AUTOMATION_API_KEY;
}

/**
 * POST /api/admin/dues/automation
 * 
 * Actions:
 * - send-reminders: Send reminder emails 14 days before cycle end
 * - send-overdue: Send overdue notices for members with unpaid dues
 * - enforce-grace: Auto-inactivate members after grace period (30 days post-cycle)
 */
export async function POST(request: NextRequest) {
  // Verify API key
  if (!verifyApiKey(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { action } = await request.json();

    if (!action) {
      return NextResponse.json(
        { error: 'Missing action parameter' },
        { status: 400 }
      );
    }

    let result;
    switch (action) {
      case 'send-reminders':
        result = await sendReminders();
        break;
      case 'send-overdue':
        result = await sendOverdueNotices();
        break;
      case 'enforce-grace':
        result = await enforceGracePeriod();
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Automation error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Send reminder emails 14 days before cycle end
 */
async function sendReminders() {
  const cycle = await getActiveDuesCycle();
  if (!cycle) {
    return { success: true, message: 'No active cycle', sent: 0 };
  }

  const today = new Date();
  const endDate = cycle.endDate instanceof Date ? cycle.endDate : cycle.endDate.toDate();
  const daysUntilDue = Math.ceil(
    (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Only send reminders if exactly 14 days out (or within 1 day tolerance)
  if (daysUntilDue < 13 || daysUntilDue > 15) {
    return {
      success: true,
      message: `Not reminder window (${daysUntilDue} days until due)`,
      sent: 0,
    };
  }

  const members = await getAllMembers();
  const memberDuesMap = await getAllMemberDuesForCycle(cycle.id);
  const unpaidMembers = members.filter((member) => {
    if (member.status !== 'ACTIVE') return false;
    const dues = memberDuesMap.get(member.id);
    return !dues || dues.status === 'UNPAID';
  });

  let sent = 0;
  for (const member of unpaidMembers) {
    try {
      await sendEmail({
        to: member.email,
        subject: `Reminder: Annual Dues Due ${endDate.toLocaleDateString()}`,
        html: `
          <h2>Annual Dues Reminder</h2>
          <p>Hi ${member.firstName},</p>
          <p>This is a friendly reminder that your annual Rotaract NYC dues of <strong>$${(cycle.amount / 100).toFixed(2)}</strong> are due by <strong>${endDate.toLocaleDateString()}</strong>.</p>
          <p>You have <strong>${daysUntilDue} days</strong> remaining to submit your payment.</p>
          <p><a href="${BASE_URL}/portal" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Pay Now</a></p>
          <p>Questions? Contact us at <a href="mailto:board@rotaractnewyork.org">board@rotaractnewyork.org</a></p>
          <p>Best,<br/>Rotaract NYC Board</p>
        `,
      });
      sent++;
    } catch (error) {
      console.error(`Failed to send reminder to ${member.email}:`, error);
    }
  }

  return {
    success: true,
    message: `Sent ${sent} reminder emails`,
    sent,
    cycleId: cycle.id,
    daysUntilDue,
  };
}

/**
 * Send overdue notices for members with unpaid dues
 */
async function sendOverdueNotices() {
  const cycle = await getActiveDuesCycle();
  if (!cycle) {
    return { success: true, message: 'No active cycle', sent: 0 };
  }

  const today = new Date();
  const endDate = cycle.endDate instanceof Date ? cycle.endDate : cycle.endDate.toDate();
  const isOverdue = today > endDate;

  if (!isOverdue) {
    return {
      success: true,
      message: 'Cycle not yet overdue',
      sent: 0,
    };
  }

  const daysOverdue = Math.ceil(
    (today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const members = await getAllMembers();
  const memberDuesMap = await getAllMemberDuesForCycle(cycle.id);
  const unpaidMembers = members.filter((member) => {
    if (member.status !== 'ACTIVE') return false;
    const dues = memberDuesMap.get(member.id);
    return !dues || dues.status === 'UNPAID';
  });

  let sent = 0;
  for (const member of unpaidMembers) {
    try {
      await sendEmail({
        to: member.email,
        subject: `Action Required: Overdue Annual Dues`,
        html: `
          <h2>Overdue Dues Notice</h2>
          <p>Hi ${member.firstName},</p>
          <p>Your annual Rotaract NYC dues of <strong>$${(cycle.amount / 100).toFixed(2)}</strong> are now <strong>${daysOverdue} days overdue</strong>.</p>
          <p>The payment deadline was <strong>${endDate.toLocaleDateString()}</strong>.</p>
          <p style="color: #dc2626; font-weight: 600;">⚠️ Your membership will be automatically inactivated after 30 days past the due date if payment is not received.</p>
          <p><a href="${BASE_URL}/portal" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Pay Now</a></p>
          <p>If you're experiencing financial difficulty or have questions, please reach out to us at <a href="mailto:board@rotaractnewyork.org">board@rotaractnewyork.org</a></p>
          <p>Best,<br/>Rotaract NYC Board</p>
        `,
      });
      sent++;
    } catch (error) {
      console.error(`Failed to send overdue notice to ${member.email}:`, error);
    }
  }

  return {
    success: true,
    message: `Sent ${sent} overdue notices`,
    sent,
    cycleId: cycle.id,
    daysOverdue,
  };
}

/**
 * Auto-inactivate members after grace period (30 days post-cycle)
 */
async function enforceGracePeriod() {
  const cycle = await getActiveDuesCycle();
  if (!cycle) {
    return { success: true, message: 'No active cycle', inactivated: 0 };
  }

  const today = new Date();
  const endDate = cycle.endDate instanceof Date ? cycle.endDate : cycle.endDate.toDate();
  const gracePeriodEnd = new Date(endDate);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 30);

  // Only enforce if grace period has passed
  if (today < gracePeriodEnd) {
    const daysRemaining = Math.ceil(
      (gracePeriodEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      success: true,
      message: `Grace period not yet expired (${daysRemaining} days remaining)`,
      inactivated: 0,
    };
  }

  const members = await getAllMembers();
  const memberDuesMap = await getAllMemberDuesForCycle(cycle.id);
  const unpaidMembers = members.filter((member) => {
    if (member.status !== 'ACTIVE') return false;
    const dues = memberDuesMap.get(member.id);
    return !dues || dues.status === 'UNPAID';
  });

  let inactivated = 0;
  for (const member of unpaidMembers) {
    try {
      // Update member status to INACTIVE
      await updateMemberStatus(member.id, 'INACTIVE');

      // Send notification email
      await sendEmail({
        to: member.email,
        subject: 'Membership Status: Inactive Due to Unpaid Dues',
        html: `
          <h2>Membership Status Update</h2>
          <p>Hi ${member.firstName},</p>
          <p>Your Rotaract NYC membership has been set to <strong>INACTIVE</strong> due to unpaid annual dues.</p>
          <p>The grace period for <strong>${cycle.id}</strong> dues (due ${endDate.toLocaleDateString()}) has expired.</p>
          <h3>What does this mean?</h3>
          <ul>
            <li>You will no longer have access to member-only resources and events</li>
            <li>Your service hours will not count toward club goals</li>
            <li>You will not receive member communications</li>
          </ul>
          <h3>How to reactivate your membership:</h3>
          <ol>
            <li>Pay the outstanding dues of <strong>$${(cycle.amount / 100).toFixed(2)}</strong></li>
            <li>Your membership will be automatically reactivated</li>
          </ol>
          <p><a href="${BASE_URL}/portal" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Pay Dues Now</a></p>
          <p>If you have questions or believe this is an error, please contact us at <a href="mailto:board@rotaractnewyork.org">board@rotaractnewyork.org</a></p>
          <p>Best,<br/>Rotaract NYC Board</p>
        `,
      });
      inactivated++;
      console.log(`Inactivated member ${member.id} (${member.email})`);
    } catch (error) {
      console.error(`Failed to inactivate member ${member.id}:`, error);
    }
  }

  return {
    success: true,
    message: `Inactivated ${inactivated} members`,
    inactivated,
    cycleId: cycle.id,
  };
}

export const dynamic = 'force-dynamic';
