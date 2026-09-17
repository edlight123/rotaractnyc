import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { communityLinkOrDefault, parseCommunityInviteUrl } from '@/lib/utils/communityLink';

export const dynamic = 'force-dynamic';

/**
 * The WhatsApp community invite, editable from Site Settings.
 *
 * Stored on settings/site alongside the impact stats, and read back with a
 * fallback to the built-in link so a missing or bad value never publishes an
 * empty href. See lib/utils/communityLink.ts for why it is validated on the
 * way out as well as the way in.
 */

async function storedLink(): Promise<string | null> {
  const doc = await adminDb.collection('settings').doc('site').get();
  const value = doc.exists ? (doc.data()?.whatsappCommunityUrl as string | undefined) : undefined;
  return value ?? null;
}

// ─── GET: public — the link to publish ───

export async function GET() {
  try {
    return NextResponse.json({ url: communityLinkOrDefault(await storedLink()) });
  } catch (error) {
    console.error('[settings] community link read failed:', error);
    return NextResponse.json({ url: communityLinkOrDefault(null) });
  }
}

// ─── PUT: board+ — replace it ───

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let uid: string;
    try {
      ({ uid } = await adminAuth.verifySessionCookie(sessionCookie, true));
    } catch {
      return NextResponse.json({ error: 'Session expired. Please sign in again.' }, { status: 401 });
    }

    const memberSnap = await adminDb.collection('members').doc(uid).get();
    const member = memberSnap.exists ? (memberSnap.data() as { role?: string }) : null;
    if (!member || !['board', 'president'].includes(member.role || '')) {
      return NextResponse.json(
        { error: 'Only board members and the president can change the community link.' },
        { status: 403 },
      );
    }

    const { url } = await request.json();
    const parsed = parseCommunityInviteUrl(url);
    if (!parsed) {
      return NextResponse.json(
        {
          error:
            'That is not a WhatsApp invite link. It should start with https://chat.whatsapp.com/ — open the community, tap Invite, and copy the link.',
        },
        { status: 400 },
      );
    }

    await adminDb.collection('settings').doc('site').set(
      { whatsappCommunityUrl: parsed, updatedAt: new Date().toISOString(), updatedBy: uid },
      { merge: true },
    );

    // /contact is statically prerendered, so without this the new link would
    // not appear until the next deploy — which is the whole problem this is
    // meant to solve.
    revalidatePath('/contact');

    return NextResponse.json({ url: parsed });
  } catch (error) {
    console.error('[settings] community link write failed:', error);
    return NextResponse.json({ error: 'Could not save the link.' }, { status: 500 });
  }
}
