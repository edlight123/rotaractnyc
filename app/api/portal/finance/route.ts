import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, serializeDoc } from '@/lib/firebase/admin';
import { getFinanceSummary, getTransactions, createTransaction, deleteTransaction } from '@/lib/services/finance';

export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';

async function getAuthenticatedTreasurer(): Promise<{ uid: string; role: string; displayName: string } | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
  if (!sessionCookie) return null;
  try {
    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);
    const memberDoc = await adminDb.collection('members').doc(uid).get();
    if (!memberDoc.exists) return null;
    const data = memberDoc.data()!;
    if (!['treasurer', 'president'].includes(data.role)) return null;
    return { uid, role: data.role, displayName: data.displayName || '' };
  } catch {
    return null;
  }
}

// GET — finance summary (treasurer/president only)
export async function GET() {
  try {
    const user = await getAuthenticatedTreasurer();
    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const summary = await getFinanceSummary();
    const transactions = (await getTransactions(200)).map(serializeDoc);

    return NextResponse.json({ summary, transactions });
  } catch (error) {
    console.error('Error fetching finance data:', error);
    return NextResponse.json({ error: 'Failed to fetch finance data' }, { status: 500 });
  }
}

// POST — record a new transaction (expense or income)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedTreasurer();
    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { type, category, amount, description, date, receiptUrl, paymentMethod, relatedMemberId } = body;

    if (!type || !['income', 'expense'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type (must be income or expense)' }, { status: 400 });
    }
    if (!category || !amount || !description || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const id = await createTransaction({
      type,
      category,
      amount: Number(amount),
      description,
      date,
      createdBy: user.displayName || user.uid,
      createdAt: new Date().toISOString(),
      ...(receiptUrl && { receiptUrl }),
      ...(paymentMethod && { paymentMethod }),
      ...(relatedMemberId && { relatedMemberId }),
    });

    return NextResponse.json({ id });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}

// DELETE — remove a transaction by ID
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedTreasurer();
    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing transaction id' }, { status: 400 });
    }

    await deleteTransaction(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 });
  }
}
