import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, serializeDoc } from '@/lib/firebase/admin';
import { getFinanceSummary, getTransactions } from '@/lib/services/finance';

export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';

// Get finance summary (treasurer/president only)
export async function GET() {
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

    // Use service layer for summary (includes monthlyBreakdown)
    const summary = await getFinanceSummary();
    const transactions = (await getTransactions(50)).map(serializeDoc);

    return NextResponse.json({ summary, transactions });
  } catch (error) {
    console.error('Error fetching finance data:', error);
    return NextResponse.json({ error: 'Failed to fetch finance data' }, { status: 500 });
  }
}
