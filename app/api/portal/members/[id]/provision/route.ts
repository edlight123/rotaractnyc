import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// ─── helpers (mirror /api/portal/members) ───
async function verifySession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
  if (!sessionCookie) throw new Error('Unauthorized');
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  return decoded;
}

async function getMemberRole(uid: string) {
  const snap = await adminDb.collection('members').doc(uid).get();
  return snap.exists ? (snap.data()?.role as string) : null;
}

/**
 * POST /api/portal/members/[id]/provision
 *
 * Provision a Google Workspace org email for an EXISTING member. Additive by
 * design: the member's login `email` (their portal identity / uid mapping) is
 * NEVER changed — changing it would orphan their account. Instead we mint a
 * first.last@domain Workspace account, record it as `orgEmail`, preserve the
 * current login address as `personalEmail`, and send the welcome credentials
 * there. Board / treasurer / president only.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimitResult = await rateLimit(getRateLimitKey(request, 'portal-members-provision'), {
    max: 10,
    windowSec: 60,
  });
  if (!rateLimitResult.allowed) return rateLimitResponse(rateLimitResult.resetAt);

  try {
    // ── Auth: board / treasurer / president only ──
    const decoded = await verifySession();
    const role = await getMemberRole(decoded.uid);
    if (!role || !['president', 'board', 'treasurer'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    // `force: true` re-provisions a member whose previous org account was
    // deleted in the Admin console (bypasses the already-provisioned guard).
    const body = await request.json().catch(() => ({}));
    const force = body?.force === true;

    // ── Member must exist ──
    const memberRef = adminDb.collection('members').doc(id);
    const memberDoc = await memberRef.get();
    if (!memberDoc.exists) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    const member = memberDoc.data() || {};

    // ── Config guard ──
    const { isDirectoryConfigured, createWorkspaceUser } = await import('@/lib/google/directory');
    if (!isDirectoryConfigured()) {
      return NextResponse.json(
        { error: 'Workspace provisioning is not configured on the server.' },
        { status: 503 },
      );
    }

    // ── Already-provisioned guard (skip when re-provisioning) ──
    if (member.orgEmail && !force) {
      return NextResponse.json(
        { error: 'This member already has an org email.', orgEmail: member.orgEmail },
        { status: 409 },
      );
    }

    // ── Resolve names (fall back to splitting displayName) ──
    let firstName = (member.firstName || '').toString().trim();
    let lastName = (member.lastName || '').toString().trim();
    if (!firstName && !lastName) {
      const parts = (member.displayName || '').toString().trim().split(/\s+/).filter(Boolean);
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }

    // Keep the login identity put; recovery/welcome go to the personal address.
    const personalEmail = (member.personalEmail || member.email || '').toString().trim();

    // ── Create the Workspace account (do NOT persist partial state on failure) ──
    let created: { orgEmail: string; temporaryPassword: string; userId: string };
    try {
      created = await createWorkspaceUser({
        firstName,
        lastName,
        recoveryEmail: personalEmail || undefined,
      });
    } catch (provErr: any) {
      console.error('Workspace provisioning failed:', provErr);
      return NextResponse.json(
        { error: `Workspace account creation failed: ${provErr?.message || 'unknown error'}` },
        { status: 502 },
      );
    }

    const orgEmail = created.orgEmail.toLowerCase();
    const now = new Date().toISOString();

    // ── Persist (additive — login `email` untouched) ──
    await memberRef.update({
      orgEmail,
      personalEmail,
      provisioning: {
        workspace: 'created',
        orgEmail,
        provisionedAt: now,
        provisionedBy: decoded.uid,
      },
      updatedAt: now,
    });

    // ── Welcome email (best-effort, non-blocking) ──
    // Credential delivery is transactional and admin-initiated, so it bypasses
    // the global EMAILS_PAUSED switch (ignorePause) — the new member needs the
    // sign-in details for the account we just created.
    const paused = process.env.EMAILS_PAUSED === 'true';
    let emailed = false;
    let emailError: string | null = null;
    if (personalEmail) {
      try {
        const { sendEmail } = await import('@/lib/email/send');
        const { memberWorkspaceWelcomeEmail } = await import('@/lib/email/templates');
        const template = memberWorkspaceWelcomeEmail(
          firstName,
          created.orgEmail,
          created.temporaryPassword,
          process.env.SLACK_INVITE_URL || undefined,
        );
        const result = await sendEmail({
          to: personalEmail,
          subject: template.subject,
          html: template.html,
          text: template.text,
          ignorePause: true,
        });
        emailed = result.success === true;
        if (!emailed) emailError = (result as { error?: string }).error || 'send failed';
      } catch (emailErr: any) {
        emailError = emailErr?.message || 'send failed';
        console.error('Workspace welcome email failed (non-blocking):', emailErr);
      }
    }

    // Always return the temporary password so an admin can share it manually.
    return NextResponse.json({
      success: true,
      orgEmail,
      temporaryPassword: created.temporaryPassword,
      emailed,
      emailError,
      // Kept for the UI's messaging; credential emails now send even while paused.
      paused,
    });
  } catch (error: any) {
    console.error('Error provisioning member:', error);
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to provision member' }, { status: 500 });
  }
}
