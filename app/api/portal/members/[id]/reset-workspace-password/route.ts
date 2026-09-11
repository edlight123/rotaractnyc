import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// ─── helpers (mirror /api/portal/members/[id]/provision) ───
async function verifySession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
  if (!sessionCookie) throw new Error('Unauthorized');
  return adminAuth.verifySessionCookie(sessionCookie, true);
}

async function getMemberRole(uid: string) {
  const snap = await adminDb.collection('members').doc(uid).get();
  return snap.exists ? (snap.data()?.role as string) : null;
}

/**
 * POST /api/portal/members/[id]/reset-workspace-password
 *
 * Issue a fresh temporary password for a member's existing Workspace account.
 *
 * Provisioning generates a temporary password once and never stores it — it is
 * returned in that single API response and nowhere else. So a member who loses
 * the email, waits too long, or abandons the forced password change has no
 * recovery path inside the app, and an admin had to go to the Google Admin
 * console. This closes that gap using the same Directory API scope that
 * provisioning and suspension already use.
 *
 * Board / treasurer / president only. Deliberately does NOT reactivate a
 * suspended account: it reports the suspension so an admin makes that call
 * explicitly rather than un-offboarding someone as a side effect.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimitResult = await rateLimit(
    getRateLimitKey(request, 'portal-members-reset-workspace-password'),
    { max: 10, windowSec: 60 },
  );
  if (!rateLimitResult.allowed) return rateLimitResponse(rateLimitResult.resetAt);

  try {
    // ── Auth: board / treasurer / president only ──
    const decoded = await verifySession();
    const role = await getMemberRole(decoded.uid);
    if (!role || !['president', 'board', 'treasurer'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const memberRef = adminDb.collection('members').doc(id);
    const memberDoc = await memberRef.get();
    if (!memberDoc.exists) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const member = memberDoc.data() || {};
    const orgEmail = (member.orgEmail as string) || '';
    if (!orgEmail) {
      return NextResponse.json(
        { error: 'This member has no Workspace account to reset. Provision one first.' },
        { status: 400 },
      );
    }

    const { resetWorkspacePassword, isDirectoryConfigured } = await import(
      '@/lib/google/directory'
    );
    if (!isDirectoryConfigured()) {
      return NextResponse.json(
        { error: 'Workspace provisioning is not configured.' },
        { status: 503 },
      );
    }

    const result = await resetWorkspacePassword(orgEmail);

    const now = new Date().toISOString();
    await memberRef.update({
      'provisioning.passwordResetAt': now,
      'provisioning.passwordResetBy': decoded.uid,
      updatedAt: now,
    });

    // ── Deliver the new credentials (best-effort) ──
    // Credential delivery is transactional and admin-initiated, so it bypasses
    // the global EMAILS_PAUSED switch (ignorePause), exactly as provisioning
    // does — the member cannot use the account without these details.
    const personalEmail =
      (member.personalEmail as string) || (member.email as string) || '';
    const firstName = (member.firstName as string) || (member.displayName as string) || 'there';

    let emailed = false;
    let emailError: string | null = null;
    if (personalEmail) {
      try {
        const { sendEmail } = await import('@/lib/email/send');
        const { memberWorkspaceWelcomeEmail } = await import('@/lib/email/templates');
        const template = memberWorkspaceWelcomeEmail(
          firstName,
          result.orgEmail,
          result.temporaryPassword,
          process.env.SLACK_INVITE_URL || undefined,
        );
        const sent = await sendEmail({
          to: personalEmail,
          subject: template.subject,
          html: template.html,
          text: template.text,
          ignorePause: true,
        });
        emailed = sent.success === true;
        if (!emailed) emailError = (sent as { error?: string }).error || 'send failed';
      } catch (emailErr: any) {
        emailError = emailErr?.message || 'send failed';
        console.error('Workspace password reset email failed (non-blocking):', emailErr);
      }
    }

    console.info(`Workspace password reset: ${result.orgEmail} by ${decoded.uid}`);

    // Always return the password so an admin can pass it on directly when the
    // email doesn't land — the same contract as provisioning.
    return NextResponse.json({
      success: true,
      orgEmail: result.orgEmail,
      temporaryPassword: result.temporaryPassword,
      suspended: result.suspended,
      sentTo: emailed ? personalEmail : null,
      emailed,
      emailError,
    });
  } catch (error: any) {
    console.error('Error resetting workspace password:', error);
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Directory API 404 — the account is recorded on the member but gone from
    // Workspace (deleted in the Admin console). Re-provisioning is the fix.
    if (error?.code === 404 || error?.response?.status === 404) {
      return NextResponse.json(
        { error: 'No Workspace account exists for that address. Re-provision the member.' },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to reset the Workspace password.' },
      { status: 500 },
    );
  }
}
