import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, serializeDoc } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

async function getAuthenticatedTreasurer(): Promise<{ uid: string; role: string } | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
  if (!sessionCookie) return null;
  try {
    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);
    const memberDoc = await adminDb.collection('members').doc(uid).get();
    if (!memberDoc.exists) return null;
    const data = memberDoc.data()!;
    if (!['treasurer', 'president'].includes(data.role)) return null;
    return { uid, role: data.role };
  } catch {
    return null;
  }
}

// GET — list all dues cycles
export async function GET() {
  try {
    const user = await getAuthenticatedTreasurer();
    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const snap = await adminDb
      .collection('duesCycles')
      .orderBy('createdAt', 'desc')
      .get();

    const cycles = snap.docs.map((d) => serializeDoc({ id: d.id, ...d.data() }));
    return NextResponse.json({ cycles });
  } catch (error) {
    console.error('Error fetching cycles:', error);
    return NextResponse.json({ error: 'Failed to fetch cycles' }, { status: 500 });
  }
}

// POST — create a new dues cycle
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedTreasurer();
    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, startDate, endDate, amountProfessional, amountStudent, gracePeriodDays, isActive } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields (name, startDate, endDate)' }, { status: 400 });
    }

    // If activating this cycle, deactivate all others
    if (isActive) {
      const activeSnap = await adminDb
        .collection('duesCycles')
        .where('isActive', '==', true)
        .get();
      const batch = adminDb.batch();
      activeSnap.docs.forEach((d) => batch.update(d.ref, { isActive: false }));
      await batch.commit();
    }

    const ref = await adminDb.collection('duesCycles').add({
      name,
      startDate,
      endDate,
      amountProfessional: amountProfessional || 8500,
      amountStudent: amountStudent || 6500,
      gracePeriodDays: gracePeriodDays || 30,
      isActive: isActive || false,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ id: ref.id });
  } catch (error) {
    console.error('Error creating cycle:', error);
    return NextResponse.json({ error: 'Failed to create cycle' }, { status: 500 });
  }
}

// PATCH — update an existing cycle
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedTreasurer();
    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing cycle id' }, { status: 400 });
    }

    const allowed: Record<string, any> = {};
    const allowedFields = ['name', 'startDate', 'endDate', 'amountProfessional', 'amountStudent', 'gracePeriodDays', 'isActive'];
    for (const field of allowedFields) {
      if (updates[field] !== undefined) allowed[field] = updates[field];
    }

    // If activating this cycle, deactivate all others
    if (allowed.isActive === true) {
      const activeSnap = await adminDb
        .collection('duesCycles')
        .where('isActive', '==', true)
        .get();
      const batch = adminDb.batch();
      activeSnap.docs.forEach((d) => {
        if (d.id !== id) batch.update(d.ref, { isActive: false });
      });
      await batch.commit();
    }

    await adminDb.collection('duesCycles').doc(id).update({
      ...allowed,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating cycle:', error);
    return NextResponse.json({ error: 'Failed to update cycle' }, { status: 500 });
  }
}
