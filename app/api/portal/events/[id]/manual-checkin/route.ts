import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { canManageEvent } from '@/lib/server/access';

export const dynamic = 'force-dynamic';

/** Resolve the authenticated portal session (event-level access is checked
 *  per-event via canManageEvent: board+, Events chair, or the owning
 *  committee's team). */
async function getSessionUid(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
  if (!sessionCookie) return null;
  try {
    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);
    return uid;
  } catch {
    return null;
  }
}

/**
 * POST /api/portal/events/[id]/manual-checkin
 *
 * Manual (door) check-in / undo for an attendee, used as the staff-driven
 * counterpart to the QR scanner. Unlike the signed `/checkin` route this does
 * NOT require a QR signature — it is gated purely on the caller being a board
 * member, so a member with a dead phone or a guest with no QR can still be
 * checked in by hand.
 *
 * Writes the same `checkedIn` / `checkedInAt` fields the QR flow uses so the
 * roster, scanner, and attendance totals all stay consistent. Members are
 * tracked in `rsvps/{memberId}_{eventId}`; guests in `guest_rsvps`.
 *
 * Body:
 *   kind:      'member' | 'guest'
 *   checkedIn: boolean            (default true — pass false to undo)
 *   memberId?: string             (required for members)
 *   rsvpId?:   string             (preferred target for guests)
 *   email?:    string             (guest fallback lookup / create)
 *   name?:     string             (guest display name when creating a doc)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: eventId } = await params;
  if (!eventId) return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });

  if (!(await canManageEvent(uid, eventId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: {
    kind?: string;
    checkedIn?: boolean;
    memberId?: string | null;
    rsvpId?: string | null;
    email?: string | null;
    name?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const kind: 'member' | 'guest' = body.kind === 'guest' ? 'guest' : 'member';
  // Default to checking IN; pass `checkedIn: false` to undo.
  const checkedIn = body.checkedIn !== false;
  const memberId = body.memberId ? String(body.memberId) : null;
  const rsvpId = body.rsvpId ? String(body.rsvpId) : null;
  const email = body.email ? String(body.email).trim().toLowerCase() : null;
  const name = body.name ? String(body.name).trim() : null;

  const now = new Date().toISOString();
  const checkedInAt = checkedIn ? now : null;
  const auditFields = {
    checkedInBy: checkedIn ? uid : null,
    checkedInMethod: checkedIn ? 'manual' : null,
  };

  try {
    // Defensive: make sure the event exists before mutating attendee docs.
    const eventSnap = await adminDb.collection('events').doc(eventId).get();
    if (!eventSnap.exists) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // ── Member check-in ──────────────────────────────────────────────────
    // RSVP docs are keyed deterministically as `${memberId}_${eventId}`, so we
    // can target (or create) the doc without an extra lookup.
    if (kind === 'member') {
      if (!memberId) {
        return NextResponse.json(
          { error: 'memberId is required for member check-in' },
          { status: 400 },
        );
      }
      const ref = adminDb.collection('rsvps').doc(`${memberId}_${eventId}`);
      const snap = await ref.get();
      if (snap.exists) {
        await ref.update({ checkedIn, checkedInAt, ...auditFields });
      } else {
        // Member never explicitly RSVP'd (e.g. bought a ticket) — create the
        // doc so the check-in persists and the roster reflects it.
        await ref.set({
          memberId,
          eventId,
          status: 'going',
          checkedIn,
          checkedInAt,
          createdAt: now,
          ...auditFields,
        });
      }
      return NextResponse.json({ success: true, kind, checkedIn, checkedInAt });
    }

    // ── Guest check-in ───────────────────────────────────────────────────
    // Prefer the exact guest_rsvps doc id; fall back to an (eventId, email)
    // lookup; finally create a lightweight guest doc if neither resolves.
    let ref: FirebaseFirestore.DocumentReference | null = null;

    if (rsvpId) {
      const candidate = adminDb.collection('guest_rsvps').doc(rsvpId);
      const candidateSnap = await candidate.get();
      if (candidateSnap.exists) ref = candidate;
    }

    if (!ref && email) {
      const q = await adminDb
        .collection('guest_rsvps')
        .where('eventId', '==', eventId)
        .where('email', '==', email)
        .limit(1)
        .get();
      if (!q.empty) ref = q.docs[0].ref;
    }

    if (ref) {
      await ref.update({ checkedIn, checkedInAt, ...auditFields });
      return NextResponse.json({ success: true, kind, checkedIn, checkedInAt });
    }

    // No existing guest doc — create one compatible with the webhook schema so
    // the roster, exports, and totals pick it up.
    if (!email && !name) {
      return NextResponse.json(
        { error: 'A guest email or name is required to check in' },
        { status: 400 },
      );
    }
    await adminDb.collection('guest_rsvps').add({
      eventId,
      name: name || 'Guest',
      email: email || '',
      phone: null,
      status: 'going',
      ticketType: 'guest',
      tierId: null,
      tierLabel: null,
      quantity: 1,
      paidAmount: 0,
      paymentStatus: 'free',
      checkedIn,
      checkedInAt,
      createdAt: now,
      ...auditFields,
    });

    return NextResponse.json({ success: true, kind, checkedIn, checkedInAt });
  } catch (err) {
    console.error('[manual-checkin] failed for event', eventId, err);
    return NextResponse.json({ error: 'Failed to update check-in' }, { status: 500 });
  }
}
