/**
 * Event CRUD operations (server-side).
 */
import { adminDb } from '@/lib/firebase/admin';
import type { RotaractEvent, RSVP, RSVPStatus } from '@/types';

const EVENTS = 'events';
const RSVPS = 'rsvps';

// ── Events ──

export async function getEvent(id: string): Promise<RotaractEvent | null> {
  const doc = await adminDb.collection(EVENTS).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as RotaractEvent;
}

export async function getEventBySlug(slug: string): Promise<RotaractEvent | null> {
  const snap = await adminDb
    .collection(EVENTS)
    .where('slug', '==', slug)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as RotaractEvent;
}

export async function getPublicEvents(): Promise<RotaractEvent[]> {
  const snap = await adminDb
    .collection(EVENTS)
    .where('isPublic', '==', true)
    .where('status', '==', 'published')
    .orderBy('date', 'asc')
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RotaractEvent));
}

export async function getUpcomingEvents(limit = 10): Promise<RotaractEvent[]> {
  const snap = await adminDb
    .collection(EVENTS)
    .where('status', '==', 'published')
    .where('date', '>=', new Date().toISOString())
    .orderBy('date', 'asc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RotaractEvent));
}

export async function getAllEvents(): Promise<RotaractEvent[]> {
  const snap = await adminDb.collection(EVENTS).orderBy('date', 'desc').get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RotaractEvent));
}

export async function createEvent(data: Omit<RotaractEvent, 'id'>): Promise<string> {
  const ref = await adminDb.collection(EVENTS).add({
    ...data,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function updateEvent(id: string, data: Partial<RotaractEvent>): Promise<void> {
  await adminDb.collection(EVENTS).doc(id).update({
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteEvent(id: string): Promise<void> {
  await adminDb.collection(EVENTS).doc(id).delete();
}

// ── RSVPs ──

export async function getRSVPs(eventId: string): Promise<RSVP[]> {
  const snap = await adminDb
    .collection(RSVPS)
    .where('eventId', '==', eventId)
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RSVP));
}

export async function getMemberRSVP(eventId: string, memberId: string): Promise<RSVP | null> {
  const snap = await adminDb
    .collection(RSVPS)
    .where('eventId', '==', eventId)
    .where('memberId', '==', memberId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as RSVP;
}

export async function upsertRSVP(data: {
  eventId: string;
  memberId: string;
  memberName: string;
  memberPhoto?: string;
  status: RSVPStatus;
  tierId?: string;
}): Promise<string> {
  const existing = await getMemberRSVP(data.eventId, data.memberId);
  if (existing) {
    await adminDb.collection(RSVPS).doc(existing.id).update({
      status: data.status,
      ...(data.tierId ? { tierId: data.tierId } : {}),
      createdAt: new Date().toISOString(),
    });
    return existing.id;
  }
  const ref = await adminDb.collection(RSVPS).add({
    ...data,
    ...(data.tierId ? { tierId: data.tierId } : {}),
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function getAttendeeCount(eventId: string): Promise<number> {
  const snap = await adminDb
    .collection(RSVPS)
    .where('eventId', '==', eventId)
    .where('status', '==', 'going')
    .count()
    .get();
  return snap.data().count;
}
