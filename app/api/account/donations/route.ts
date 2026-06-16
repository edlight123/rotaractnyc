/**
 * GET /api/account/donations
 *
 * Returns the signed-in user's donation history for the supporter hub.
 * Ownership is proven by the VERIFIED token email (mirrors the `ownsEmail()`
 * Firestore rule on `donors`). Unverified users get an empty history.
 *
 *   - summary: from `donors/{email}` (totals maintained by the Stripe webhook)
 *   - donations: itemized from `transactions` (category 'Donations') by email
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { SESSION_COOKIE_NAME } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let email: string | null = null;
  let emailVerified = false;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    email = (decoded.email || '').toLowerCase() || null;
    emailVerified = !!decoded.email_verified;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only verified owners can see donation history tied to their email.
  if (!emailVerified || !email) {
    return NextResponse.json({
      verified: false,
      summary: null,
      donations: [],
    });
  }

  const [donorSnap, txSnap] = await Promise.all([
    adminDb.collection('donors').doc(email).get(),
    adminDb.collection('transactions').where('email', '==', email).get(),
  ]);

  const summary = donorSnap.exists
    ? {
        totalDonatedCents: donorSnap.data()?.totalDonatedCents || 0,
        totalDonationCount: donorSnap.data()?.totalDonationCount || 0,
        lastDonationDate: donorSnap.data()?.lastDonationDate || null,
      }
    : null;

  const donations = txSnap.docs
    .map((d) => d.data())
    .filter((t) => t.category === 'Donations' && t.type === 'income')
    .map((t) => ({
      amountCents: Number(t.amount) || 0,
      date: t.date || t.createdAt || null,
      description: t.description || 'Donation',
      status: t.status || 'completed',
    }))
    .sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });

  return NextResponse.json({ verified: true, summary, donations });
}
