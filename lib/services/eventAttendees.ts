/**
 * Shared service for computing the attendee/purchaser roster for an event.
 *
 * Used by:
 *   - GET /api/portal/events/[id]/purchasers
 *   - app/portal/events/[id]/attendees (PDF/CSV export)
 *   - lib/services/weeklyEventDigest (cron)
 *
 * ── Per-order semantics (May 2026) ──
 * Each row represents a SINGLE PURCHASE (one Stripe transaction, one offline
 * payment submission, or one free RSVP). A person who buys tickets across
 * multiple orders therefore appears as multiple rows — previously they were
 * collapsed into a single RSVP doc, which hid duplicate purchases and made
 * audits hard.
 *
 * Intentionally avoids `orderBy` clauses on Firestore queries to dodge the
 * composite-index requirement; results are sorted in memory.
 */
import { adminDb } from '@/lib/firebase/admin';

export interface AttendeeRow {
  /** Stable per-row id. For tx-derived rows this is the transaction id, for
   *  offline payments the offlinePayments doc id, otherwise the rsvp/guest
   *  doc id (free tickets). The attendees page uses this as the React key. */
  id: string;
  kind: 'member' | 'guest';
  /** Where this row was derived from — useful for debugging mismatches. */
  source: 'transaction' | 'offline_payment' | 'rsvp' | 'guest_rsvp';
  /** Stripe checkout/payment-intent id when available — uniquely identifies an order. */
  orderId?: string | null;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  paymentStatus: string;
  quantity: number;
  amountCents: number;
  tierId: string | null;
  /** ISO timestamp of when the purchase / RSVP was created. */
  createdAt: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  invitedBy?: string | null;
  notes?: string | null;
  memberId?: string | null;
  /** Reference to the underlying member RSVP doc (for member rows) or guest doc. */
  rsvpId?: string | null;
}

export interface AttendeeTotals {
  /** Distinct member attendees (NOT order count). */
  members: number;
  /** Distinct guest attendees. */
  guests: number;
  /** Sum of `quantity` across all rows — equals total tickets sold. */
  tickets: number;
  revenueCents: number;
  /** Distinct attendees (members + guests) who have checked in. */
  checkedIn: number;
  /** Distinct attendee count (members + guests). */
  totalAttendees: number;
  /** Number of order rows — useful for "X orders from Y people" copy. */
  orderCount: number;
}

export interface EventAttendees {
  rows: AttendeeRow[];
  totals: AttendeeTotals;
}

export async function getEventAttendees(eventId: string): Promise<EventAttendees> {
  const [guestSnap, rsvpSnap, txSnap, offlineSnap] = await Promise.all([
    adminDb.collection('guest_rsvps').where('eventId', '==', eventId).get(),
    adminDb
      .collection('rsvps')
      .where('eventId', '==', eventId)
      .where('status', '==', 'going')
      .get(),
    adminDb
      .collection('transactions')
      .where('eventId', '==', eventId)
      .where('type', '==', 'income')
      .get(),
    adminDb
      .collection('offlinePayments')
      .where('type', '==', 'event')
      .where('relatedId', '==', eventId)
      .get(),
  ]);

  // ── Lookups ──
  // Member RSVPs keyed by memberId (one per member by convention).
  const rsvpByMemberId = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
  rsvpSnap.docs.forEach((d) => {
    const memberId = d.data().memberId;
    if (memberId) rsvpByMemberId.set(memberId, d);
  });

  // Guest RSVPs keyed by lowercase email. When multiple docs exist for the
  // same email (legacy bug where free checkouts created N duplicate docs)
  // we keep the most recently created one for check-in/contact lookup.
  const guestByEmail = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
  guestSnap.docs.forEach((d) => {
    const email = String(d.data().email || '').toLowerCase();
    if (!email) return;
    const existing = guestByEmail.get(email);
    if (
      !existing ||
      String(d.data().createdAt || '') > String(existing.data().createdAt || '')
    ) {
      guestByEmail.set(email, d);
    }
  });

  // Batch-fetch member name/email (Firestore 'in' supports up to 30 ids)
  const memberIds = Array.from(rsvpByMemberId.keys());
  const memberInfoMap = new Map<string, { name: string; email: string; photo?: string }>();
  for (let i = 0; i < memberIds.length; i += 30) {
    const batch = memberIds.slice(i, i + 30);
    if (batch.length === 0) continue;
    const snap = await adminDb
      .collection('members')
      .where('__name__', 'in', batch)
      .get();
    snap.docs.forEach((doc) => {
      const d = doc.data();
      const name =
        [d.firstName, d.lastName].filter(Boolean).join(' ').trim() ||
        d.displayName ||
        d.name ||
        'Member';
      memberInfoMap.set(doc.id, {
        name,
        email: d.email || '',
        photo: d.photoURL || d.photo || undefined,
      });
    });
  }

  // ── Rows: one per order ──
  const rows: AttendeeRow[] = [];
  // Track which "person+source" combinations have at least one order row so
  // we don't double-count free RSVPs that already have a paid transaction.
  const memberOrderIds = new Set<string>();
  const guestOrderEmails = new Set<string>();
  const guestOrderDocIds = new Set<string>();

  // 1. Transactions (one row per Stripe purchase)
  txSnap.docs.forEach((doc) => {
    const d = doc.data();
    const category = String(d.category || '');
    // Donations live in the same collection — skip them; tickets use 'Events'.
    if (category && category !== 'Events') return;

    const quantity = Number(d.quantity) || 1;
    const amountCents = Number(d.amount) || 0;
    const createdAt = String(d.createdAt || d.date || '');
    const memberId: string | undefined = d.relatedMemberId || undefined;
    const orderId: string | null = d.stripeSessionId || null;

    if (memberId) {
      const info = memberInfoMap.get(memberId);
      const rsvpDoc = rsvpByMemberId.get(memberId);
      const rsvpData = rsvpDoc?.data();
      rows.push({
        id: doc.id,
        kind: 'member',
        source: 'transaction',
        orderId,
        name: info?.name || rsvpData?.memberName || 'Member',
        email: info?.email || '',
        phone: null,
        status: rsvpData?.status || 'going',
        paymentStatus: 'paid',
        quantity,
        amountCents,
        tierId: d.tierId || rsvpData?.tierId || null,
        createdAt,
        checkedIn: !!rsvpData?.checkedIn,
        checkedInAt: rsvpData?.checkedInAt || null,
        memberId,
        rsvpId: rsvpDoc?.id || null,
      });
      memberOrderIds.add(memberId);
      return;
    }

    // Guest transaction — no relatedMemberId, fall back to email lookup
    const email = String(d.email || '').toLowerCase();
    const guestDoc = email ? guestByEmail.get(email) : undefined;
    const guestData = guestDoc?.data();
    rows.push({
      id: doc.id,
      kind: 'guest',
      source: 'transaction',
      orderId,
      name: guestData?.name || d.guestName || 'Guest',
      email: email || guestData?.email || '',
      phone: guestData?.phone || null,
      status: guestData?.status || 'going',
      paymentStatus: 'paid',
      quantity,
      amountCents,
      tierId: d.tierId || guestData?.tierId || null,
      createdAt,
      checkedIn: !!guestData?.checkedIn,
      checkedInAt: guestData?.checkedInAt || null,
      invitedBy: guestData?.invitedByName || guestData?.invitedBy || null,
      notes: guestData?.notes || null,
      rsvpId: guestDoc?.id || null,
    });
    if (email) guestOrderEmails.add(email);
    if (guestDoc?.id) guestOrderDocIds.add(guestDoc.id);
  });

  // 2. Offline payments (one row per submission). Approved → paid; pending
  //    rows are still listed so the treasurer can see what's outstanding.
  offlineSnap.docs.forEach((doc) => {
    const d = doc.data();
    const status = String(d.status || 'pending');
    if (status === 'rejected') return;
    const memberId: string | undefined = d.memberId || undefined;
    if (!memberId) return;
    const info = memberInfoMap.get(memberId);
    const rsvpDoc = rsvpByMemberId.get(memberId);
    const rsvpData = rsvpDoc?.data();
    const quantity = Number(d.quantity) || 1;
    const amountCents = Number(d.amount) || 0;
    const submittedAt = d.submittedAt
      ? typeof d.submittedAt === 'string'
        ? d.submittedAt
        : d.submittedAt.toDate?.().toISOString?.() || ''
      : '';
    rows.push({
      id: doc.id,
      kind: 'member',
      source: 'offline_payment',
      orderId: doc.id,
      name: info?.name || rsvpData?.memberName || 'Member',
      email: info?.email || '',
      phone: null,
      status: rsvpData?.status || 'going',
      paymentStatus: status === 'approved' ? 'paid' : 'pending_offline',
      quantity,
      amountCents,
      tierId: d.tierId || rsvpData?.tierId || null,
      createdAt: submittedAt,
      checkedIn: !!rsvpData?.checkedIn,
      checkedInAt: rsvpData?.checkedInAt || null,
      memberId,
      rsvpId: rsvpDoc?.id || null,
    });
    memberOrderIds.add(memberId);
  });

  // 3. Member RSVPs without any order — free claims via /rsvp endpoint.
  rsvpByMemberId.forEach((doc, memberId) => {
    if (memberOrderIds.has(memberId)) return;
    const d = doc.data();
    const info = memberInfoMap.get(memberId);
    const paid = Number(d.paidAmount) || 0;
    rows.push({
      id: doc.id,
      kind: 'member',
      source: 'rsvp',
      orderId: null,
      name: info?.name || d.memberName || 'Member',
      email: info?.email || '',
      phone: null,
      status: d.status || 'going',
      paymentStatus: paid > 0 ? 'paid' : d.paymentStatus || 'free',
      quantity: Number(d.quantity) || 1,
      amountCents: paid,
      tierId: d.tierId || null,
      createdAt: String(d.createdAt || ''),
      checkedIn: !!d.checkedIn,
      checkedInAt: d.checkedInAt || null,
      memberId,
      rsvpId: doc.id,
    });
  });

  // 4. Guest RSVPs without any transaction — free guest tickets / legacy data.
  //    We dedupe by (eventId, lowercase email) — repeated docs for the same
  //    email (from the legacy free-checkout bug) collapse into one row so
  //    the count isn't inflated.
  const emittedGuestEmails = new Set<string>();
  guestSnap.docs.forEach((doc) => {
    const d = doc.data();
    const email = String(d.email || '').toLowerCase();
    if (email && guestOrderEmails.has(email)) return;
    if (guestOrderDocIds.has(doc.id)) return;
    if (email) {
      if (emittedGuestEmails.has(email)) return;
      emittedGuestEmails.add(email);
    }
    const paid = Number(d.paidAmount) || 0;
    rows.push({
      id: doc.id,
      kind: 'guest',
      source: 'guest_rsvp',
      orderId: null,
      name: d.name || 'Guest',
      email: d.email || '',
      phone: d.phone || null,
      status: d.status || 'going',
      paymentStatus: paid > 0 ? 'paid' : d.paymentStatus || 'free',
      quantity: Number(d.quantity) || 1,
      amountCents: paid,
      tierId: d.tierId || null,
      createdAt: String(d.createdAt || ''),
      checkedIn: !!d.checkedIn,
      checkedInAt: d.checkedInAt || null,
      invitedBy: d.invitedByName || d.invitedBy || null,
      notes: d.notes || null,
      rsvpId: doc.id,
    });
  });

  // Sort most-recent first
  rows.sort((a, b) =>
    String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
  );

  // ── Totals ──
  const distinctMembers = new Set<string>();
  const distinctGuests = new Set<string>();
  const checkedInMembers = new Set<string>();
  const checkedInGuests = new Set<string>();
  let totalTickets = 0;
  let totalRevenue = 0;
  rows.forEach((r) => {
    totalTickets += r.quantity || 0;
    if (r.paymentStatus === 'paid') totalRevenue += r.amountCents || 0;
    if (r.kind === 'member') {
      const key = r.memberId || r.rsvpId || r.id;
      distinctMembers.add(key);
      if (r.checkedIn) checkedInMembers.add(key);
    } else {
      const key = (r.email || '').toLowerCase() || r.rsvpId || r.id;
      distinctGuests.add(key);
      if (r.checkedIn) checkedInGuests.add(key);
    }
  });

  const totals: AttendeeTotals = {
    members: distinctMembers.size,
    guests: distinctGuests.size,
    tickets: totalTickets,
    revenueCents: totalRevenue,
    checkedIn: checkedInMembers.size + checkedInGuests.size,
    totalAttendees: distinctMembers.size + distinctGuests.size,
    orderCount: rows.length,
  };

  return { rows, totals };
}
