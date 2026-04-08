import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';
import { incrementTierSoldCount } from '@/lib/services/tierTracking';

// GET — List pending approvals (budgets + offline payments)
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);
    const memberDoc = await adminDb.collection('members').doc(uid).get();
    const member = memberDoc.data();

    if (!member || !['treasurer', 'president'].includes(member.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const isPresident = member.role === 'president';

    // Fetch pending budget approvals (for president)
    let pendingBudgets: any[] = [];
    if (isPresident) {
      const budgetsSnapshot = await adminDb
        .collection('activities')
        .where('status', '==', 'pending_approval')
        .orderBy('createdAt', 'desc')
        .get();
      pendingBudgets = budgetsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    // Fetch pending offline payments (for treasurer)
    let pendingPayments: any[] = [];
    if (member.role === 'treasurer') {
      const paymentsSnapshot = await adminDb
        .collection('offlinePayments')
        .where('status', '==', 'pending')
        .orderBy('submittedAt', 'desc')
        .get();
      pendingPayments = paymentsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    // Fetch pending expenses (for treasurer)
    let pendingExpenses: any[] = [];
    if (member.role === 'treasurer') {
      const expensesSnapshot = await adminDb
        .collection('expenses')
        .where('status', '==', 'pending')
        .orderBy('date', 'desc')
        .get();
      pendingExpenses = expensesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    return NextResponse.json({
      pendingBudgets,
      pendingPayments,
      pendingExpenses,
    });
  } catch (error) {
    console.error('Error fetching approvals:', error);
    return NextResponse.json({ error: 'Failed to fetch approvals' }, { status: 500 });
  }
}

// PATCH — Approve/reject budget, payment, or expense
export async function PATCH(request: NextRequest) {
  const rateLimitResult = await rateLimit(getRateLimitKey(request, 'finance-approvals'), { max: 10, windowSec: 60 });
  if (!rateLimitResult.allowed) return rateLimitResponse(rateLimitResult.resetAt);

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);
    const memberDoc = await adminDb.collection('members').doc(uid).get();
    const member = memberDoc.data();

    if (!member || !['treasurer', 'president'].includes(member.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { type, id, action, notes } = body;

    if (!type || !id || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Handle budget approval (president only)
    if (type === 'budget') {
      if (member.role !== 'president') {
        return NextResponse.json({ error: 'Only president can approve budgets' }, { status: 403 });
      }

      await adminDb
        .collection('activities')
        .doc(id)
        .update({
          status: action === 'approve' ? 'approved' : 'draft',
          'approvals.presidentApproved': action === 'approve',
          'approvals.presidentApprovedAt': FieldValue.serverTimestamp(),
          'approvals.presidentNotes': notes || null,
          updatedAt: FieldValue.serverTimestamp(),
        });

      return NextResponse.json({ success: true });
    }

    // Handle offline payment approval (treasurer only)
    if (type === 'payment') {
      if (member.role !== 'treasurer') {
        return NextResponse.json({ error: 'Only treasurer can approve payments' }, { status: 403 });
      }

      const paymentDoc = await adminDb.collection('offlinePayments').doc(id).get();
      if (!paymentDoc.exists) {
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
      }

      const payment = paymentDoc.data()!;

      await adminDb.collection('offlinePayments').doc(id).update({
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewedBy: uid,
        reviewedAt: FieldValue.serverTimestamp(),
        reviewNotes: notes || null,
      });

      // If approved, mark the corresponding dues/event as paid
      if (action === 'approve') {
        if (payment.type === 'dues') {
          await adminDb.collection('dues').doc(payment.relatedId).update({
            status: 'PAID_OFFLINE',
            paymentMethod: payment.method,
            updatedAt: FieldValue.serverTimestamp(),
          });
        } else if (payment.type === 'event') {
          const rsvpRef = adminDb.collection('rsvps').doc(`${payment.memberId}_${payment.relatedId}`);
          await rsvpRef.set(
            {
              memberId: payment.memberId,
              eventId: payment.relatedId,
              status: 'going',
              ticketType: 'member',
              tierId: payment.tierId || null,
              paidAmount: payment.amount,
              paymentMethod: payment.method,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          // Track tier capacity
          if (payment.tierId) {
            await incrementTierSoldCount(payment.relatedId, payment.tierId);
          }
        }
      }

      return NextResponse.json({ success: true });
    }

    // Handle expense approval (treasurer only)
    if (type === 'expense') {
      if (member.role !== 'treasurer') {
        return NextResponse.json({ error: 'Only treasurer can approve expenses' }, { status: 403 });
      }

      const expenseDoc = await adminDb.collection('expenses').doc(id).get();
      if (!expenseDoc.exists) {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
      }

      const expense = expenseDoc.data()!;

      await adminDb.collection('expenses').doc(id).update({
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewedBy: uid,
        reviewedAt: FieldValue.serverTimestamp(),
        notes: notes || expense.notes,
      });

      // Update activity totals if approved
      if (action === 'approve') {
        const expensesSnapshot = await adminDb
          .collection('expenses')
          .where('activityId', '==', expense.activityId)
          .where('status', '==', 'approved')
          .get();
        
        const totalSpent = expensesSnapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
        
        await adminDb.collection('activities').doc(expense.activityId).update({
          'actual.totalSpent': totalSpent,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Error processing approval:', error);
    return NextResponse.json({ error: 'Failed to process approval' }, { status: 500 });
  }
}
