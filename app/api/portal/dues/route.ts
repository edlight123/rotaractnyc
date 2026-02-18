import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, serializeDoc } from '@/lib/firebase/admin';
import { createTransaction } from '@/lib/services/finance';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rotaractnyc.org';

async function getAuthenticatedUser(): Promise<{ uid: string; role: string; displayName: string } | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
  if (!sessionCookie) return null;
  try {
    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);
    const memberDoc = await adminDb.collection('members').doc(uid).get();
    if (!memberDoc.exists) return null;
    const data = memberDoc.data()!;
    return { uid, role: data.role, displayName: data.displayName || '' };
  } catch {
    return null;
  }
}

// GET — fetch dues status for current member, or all members' dues for treasurer
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const manage = searchParams.get('manage') === 'true';

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ cycle: null, dues: null });
    }

    let uid: string;
    try {
      const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ cycle: null, dues: null });
    }

    // Get current dues cycle
    const cycleSnap = await adminDb
      .collection('duesCycles')
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (cycleSnap.empty) {
      return NextResponse.json({ cycle: null, dues: null, allDues: [], stats: null });
    }

    const cycle = serializeDoc({ id: cycleSnap.docs[0].id, ...cycleSnap.docs[0].data() });

    // If manage mode — return all members' dues for this cycle (treasurer/president only)
    if (manage) {
      const memberDoc = await adminDb.collection('members').doc(uid).get();
      const member = memberDoc.data();
      if (!member || !['treasurer', 'president'].includes(member.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Get all dues for this cycle
      const allDuesSnap = await adminDb
        .collection('memberDues')
        .where('cycleId', '==', cycle.id)
        .get();
      const allDues = allDuesSnap.docs.map((d) => serializeDoc({ id: d.id, ...d.data() }));

      // Get all active members for name lookup
      const membersSnap = await adminDb
        .collection('members')
        .where('status', 'in', ['active', 'pending'])
        .get();
      const membersMap: Record<string, { displayName: string; memberType?: string; email: string }> = {};
      membersSnap.docs.forEach((d) => {
        const data = d.data();
        membersMap[d.id] = { displayName: data.displayName, memberType: data.memberType, email: data.email };
      });

      // Enrich dues records with member names
      const enrichedDues = allDues.map((d: any) => ({
        ...d,
        memberName: membersMap[d.memberId]?.displayName || 'Unknown',
        memberEmail: membersMap[d.memberId]?.email || '',
      }));

      // Compute stats
      const paid = allDues.filter((d: any) => d.status === 'PAID' || d.status === 'PAID_OFFLINE');
      const waived = allDues.filter((d: any) => d.status === 'WAIVED');
      const stats = {
        total: allDues.length,
        paid: paid.length,
        waived: waived.length,
        unpaid: allDues.length - paid.length - waived.length,
        collected: paid.reduce((sum: number, d: any) => sum + (d.amount || 0), 0),
      };

      // Also return members who DON'T have a dues record yet
      const membersWithDues = new Set(allDues.map((d: any) => d.memberId));
      const membersWithoutDues = Object.entries(membersMap)
        .filter(([id]) => !membersWithDues.has(id))
        .map(([id, m]) => ({
          memberId: id,
          memberName: m.displayName,
          memberEmail: m.email,
          memberType: m.memberType || 'professional',
          status: 'UNPAID' as const,
          amount: 0,
        }));

      return NextResponse.json({ cycle, allDues: enrichedDues, membersWithoutDues, stats });
    }

    // Regular member view — just their own dues
    const duesSnap = await adminDb
      .collection('memberDues')
      .where('memberId', '==', uid)
      .where('cycleId', '==', cycle.id)
      .limit(1)
      .get();

    const dues = duesSnap.empty ? null : serializeDoc({ id: duesSnap.docs[0].id, ...duesSnap.docs[0].data() });

    return NextResponse.json({ cycle, dues });
  } catch (error) {
    console.error('Error fetching dues:', error);
    return NextResponse.json({ error: 'Failed to fetch dues' }, { status: 500 });
  }
}

// Create Stripe checkout session for dues payment
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);
    const { memberType } = await request.json();

    if (!memberType || !['professional', 'student'].includes(memberType)) {
      return NextResponse.json({ error: 'Invalid member type' }, { status: 400 });
    }

    // Get member info
    const memberSnap = await adminDb.collection('members').doc(uid).get();
    if (!memberSnap.exists) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    const member = memberSnap.data()!;

    // Get active dues cycle
    const cycleSnap = await adminDb
      .collection('duesCycles')
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (cycleSnap.empty) {
      return NextResponse.json({ error: 'No active dues cycle' }, { status: 400 });
    }

    const cycleData = cycleSnap.docs[0].data();
    const cycle = { id: cycleSnap.docs[0].id, ...cycleData };
    const amount = memberType === 'student'
      ? (cycleData.amountStudent ?? 6500)
      : (cycleData.amountProfessional ?? 8500);

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      // No Stripe key — record as pending and return success
      await adminDb.collection('memberDues').add({
        memberId: uid,
        cycleId: cycle.id,
        memberType,
        amount,
        status: 'UNPAID',
        createdAt: new Date().toISOString(),
      });
      return NextResponse.json({
        error: 'Stripe is not configured. Please contact the treasurer for alternative payment.',
      }, { status: 503 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Create or get existing memberDues record
    let duesDocId: string;
    const existingSnap = await adminDb
      .collection('memberDues')
      .where('memberId', '==', uid)
      .where('cycleId', '==', cycle.id)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      duesDocId = existingSnap.docs[0].id;
    } else {
      const newDoc = await adminDb.collection('memberDues').add({
        memberId: uid,
        cycleId: cycle.id,
        memberType,
        amount,
        status: 'UNPAID',
        createdAt: new Date().toISOString(),
      });
      duesDocId = newDoc.id;
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: member.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amount,
            product_data: {
              name: `Rotaract NYC Annual Dues – ${memberType === 'student' ? 'Student' : 'Professional'}`,
              description: `${(cycle as any).name || 'Annual'} membership dues`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'dues',
        memberId: uid,
        cycleId: cycle.id,
        memberType,
        duesDocId,
        amount: String(amount),
      },
      success_url: `${SITE_URL}/portal/dues?status=success`,
      cancel_url: `${SITE_URL}/portal/dues?status=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}

// PATCH — treasurer actions: approve-offline, waive, mark-unpaid
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!['treasurer', 'president'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action, memberId, cycleId, paymentMethod, paymentDate, notes, duesId, memberType, amount } = body;

    if (!action) {
      return NextResponse.json({ error: 'Missing action' }, { status: 400 });
    }

    if (action === 'approve-offline') {
      if (!memberId || !cycleId) {
        return NextResponse.json({ error: 'Missing memberId or cycleId' }, { status: 400 });
      }

      // Find or create dues record
      let duesDocId = duesId;
      if (!duesDocId) {
        const existingSnap = await adminDb
          .collection('memberDues')
          .where('memberId', '==', memberId)
          .where('cycleId', '==', cycleId)
          .limit(1)
          .get();

        if (!existingSnap.empty) {
          duesDocId = existingSnap.docs[0].id;
        }
      }

      const resolvedAmount = amount || 0;
      const paidAt = paymentDate || new Date().toISOString();

      if (duesDocId) {
        // Update existing record
        await adminDb.collection('memberDues').doc(duesDocId).update({
          status: 'PAID_OFFLINE',
          paidAt,
          paymentMethod: paymentMethod || 'cash',
          approvedBy: user.uid,
          approvedAt: new Date().toISOString(),
        });
      } else {
        // Create new record
        const ref = await adminDb.collection('memberDues').add({
          memberId,
          cycleId,
          memberType: memberType || 'professional',
          amount: resolvedAmount,
          status: 'PAID_OFFLINE',
          paidAt,
          paymentMethod: paymentMethod || 'cash',
          approvedBy: user.uid,
          approvedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
        duesDocId = ref.id;
      }

      // Record income transaction
      await createTransaction({
        type: 'income',
        category: 'Dues',
        amount: resolvedAmount / 100, // cents → dollars for display
        description: `Offline dues payment — ${memberType || 'professional'} (${paymentMethod || 'cash'})${notes ? ` — ${notes}` : ''}`,
        date: paidAt,
        createdBy: user.displayName || user.uid,
        createdAt: new Date().toISOString(),
        paymentMethod: paymentMethod || 'cash',
        approvedBy: user.uid,
        approvedAt: new Date().toISOString(),
        relatedMemberId: memberId,
      });

      return NextResponse.json({ success: true, duesId: duesDocId });
    }

    if (action === 'waive') {
      if (!duesId && !memberId) {
        return NextResponse.json({ error: 'Missing duesId or memberId' }, { status: 400 });
      }

      let docId = duesId;
      if (!docId && memberId && cycleId) {
        const snap = await adminDb
          .collection('memberDues')
          .where('memberId', '==', memberId)
          .where('cycleId', '==', cycleId)
          .limit(1)
          .get();
        if (!snap.empty) {
          docId = snap.docs[0].id;
        } else {
          // Create a waived record
          const ref = await adminDb.collection('memberDues').add({
            memberId,
            cycleId,
            memberType: memberType || 'professional',
            amount: 0,
            status: 'WAIVED',
            approvedBy: user.uid,
            approvedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          });
          return NextResponse.json({ success: true, duesId: ref.id });
        }
      }

      if (docId) {
        await adminDb.collection('memberDues').doc(docId).update({
          status: 'WAIVED',
          approvedBy: user.uid,
          approvedAt: new Date().toISOString(),
        });
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'mark-unpaid') {
      if (!duesId) {
        return NextResponse.json({ error: 'Missing duesId' }, { status: 400 });
      }

      await adminDb.collection('memberDues').doc(duesId).update({
        status: 'UNPAID',
        paidAt: null,
        paymentMethod: null,
        approvedBy: null,
        approvedAt: null,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error processing dues action:', error);
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 });
  }
}
