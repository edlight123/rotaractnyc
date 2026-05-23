import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { getEventAttendees } from '@/lib/services/eventAttendees';

export const dynamic = 'force-dynamic';

async function getAuthenticatedManager(): Promise<{ uid: string; role: string } | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
  if (!sessionCookie) return null;
  try {
    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);
    const memberDoc = await adminDb.collection('members').doc(uid).get();
    if (!memberDoc.exists) return null;
    const data = memberDoc.data()!;
    if (!['board', 'president', 'treasurer'].includes(data.role)) return null;
    return { uid, role: data.role };
  } catch {
    return null;
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedManager();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: eventId } = await params;

  try {
    const { rows, totals } = await getEventAttendees(eventId);

    return NextResponse.json({
      purchasers: rows,
      summary: {
        totalRevenueCents: totals.revenueCents,
        totalRevenue: totals.revenueCents,
        guestCount: totals.guests,
        memberCount: totals.members,
        totalTickets: totals.tickets,
        checkedInCount: totals.checkedIn,
        totalAttendees: totals.totalAttendees,
        orderCount: totals.orderCount,
      },
    });
  } catch (err: any) {
    console.error('[purchasers] failed for event', eventId, err);
    return NextResponse.json(
      { error: err?.message || 'Failed to load purchasers' },
      { status: 500 },
    );
  }
}
