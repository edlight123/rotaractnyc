import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';
import { sendEmail } from '@/lib/email/send';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

async function verifySession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
  if (!sessionCookie) throw new Error('Unauthorized');
  return adminAuth.verifySessionCookie(sessionCookie, true);
}

async function getMemberData(uid: string) {
  const snap = await adminDb.collection('members').doc(uid).get();
  return snap.exists ? { id: uid, role: '', ...snap.data() } as { id: string; role: string; [key: string]: any } : null;
}

type Params = { params: Promise<{ id: string }> };

// ─── DELETE /api/portal/committees/[id]/members?memberId=xxx
// Board/president — or this committee's chair/co-chair — removes a member.
export async function DELETE(request: NextRequest, { params }: Params) {
  const rateLimitResult = await rateLimit(getRateLimitKey(request, 'portal-committees'), { max: 10, windowSec: 60 });
  if (!rateLimitResult.allowed) return rateLimitResponse(rateLimitResult.resetAt);

  try {
    const decoded = await verifySession();
    const { id } = await params;
    const actor = await getMemberData(decoded.uid);

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    if (!memberId) {
      return NextResponse.json({ error: 'memberId query parameter required' }, { status: 400 });
    }

    const committeeDoc = await adminDb.collection('committees').doc(id).get();
    if (!committeeDoc.exists) {
      return NextResponse.json({ error: 'Committee not found' }, { status: 404 });
    }

    const committee = committeeDoc.data()!;

    // Chairs manage their own committee's roster (matches the detail-page UI,
    // which already shows the remove button to chairs via canManage).
    const isBoard = actor && ['president', 'board', 'treasurer'].includes(actor.role as string);
    const isChair = committee.chairId === decoded.uid || committee.coChairId === decoded.uid;
    if (!actor || (!isBoard && !isChair)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const memberIds: string[] = committee.memberIds || [];
    const waitlistIds: string[] = committee.waitlistIds || [];
    const committeeName: string = committee.name || 'the committee';
    const capacity: number = committee.capacity ?? 5;

    const inCommittee = memberIds.includes(memberId);
    const onWaitlist = waitlistIds.includes(memberId);

    if (!inCommittee && !onWaitlist) {
      return NextResponse.json({ error: 'Member is not in this committee' }, { status: 400 });
    }

    const batch = adminDb.batch();
    const committeeRef = adminDb.collection('committees').doc(id);

    if (onWaitlist) {
      batch.update(committeeRef, {
        waitlistIds: FieldValue.arrayRemove(memberId),
        updatedAt: FieldValue.serverTimestamp(),
      });
      await batch.commit();
      return NextResponse.json({ status: 'removed_from_waitlist' });
    }

    // Remove from committee
    batch.update(committeeRef, {
      memberIds: FieldValue.arrayRemove(memberId),
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.update(adminDb.collection('members').doc(memberId), {
      committeeId: FieldValue.delete(),
      committee: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    // Auto-promote first waitlist member if a spot opened
    const remainingMembers = memberIds.filter((m) => m !== memberId);
    const shouldPromote = (capacity === 0 || remainingMembers.length < capacity) && waitlistIds.length > 0;

    if (shouldPromote) {
      const promoteeId = waitlistIds[0];
      const promoteeDoc = await adminDb.collection('members').doc(promoteeId).get();

      if (promoteeDoc.exists) {
        const promoteeData = promoteeDoc.data()!;
        const promoteeBatch = adminDb.batch();

        promoteeBatch.update(committeeRef, {
          memberIds: FieldValue.arrayUnion(promoteeId),
          waitlistIds: FieldValue.arrayRemove(promoteeId),
          updatedAt: FieldValue.serverTimestamp(),
        });
        promoteeBatch.update(adminDb.collection('members').doc(promoteeId), {
          committeeId: id,
          committee: committeeName,
          updatedAt: FieldValue.serverTimestamp(),
        });
        await promoteeBatch.commit();

        if (promoteeData.email) {
          sendEmail({
            to: promoteeData.email,
            subject: `You've been added to ${committeeName} — Rotaract NYC`,
            html: `
              <p>Hi ${promoteeData.firstName || promoteeData.displayName},</p>
              <p>A spot opened up and you've been automatically moved from the waitlist into the <strong>${committeeName}</strong> committee!</p>
              <p>You can view your committee workspace in the <a href="https://rotaractnyc.org/portal/committees">member portal</a>.</p>
              <p>— Rotaract NYC</p>
            `,
          }).catch((err) => console.error('Waitlist promotion email failed:', err));
        }
      }
    }

    return NextResponse.json({ status: 'removed' });
  } catch (error) {
    console.error('Error removing committee member:', error);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
