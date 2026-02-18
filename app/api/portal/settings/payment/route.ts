import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// GET — public read of payment settings (Zelle, Venmo, instructions)
export async function GET() {
  try {
    const doc = await adminDb.collection('settings').doc('payment').get();
    if (!doc.exists) {
      return NextResponse.json({
        zellePhone: '',
        venmoHandle: '',
        instructions: '',
      });
    }
    return NextResponse.json(doc.data());
  } catch (error) {
    console.error('Error fetching payment settings:', error);
    return NextResponse.json({ error: 'Failed to fetch payment settings' }, { status: 500 });
  }
}

// PUT — treasurer/president only, upsert payment settings
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);

    // Check role
    const memberDoc = await adminDb.collection('members').doc(uid).get();
    const member = memberDoc.data();
    if (!member || !['treasurer', 'president'].includes(member.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { zellePhone, venmoHandle, instructions } = body;

    await adminDb.collection('settings').doc('payment').set(
      {
        zellePhone: zellePhone || '',
        venmoHandle: venmoHandle || '',
        instructions: instructions || '',
        updatedAt: new Date().toISOString(),
        updatedBy: uid,
      },
      { merge: true },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating payment settings:', error);
    return NextResponse.json({ error: 'Failed to update payment settings' }, { status: 500 });
  }
}
