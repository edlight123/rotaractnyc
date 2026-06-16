/**
 * GET /api/account/tickets
 *
 * Returns the signed-in user's event tickets for the supporter hub:
 *   - Member tickets: `rsvps` where memberId == uid, status 'going'.
 *   - Guest tickets:  `guest_rsvps` where email == the user's VERIFIED token
 *     email, status 'going'. (Mirrors the `ownsEmail()` Firestore rule.)
 *
 * QR codes are generated fresh on every request via generateTicketQRCodeUrls,
 * so the signed timestamp is always current — the hub is the durable display
 * surface that never shows the expired-placeholder problem that advance-issued
 * ticket emails could.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { SESSION_COOKIE_NAME } from '@/lib/constants';
import { generateTicketQRCodeUrls } from '@/lib/utils/qrcode';

export const dynamic = 'force-dynamic';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface TicketDTO {
  id: string;
  kind: 'member' | 'guest';
  eventId: string;
  eventTitle: string;
  eventSlug?: string;
  eventDate?: string;
  eventTime?: string;
  eventLocation?: string;
  eventImageURL?: string;
  quantity: number;
  status: string;
  paymentStatus?: string;
  checkedIn?: boolean;
  isPast: boolean;
  qrUrls: string[];
  createdAt?: string;
}

export async function GET() {
  // ── Authenticate ──
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let uid: string;
  let email: string | null = null;
  let emailVerified = false;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    uid = decoded.uid;
    email = (decoded.email || '').toLowerCase() || null;
    emailVerified = !!decoded.email_verified;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Gather member + guest RSVPs in parallel ──
  // Guest tickets are only surfaced when the caller's email is verified, so a
  // user can never enumerate another person's tickets by claiming their email.
  const memberQuery = adminDb
    .collection('rsvps')
    .where('memberId', '==', uid)
    .where('status', '==', 'going')
    .get();

  const guestQuery =
    emailVerified && email
      ? adminDb
          .collection('guest_rsvps')
          .where('email', '==', email)
          .where('status', '==', 'going')
          .get()
      : Promise.resolve(null);

  const [memberSnap, guestSnap] = await Promise.all([memberQuery, guestQuery]);

  // ── Collect the events we need, fetch once each ──
  const rows: Array<{
    id: string;
    kind: 'member' | 'guest';
    eventId: string;
    holderId: string; // uid for member tickets, email for guest tickets
    quantity: number;
    status: string;
    paymentStatus?: string;
    checkedIn?: boolean;
    createdAt?: string;
  }> = [];

  memberSnap.forEach((doc) => {
    const d = doc.data();
    if (!d.eventId) return;
    rows.push({
      id: doc.id,
      kind: 'member',
      eventId: d.eventId,
      holderId: uid,
      quantity: Number(d.quantity) || 1,
      status: d.status,
      paymentStatus: d.paymentStatus,
      checkedIn: !!d.checkedIn,
      createdAt: d.createdAt,
    });
  });

  if (guestSnap) {
    guestSnap.forEach((doc) => {
      const d = doc.data();
      if (!d.eventId || !email) return;
      rows.push({
        id: doc.id,
        kind: 'guest',
        eventId: d.eventId,
        holderId: email,
        quantity: Number(d.quantity) || 1,
        status: d.status,
        paymentStatus: d.paymentStatus,
        checkedIn: !!d.checkedIn,
        createdAt: d.createdAt,
      });
    });
  }

  if (rows.length === 0) {
    return NextResponse.json({ tickets: [] });
  }

  const uniqueEventIds = Array.from(new Set(rows.map((r) => r.eventId)));
  const eventSnaps = await adminDb.getAll(
    ...uniqueEventIds.map((id) => adminDb.collection('events').doc(id)),
  );
  const eventsById = new Map<string, FirebaseFirestore.DocumentData>();
  eventSnaps.forEach((snap) => {
    if (snap.exists) eventsById.set(snap.id, snap.data()!);
  });

  const now = Date.now();
  const tickets: TicketDTO[] = rows.map((r) => {
    const ev = eventsById.get(r.eventId);
    const eventDate = ev?.date ? new Date(ev.date) : null;
    // Treat events that ended more than a day ago as past (no QR needed).
    const isPast =
      !!eventDate && !isNaN(eventDate.getTime())
        ? eventDate.getTime() + MS_PER_DAY < now
        : false;

    let qrUrls: string[] = [];
    if (!isPast) {
      try {
        qrUrls = generateTicketQRCodeUrls(r.eventId, r.holderId, r.quantity);
      } catch {
        qrUrls = [];
      }
    }

    return {
      id: r.id,
      kind: r.kind,
      eventId: r.eventId,
      eventTitle: ev?.title || 'Event',
      eventSlug: ev?.slug,
      eventDate: ev?.date,
      eventTime: ev?.time,
      eventLocation: ev?.location,
      eventImageURL: ev?.imageURL,
      quantity: r.quantity,
      status: r.status,
      paymentStatus: r.paymentStatus,
      checkedIn: r.checkedIn,
      isPast,
      qrUrls,
      createdAt: r.createdAt,
    };
  });

  // Upcoming first (soonest at top), then past (most recent first).
  tickets.sort((a, b) => {
    if (a.isPast !== b.isPast) return a.isPast ? 1 : -1;
    const da = a.eventDate ? new Date(a.eventDate).getTime() : 0;
    const db = b.eventDate ? new Date(b.eventDate).getTime() : 0;
    return a.isPast ? db - da : da - db;
  });

  return NextResponse.json({ tickets });
}
