import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { sendEmail } from '@/lib/email/send';
import { welcomeEmail } from '@/lib/email/templates';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 3 requests per 60 seconds
    const rlKey = getRateLimitKey(request, 'onboarding-complete');
    const rl = await rateLimit(rlKey, { max: 3, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    // Auth: verify session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);

    // Fetch member data
    const memberRef = adminDb.collection('members').doc(uid);
    const memberSnap = await memberRef.get();
    if (!memberSnap.exists) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const memberData = memberSnap.data()!;

    // Mark onboarding as complete
    await memberRef.update({
      onboardingComplete: true,
      updatedAt: new Date().toISOString(),
    });

    // Dedup: only send welcome email once
    const dedupId = `${uid}_welcome`;
    const dedupRef = adminDb.collection('onboarding_emails').doc(dedupId);
    const dedupSnap = await dedupRef.get();

    if (!dedupSnap.exists) {
      // Send welcome email
      const name = memberData.displayName || memberData.firstName || 'Member';
      const template = welcomeEmail(name);

      await sendEmail({
        to: memberData.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      // Create dedup record
      await dedupRef.set({
        memberId: uid,
        email: memberData.email,
        sentAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[onboarding/complete] Error:', error);

    if (error.message === 'Unauthorized' || error.code === 'auth/session-cookie-revoked') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 },
    );
  }
}
