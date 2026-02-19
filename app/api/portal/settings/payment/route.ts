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

    // Accept both old and new field names for backwards compatibility
    const data: Record<string, any> = {
      updatedAt: new Date().toISOString(),
      updatedBy: uid,
    };

    // Zelle
    if ('zelleIdentifier' in body) data.zelleIdentifier = body.zelleIdentifier || '';
    if ('zellePhone' in body) data.zellePhone = body.zellePhone || '';
    if ('zelleEnabled' in body) data.zelleEnabled = !!body.zelleEnabled;

    // Venmo
    if ('venmoUsername' in body) data.venmoUsername = body.venmoUsername || '';
    if ('venmoHandle' in body) data.venmoHandle = body.venmoHandle || '';
    if ('venmoEnabled' in body) data.venmoEnabled = !!body.venmoEnabled;

    // Cash App
    if ('cashappUsername' in body) data.cashappUsername = body.cashappUsername || '';
    if ('cashappEnabled' in body) data.cashappEnabled = !!body.cashappEnabled;

    // Legacy instructions field
    if ('instructions' in body) data.instructions = body.instructions || '';

    await adminDb.collection('settings').doc('payment').set(data, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating payment settings:', error);
    return NextResponse.json({ error: 'Failed to update payment settings' }, { status: 500 });
  }
}
