import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, serializeDoc } from '@/lib/firebase/admin';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';

/** Revalidate any public pages that depend on the members collection. */
function revalidateMemberPages() {
  try {
    revalidatePath('/leadership');
    revalidatePath('/');
  } catch {
    /* best-effort */
  }
}

const BOARD_ROLES = ['president', 'board', 'treasurer'] as const;

// ─── helpers ───
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

// ─── GET members (portal-only) ───
//
// • GET /api/portal/members            → list of active members (directory)
// • GET /api/portal/members?id=<uid>   → single member document
export async function GET(request: NextRequest) {
  try {
    const decoded = await verifySession();

    const id = new URL(request.url).searchParams.get('id');

    // ── Single member fetch ──
    if (id) {
      const doc = await adminDb.collection('members').doc(id).get();
      if (!doc.exists) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }

      const data = doc.data() || {};
      const isSelf = decoded.uid === id;

      // Caller's role determines whether sensitive fields are returned
      const callerRole = await getMemberRole(decoded.uid);
      const isBoard =
        !!callerRole &&
        ['president', 'board', 'treasurer'].includes(callerRole);

      // Hide sensitive fields from non-board peers (everyone other than self
      // or board+ admins). The directory is portal-only so basic profile
      // info is shared, but contact / admin-only fields are restricted.
      if (!isSelf && !isBoard) {
        delete data.roleEmail;
        delete data.address;
        delete data.birthday;
        delete data.whatsAppPhone;
        delete data.whatsAppSameAsPhone;
      }

      return NextResponse.json(
        serializeDoc({ id: doc.id, uid: doc.id, ...data }),
      );
    }

    // ── Directory list (active members only) ──
    const snapshot = await adminDb
      .collection('members')
      .where('status', '==', 'active')
      .orderBy('displayName')
      .get();

    const members = snapshot.docs.map((doc) =>
      serializeDoc({
        id: doc.id,
        uid: doc.id,
        ...doc.data(),
      }),
    );

    return NextResponse.json(members);
  } catch (error: any) {
    console.error('Error fetching members:', error);
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}

// ─── POST — create a new member (board / president only) ───
export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(getRateLimitKey(request, 'portal-members'), { max: 20, windowSec: 60 });
  if (!rateLimitResult.allowed) return rateLimitResponse(rateLimitResult.resetAt);

  try {
    const decoded = await verifySession();
    const role = await getMemberRole(decoded.uid);
    if (!role || !['president', 'board', 'treasurer'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      role: memberRole = 'member',
      status = 'active',
      memberType,
      committee,
      phone,
      birthday,
      occupation,
      employer,
      linkedIn,
      bio,
      provisionWorkspace = false,
    } = body;

    // Validation
    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'First name, last name, and email are required' },
        { status: 400 },
      );
    }

    // Check for duplicates — match either the login email or a previously
    // stored personal email (so re-provisioning the same person is caught).
    const lowerEmail = email.toLowerCase().trim();
    const [byEmail, byPersonal] = await Promise.all([
      adminDb.collection('members').where('email', '==', lowerEmail).limit(1).get(),
      adminDb.collection('members').where('personalEmail', '==', lowerEmail).limit(1).get(),
    ]);
    if (!byEmail.empty || !byPersonal.empty) {
      return NextResponse.json(
        { error: 'A member with this email already exists' },
        { status: 409 },
      );
    }

    const displayName = `${firstName.trim()} ${lastName.trim()}`;
    const now = new Date().toISOString();

    // ── Optional: provision a Google Workspace org account ──
    // When requested, the provided `email` is the member's PERSONAL address.
    // We mint a first.last@domain Workspace account, use the org email as the
    // login `email` (members sign in with that Google account), keep the
    // personal address as `personalEmail`, and send the welcome there.
    let loginEmail = lowerEmail;
    let personalEmail: string | null = null;
    let provisioning: Record<string, any> | null = null;
    let workspaceCreds: { orgEmail: string; temporaryPassword: string } | null = null;
    const slackInviteUrl = process.env.SLACK_INVITE_URL || '';

    if (provisionWorkspace === true) {
      const { isDirectoryConfigured, createWorkspaceUser } = await import('@/lib/google/directory');
      if (!isDirectoryConfigured()) {
        return NextResponse.json(
          { error: 'Workspace provisioning is not configured on the server.' },
          { status: 503 },
        );
      }
      personalEmail = lowerEmail;
      try {
        const created = await createWorkspaceUser({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          recoveryEmail: personalEmail || undefined,
        });
        workspaceCreds = {
          orgEmail: created.orgEmail,
          temporaryPassword: created.temporaryPassword,
        };
        loginEmail = created.orgEmail.toLowerCase();
        provisioning = {
          workspace: 'created',
          slack: slackInviteUrl ? 'invited' : 'self-serve',
          orgEmail: created.orgEmail,
          provisionedAt: now,
        };
      } catch (provErr: any) {
        console.error('Workspace provisioning failed:', provErr);
        return NextResponse.json(
          { error: `Workspace account creation failed: ${provErr?.message || 'unknown error'}` },
          { status: 502 },
        );
      }
    }

    const memberData: Record<string, any> = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      displayName,
      email: loginEmail,
      role: memberRole,
      status: 'pending',
      onboardingComplete: false,
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
      invitedAt: now,
    };
    if (personalEmail) memberData.personalEmail = personalEmail;
    if (provisioning) memberData.provisioning = provisioning;

    // Optional fields — only include if provided
    if (memberType) memberData.memberType = memberType;
    if (committee) memberData.committee = committee.trim();
    if (phone) memberData.phone = phone.trim();
    if (birthday) memberData.birthday = birthday;
    if (occupation) memberData.occupation = occupation.trim();
    if (employer) memberData.employer = employer.trim();
    if (linkedIn) memberData.linkedIn = linkedIn.trim();
    if (bio) memberData.bio = bio.trim();

    const docRef = await adminDb.collection('members').add(memberData);

    // Send the onboarding email. When we provisioned an org account, send the
    // Workspace welcome (org email + temp password) to the PERSONAL inbox;
    // otherwise send the standard portal invite to the login email.
    try {
      const { sendEmail } = await import('@/lib/email/send');
      if (workspaceCreds && personalEmail) {
        const { memberWorkspaceWelcomeEmail } = await import('@/lib/email/templates');
        const template = memberWorkspaceWelcomeEmail(
          firstName.trim(),
          workspaceCreds.orgEmail,
          workspaceCreds.temporaryPassword,
          slackInviteUrl || undefined,
        );
        await sendEmail({
          to: personalEmail,
          subject: template.subject,
          html: template.html,
          text: template.text,
        });
      } else {
        const { inviteEmail } = await import('@/lib/email/templates');
        const template = inviteEmail(firstName.trim());
        await sendEmail({
          to: loginEmail,
          subject: template.subject,
          html: template.html,
          text: template.text,
        });
      }
    } catch (emailErr) {
      console.error('Onboarding email failed (non-blocking):', emailErr);
    }

    // If the new member is a board officer, refresh the public Leadership page
    if (BOARD_ROLES.includes(memberRole as any)) revalidateMemberPages();

    // Never echo the temporary password back in the API response.
    return NextResponse.json(
      { id: docRef.id, ...memberData },
      { status: 201 },
    );
  } catch (error: any) {
    console.error('Error creating member:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to create member' },
      { status: 500 },
    );
  }
}

// ─── PATCH — update member status / role / board title / order (board+ only) ───
export async function PATCH(request: NextRequest) {
  const rateLimitResult = await rateLimit(getRateLimitKey(request, 'portal-members'), { max: 20, windowSec: 60 });
  if (!rateLimitResult.allowed) return rateLimitResponse(rateLimitResult.resetAt);

  try {
    const decoded = await verifySession();
    const role = await getMemberRole(decoded.uid);
    if (!role || !['president', 'board', 'treasurer'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { memberId, status, role: newRole, boardTitle, boardOrder } = body;

    if (!memberId) {
      return NextResponse.json({ error: 'memberId required' }, { status: 400 });
    }

    const memberRef = adminDb.collection('members').doc(memberId);
    const memberDoc = await memberRef.get();
    if (!memberDoc.exists) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const updates: Record<string, any> = { updatedAt: new Date().toISOString() };

    // Profile fields that board+ admins may edit on behalf of another member.
    // Mirrors the whitelist on /api/portal/profile but applied to memberId.
    const PROFILE_FIELDS = [
      'firstName',
      'lastName',
      'bio',
      'phone',
      'linkedIn',
      'committee',
      'occupation',
      'employer',
      'memberType',
      'photoURL',
      'address',
      'birthday',
      'whatsAppPhone',
      'whatsAppSameAsPhone',
      'interests',
      'roleEmail',
    ] as const;
    for (const key of PROFILE_FIELDS) {
      if (body[key] !== undefined) {
        const val = body[key];
        updates[key] = typeof val === 'string' ? val.trim() : val;
      }
    }
    // Recompute displayName when first/last name change
    if (body.firstName !== undefined || body.lastName !== undefined) {
      const existing = memberDoc.data() || {};
      const first = (body.firstName ?? existing.firstName ?? '').toString().trim();
      const last = (body.lastName ?? existing.lastName ?? '').toString().trim();
      const dn = `${first} ${last}`.trim();
      if (dn) updates.displayName = dn;
    }

    if (status && ['pending', 'active', 'inactive', 'alumni'].includes(status)) {
      updates.status = status;
    }

    // Role-change permissions:
    //   - President can change roles freely.
    //   - Other board+ admins can ONLY promote a regular member to `board`
    //     (so they can add board members without needing the President), but
    //     cannot grant `president` / `treasurer` and cannot demote anyone.
    const currentMemberRole = memberDoc.data()?.role as string | undefined;
    if (newRole && ['member', 'board', 'treasurer', 'president'].includes(newRole)) {
      if (role === 'president') {
        updates.role = newRole;
      } else if (newRole === 'board' && currentMemberRole === 'member') {
        updates.role = 'board';
      }
      // else: silently ignore (insufficient permission for this transition)
    }

    // Board title (free-form, but only meaningful for board roles)
    if (typeof boardTitle === 'string') {
      updates.boardTitle = boardTitle.trim();
    }
    // Board display order on the public Leadership page
    if (typeof boardOrder === 'number' && Number.isFinite(boardOrder)) {
      updates.boardOrder = boardOrder;
    } else if (boardOrder === null) {
      const { FieldValue } = await import('firebase-admin/firestore');
      updates.boardOrder = FieldValue.delete();
    }

    await memberRef.update(updates);

    // Revalidate the public leadership page if anything that affects it changed
    const affectsLeadership =
      'role' in updates ||
      'status' in updates ||
      'boardTitle' in updates ||
      'boardOrder' in updates ||
      'displayName' in updates ||
      'photoURL' in updates ||
      'bio' in updates;
    if (affectsLeadership) revalidateMemberPages();

    // If approving a pending member, send welcome email
    if (status === 'active' && memberDoc.data()?.status === 'pending') {
      try {
        const { sendEmail } = await import('@/lib/email/send');
        const { welcomeEmail } = await import('@/lib/email/templates');
        const memberData = memberDoc.data();
        const template = welcomeEmail(memberData?.displayName || memberData?.firstName || 'Member');
        await sendEmail({
          to: memberData?.email,
          subject: template.subject,
          html: template.html,
          text: template.text,
        });
      } catch (emailErr) {
        console.error('Welcome email failed:', emailErr);
      }
    }

    // If a member was newly promoted to a board role, send the board-invite email
    const promotedToBoard =
      'role' in updates &&
      BOARD_ROLES.includes(updates.role as any) &&
      !BOARD_ROLES.includes((currentMemberRole || '') as any);
    if (promotedToBoard) {
      try {
        const { sendEmail } = await import('@/lib/email/send');
        const { boardInviteEmail } = await import('@/lib/email/templates');
        const memberData = memberDoc.data();
        const recipientEmail = memberData?.email;
        if (recipientEmail) {
          // Resolve inviter name from current session
          let inviterName: string | undefined;
          try {
            const inviterSnap = await adminDb.collection('members').doc(decoded.uid).get();
            inviterName = inviterSnap.data()?.displayName || inviterSnap.data()?.firstName;
          } catch {
            /* non-blocking */
          }
          const titleForEmail =
            (typeof boardTitle === 'string' && boardTitle.trim()) ||
            memberData?.boardTitle ||
            (updates.role === 'president'
              ? 'President'
              : updates.role === 'treasurer'
              ? 'Treasurer'
              : 'Board Member');
          const template = boardInviteEmail(
            memberData?.displayName || memberData?.firstName || 'there',
            titleForEmail,
            inviterName,
          );
          await sendEmail({
            to: recipientEmail,
            subject: template.subject,
            html: template.html,
            text: template.text,
          });
        }
      } catch (emailErr) {
        console.error('Board invite email failed:', emailErr);
      }
    }

    return NextResponse.json({ success: true, ...updates });
  } catch (error: any) {
    console.error('Error updating member:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
  }
}

// ─── DELETE — remove a member (president only) ───
// Used to clean up duplicates (e.g. an orphaned invited doc whose UID-keyed
// counterpart has since been migrated) and to remove members entirely. Matches
// the Firestore rule `allow delete: if isPresident();`.
export async function DELETE(request: NextRequest) {
  const rateLimitResult = await rateLimit(getRateLimitKey(request, 'portal-members-delete'), { max: 20, windowSec: 60 });
  if (!rateLimitResult.allowed) return rateLimitResponse(rateLimitResult.resetAt);

  try {
    const decoded = await verifySession();
    const role = await getMemberRole(decoded.uid);
    if (role !== 'president') {
      return NextResponse.json({ error: 'Only the president can delete members' }, { status: 403 });
    }

    // Accept memberId from JSON body OR ?memberId= query param
    let memberId: string | undefined;
    try {
      const body = await request.json();
      memberId = body?.memberId;
    } catch {
      /* no body */
    }
    if (!memberId) {
      memberId = new URL(request.url).searchParams.get('memberId') || undefined;
    }
    if (!memberId) {
      return NextResponse.json({ error: 'memberId required' }, { status: 400 });
    }

    if (memberId === decoded.uid) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
    }

    const memberRef = adminDb.collection('members').doc(memberId);
    const memberDoc = await memberRef.get();
    if (!memberDoc.exists) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const wasBoardOrActive =
      memberDoc.data()?.status === 'active' ||
      BOARD_ROLES.includes((memberDoc.data()?.role || '') as any);

    await memberRef.delete();

    if (wasBoardOrActive) revalidateMemberPages();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting member:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to delete member' }, { status: 500 });
  }
}
