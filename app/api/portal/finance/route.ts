import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, serializeDoc } from '@/lib/firebase/admin';

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

    // Get transactions
    const txSnapshot = await adminDb
      .collection('transactions')
      .orderBy('date', 'desc')
      .limit(50)
      .get();

    const transactions = txSnapshot.docs.map((doc) => serializeDoc({
      id: doc.id,
      ...doc.data(),
    }));

    // Calculate summary
    const income = transactions
      .filter((t: any) => t.type === 'income')
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
    const expenses = transactions
      .filter((t: any) => t.type === 'expense')
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

    return NextResponse.json({
      summary: {
        totalIncome: income,
        totalExpenses: expenses,
        balance: income - expenses,
      },
      transactions,
    });
  } catch (error) {
    console.error('Error fetching finance data:', error);
    return NextResponse.json({ error: 'Failed to fetch finance data' }, { status: 500 });
  }
}
