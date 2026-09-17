import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';

// Update member profile
export async function PATCH(request: NextRequest) {
  const rateLimitResult = await rateLimit(getRateLimitKey(request, 'portal-profile'), { max: 10, windowSec: 60 });
  if (!rateLimitResult.allowed) return rateLimitResponse(rateLimitResult.resetAt);

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);
    const body = await request.json();

    // Whitelist allowed fields
    const allowed = ['firstName', 'lastName', 'displayName', 'bio', 'whyJoin', 'phone', 'linkedIn', 'committee', 'occupation', 'employer', 'interests', 'memberType', 'photoURL', 'onboardingComplete', 'address', 'birthday', 'whatsAppPhone', 'whatsAppSameAsPhone'];
    const updates: Record<string, any> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    if (body.firstName && body.lastName) {
      updates.displayName = `${body.firstName} ${body.lastName}`;
    }

    updates.updatedAt = FieldValue.serverTimestamp();

    await adminDb.collection('members').doc(uid).update(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
