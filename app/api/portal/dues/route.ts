import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rotaractnyc.org';

// Get dues status for current member
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) {
      // Return empty data so the page renders the default "unpaid" state
      return NextResponse.json({ cycle: null, dues: null });
    }

    let uid: string;
    try {
      const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
      uid = decoded.uid;
    } catch {
      // Session expired or invalid — return safe defaults
      return NextResponse.json({ cycle: null, dues: null });
    }

    // Get current dues cycle
    const cycleSnap = await adminDb
      .collection('duesCycles')
      .where('active', '==', true)
      .limit(1)
      .get();

    if (cycleSnap.empty) {
      return NextResponse.json({ cycle: null, status: null });
    }

    const cycle = { id: cycleSnap.docs[0].id, ...cycleSnap.docs[0].data() };

    // Get member's dues for this cycle
    const duesSnap = await adminDb
      .collection('memberDues')
      .where('memberId', '==', uid)
      .where('cycleId', '==', cycle.id)
      .limit(1)
      .get();

    const dues = duesSnap.empty ? null : { id: duesSnap.docs[0].id, ...duesSnap.docs[0].data() };

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
      .where('active', '==', true)
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
