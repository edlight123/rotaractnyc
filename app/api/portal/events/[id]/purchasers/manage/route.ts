import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { cookies } from 'next/headers';

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

/**
 * POST /api/portal/events/[id]/purchasers/manage
 *
 * Admin actions on individual purchaser rows:
 *
 * - action: "mark_paid"
 *   Requires: purchaserId, paymentMethod (zelle|venmo|cashapp|cash|check|other), notes (optional audit note)
 *   Marks an offline-pending row as paid, records audit trail.
 *
 * - action: "remove"
 *   Requires: purchaserId
 *   Removes/cancels the purchaser's ticket (cancels RSVP, rejects offline payment if any).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedManager();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: eventId } = await params;
  const body = await request.json();
  const { action, purchaserId, paymentMethod, notes } = body;

  if (!action || !purchaserId) {
    return NextResponse.json({ error: 'Missing action or purchaserId' }, { status: 400 });
  }

  try {
    if (action === 'mark_paid') {
      if (!paymentMethod) {
        return NextResponse.json(
          { error: 'Payment method is required for audit purposes (e.g., zelle, venmo, cash)' },
          { status: 400 },
        );
      }

      const validMethods = ['zelle', 'venmo', 'cashapp', 'cash', 'check', 'other'];
      if (!validMethods.includes(paymentMethod)) {
        return NextResponse.json(
          { error: `Invalid payment method. Must be one of: ${validMethods.join(', ')}` },
          { status: 400 },
        );
      }

      // Try offlinePayments first (most common for pending entries)
      const offlineDoc = await adminDb.collection('offlinePayments').doc(purchaserId).get();
      if (offlineDoc.exists) {
        const offlineData = offlineDoc.data()!;
        await adminDb.collection('offlinePayments').doc(purchaserId).update({
          status: 'approved',
          method: paymentMethod,
          reviewedBy: user.uid,
          reviewedAt: FieldValue.serverTimestamp(),
          reviewNotes: notes || `Marked paid via ${paymentMethod} by admin`,
          auditTrail: FieldValue.arrayUnion({
            action: 'mark_paid',
            method: paymentMethod,
            notes: notes || null,
            by: user.uid,
            at: new Date().toISOString(),
          }),
        });

        // Update the associated RSVP to reflect paid status
        const memberId = offlineData.memberId;
        if (memberId) {
          const rsvpId = `${memberId}_${eventId}`;
          await adminDb.collection('rsvps').doc(rsvpId).set(
            {
              memberId,
              eventId,
              status: 'going',
              paymentStatus: 'paid',
              paymentMethod,
              paidAmount: offlineData.amount || 0,
              tierId: offlineData.tierId || null,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
        }

        return NextResponse.json({
          success: true,
          message: `Payment marked as paid via ${paymentMethod}`,
        });
      }

      // Check if it's a guest RSVP with pending payment
      const guestDoc = await adminDb.collection('guest_rsvps').doc(purchaserId).get();
      if (guestDoc.exists) {
        await adminDb.collection('guest_rsvps').doc(purchaserId).update({
          paymentStatus: 'paid',
          paymentMethod,
          reviewedBy: user.uid,
          reviewedAt: FieldValue.serverTimestamp(),
          auditTrail: FieldValue.arrayUnion({
            action: 'mark_paid',
            method: paymentMethod,
            notes: notes || null,
            by: user.uid,
            at: new Date().toISOString(),
          }),
        });
        return NextResponse.json({
          success: true,
          message: `Guest payment marked as paid via ${paymentMethod}`,
        });
      }

      // Check if it's an RSVP doc
      const rsvpDoc = await adminDb.collection('rsvps').doc(purchaserId).get();
      if (rsvpDoc.exists) {
        await adminDb.collection('rsvps').doc(purchaserId).update({
          paymentStatus: 'paid',
          paymentMethod,
          reviewedBy: user.uid,
          reviewedAt: FieldValue.serverTimestamp(),
          auditTrail: FieldValue.arrayUnion({
            action: 'mark_paid',
            method: paymentMethod,
            notes: notes || null,
            by: user.uid,
            at: new Date().toISOString(),
          }),
        });
        return NextResponse.json({
          success: true,
          message: `Payment marked as paid via ${paymentMethod}`,
        });
      }

      return NextResponse.json({ error: 'Purchaser record not found' }, { status: 404 });
    }

    if (action === 'remove') {
      // Try offlinePayments first
      const offlineDoc = await adminDb.collection('offlinePayments').doc(purchaserId).get();
      if (offlineDoc.exists) {
        const offlineData = offlineDoc.data()!;
        await adminDb.collection('offlinePayments').doc(purchaserId).update({
          status: 'rejected',
          reviewedBy: user.uid,
          reviewedAt: FieldValue.serverTimestamp(),
          reviewNotes: notes || 'Removed by admin from event page',
        });

        // Also cancel the associated RSVP
        const memberId = offlineData.memberId;
        if (memberId) {
          const rsvpId = `${memberId}_${eventId}`;
          const rsvpDoc = await adminDb.collection('rsvps').doc(rsvpId).get();
          if (rsvpDoc.exists) {
            await adminDb.collection('rsvps').doc(rsvpId).update({
              status: 'not_going',
              cancelledBy: user.uid,
              cancelledAt: FieldValue.serverTimestamp(),
            });
          }
        }

        return NextResponse.json({ success: true, message: 'Ticket removed' });
      }

      // Try guest RSVP
      const guestDoc = await adminDb.collection('guest_rsvps').doc(purchaserId).get();
      if (guestDoc.exists) {
        await adminDb.collection('guest_rsvps').doc(purchaserId).update({
          status: 'cancelled',
          cancelledBy: user.uid,
          cancelledAt: FieldValue.serverTimestamp(),
          cancelNotes: notes || 'Removed by admin from event page',
        });
        return NextResponse.json({ success: true, message: 'Guest ticket removed' });
      }

      // Try member RSVP
      const rsvpDoc = await adminDb.collection('rsvps').doc(purchaserId).get();
      if (rsvpDoc.exists) {
        await adminDb.collection('rsvps').doc(purchaserId).update({
          status: 'not_going',
          cancelledBy: user.uid,
          cancelledAt: FieldValue.serverTimestamp(),
          cancelNotes: notes || 'Removed by admin from event page',
        });
        return NextResponse.json({ success: true, message: 'Ticket removed' });
      }

      return NextResponse.json({ error: 'Purchaser record not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Invalid action. Must be "mark_paid" or "remove"' }, { status: 400 });
  } catch (err: any) {
    console.error('[purchasers/manage] error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to process action' },
      { status: 500 },
    );
  }
}
