import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminApp } from '@/lib/firebase/admin';
import { getFirestore } from 'firebase-admin/firestore';
import { requireRole } from '@/lib/portal/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Require TREASURER or ADMIN role
    await requireRole('TREASURER');

    const { month }: { month: string } = await req.json();

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'Invalid month format. Use YYYY-MM' }, { status: 400 });
    }

    const app = getFirebaseAdminApp();
    if (!app) {
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
    }

    const db = getFirestore(app);

    // Get all transactions for the month
    const startDate = new Date(`${month}-01T00:00:00.000Z`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const transactionsSnapshot = await db.collection('transactions')
      .where('date', '>=', startDate)
      .where('date', '<', endDate)
      .get();

    let incomeTotal = 0;
    let expenseTotal = 0;
    const categoryTotals: Record<string, number> = {};

    transactionsSnapshot.forEach(doc => {
      const transaction = doc.data();
      const amount = transaction.amount || 0;
      const category = transaction.category || 'Uncategorized';

      if (amount >= 0) {
        incomeTotal += amount;
      } else {
        expenseTotal += Math.abs(amount);
      }

      categoryTotals[category] = (categoryTotals[category] || 0) + amount;
    });

    // Get previous month's ending balance as starting balance
    const [year, monthNum] = month.split('-').map(Number);
    const prevDate = new Date(year, monthNum - 2, 1); // JS months are 0-indexed
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    
    let startingBalance = 0;
    const prevSummaryDoc = await db.collection('monthlySummaries').doc(prevMonth).get();
    if (prevSummaryDoc.exists) {
      startingBalance = prevSummaryDoc.data()?.endingBalance || 0;
    }

    const endingBalance = startingBalance + incomeTotal - expenseTotal;

    // Update or create monthly summary
    const summaryData = {
      month,
      startingBalance,
      incomeTotal,
      expenseTotal,
      endingBalance,
      categoryTotals,
      updatedAt: new Date(),
    };

    await db.collection('monthlySummaries').doc(month).set(summaryData);

    return NextResponse.json({ 
      success: true,
      summary: summaryData
    });
  } catch (error: any) {
    console.error('Error recomputing monthly summary:', error);
    
    if (error.message === 'Unauthorized' || error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    return NextResponse.json({ error: 'Failed to recompute monthly summary' }, { status: 500 });
  }
}
