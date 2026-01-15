/**
 * Firestore helper utilities for the Members Portal
 * 
 * These functions provide type-safe CRUD operations for portal collections
 * using the Firebase Admin SDK (server-side only).
 */

import { getFirebaseAdminApp } from '@/lib/firebase/admin';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import {
  User,
  Event,
  Announcement,
  Document,
  Transaction,
  MonthlySummary,
  CreateUser,
  CreateEvent,
  CreateAnnouncement,
  CreateDocument,
  CreateTransaction,
  CreateMonthlySummary,
  UpdateUser,
  UpdateEvent,
  UpdateAnnouncement,
  UpdateDocument,
  UpdateTransaction,
  UpdateMonthlySummary,
} from '@/types/portal';

function getDb() {
  const app = getFirebaseAdminApp();
  if (!app) throw new Error('Firebase Admin not initialized');
  return getFirestore(app);
}

// Helper to convert Firestore Timestamp to our Timestamp type
function convertTimestamps(data: any): any {
  const converted = { ...data };
  for (const [key, value] of Object.entries(converted)) {
    if (value && typeof value === 'object' && '_seconds' in value) {
      const ts = value as any;
      converted[key] = Timestamp.fromMillis(ts._seconds * 1000 + (ts._nanoseconds || 0) / 1000000);
    }
  }
  return converted;
}

// ============================================================================
// Users
// ============================================================================

export async function getUser(uid: string): Promise<User | null> {
  const db = getDb();
  const doc = await db.collection('users').doc(uid).get();
  if (!doc.exists) return null;
  return { uid: doc.id, ...convertTimestamps(doc.data()) } as User;
}

export async function getActiveUsers(): Promise<User[]> {
  const db = getDb();
  const snapshot = await db.collection('users')
    .where('status', '==', 'active')
    .orderBy('name', 'asc')
    .get();
  return snapshot.docs.map(doc => ({
    uid: doc.id,
    ...convertTimestamps(doc.data())
  })) as User[];
}

export async function createUser(uid: string, data: CreateUser): Promise<User> {
  const db = getDb();
  const now = Timestamp.now();
  const userData = {
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  await db.collection('users').doc(uid).set(userData);
  return { uid, ...userData } as User;
}

export async function updateUser(uid: string, data: UpdateUser): Promise<void> {
  const db = getDb();
  await db.collection('users').doc(uid).update({
    ...data,
    updatedAt: Timestamp.now(),
  });
}

// ============================================================================
// Events
// ============================================================================

export async function getEvent(eventId: string): Promise<Event | null> {
  const db = getDb();
  const doc = await db.collection('events').doc(eventId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...convertTimestamps(doc.data()) } as Event;
}

export async function getUpcomingEvents(visibility?: 'public' | 'member' | 'board'): Promise<Event[]> {
  const db = getDb();
  let query = db.collection('events')
    .where('startAt', '>=', Timestamp.now())
    .orderBy('startAt', 'asc');
  
  if (visibility) {
    query = query.where('visibility', '==', visibility) as any;
  }
  
  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...convertTimestamps(doc.data())
  })) as Event[];
}

export async function createEvent(data: CreateEvent): Promise<Event> {
  const db = getDb();
  const now = Timestamp.now();
  const eventData = {
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await db.collection('events').add(eventData);
  return { id: docRef.id, ...eventData } as Event;
}

export async function updateEvent(eventId: string, data: UpdateEvent): Promise<void> {
  const db = getDb();
  await db.collection('events').doc(eventId).update({
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteEvent(eventId: string): Promise<void> {
  const db = getDb();
  // Delete event and all RSVPs
  const batch = db.batch();
  batch.delete(db.collection('events').doc(eventId));
  
  const rsvpsSnapshot = await db.collection('events').doc(eventId).collection('rsvps').get();
  rsvpsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
  
  await batch.commit();
}

// ============================================================================
// Announcements
// ============================================================================

export async function getAnnouncements(visibility?: 'member' | 'board'): Promise<Announcement[]> {
  const db = getDb();
  let query = db.collection('announcements').orderBy('createdAt', 'desc');
  
  if (visibility) {
    query = query.where('visibility', '==', visibility) as any;
  }
  
  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...convertTimestamps(doc.data())
  })) as Announcement[];
}

export async function createAnnouncement(data: CreateAnnouncement): Promise<Announcement> {
  const db = getDb();
  const announcementData = {
    ...data,
    createdAt: Timestamp.now(),
  };
  const docRef = await db.collection('announcements').add(announcementData);
  return { id: docRef.id, ...announcementData } as Announcement;
}

export async function updateAnnouncement(id: string, data: UpdateAnnouncement): Promise<void> {
  const db = getDb();
  await db.collection('announcements').doc(id).update(data);
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const db = getDb();
  await db.collection('announcements').doc(id).delete();
}

// ============================================================================
// Documents
// ============================================================================

export async function getDocuments(visibility?: 'member' | 'board'): Promise<Document[]> {
  const db = getDb();
  let query = db.collection('documents').orderBy('createdAt', 'desc');
  
  if (visibility) {
    query = query.where('visibility', '==', visibility) as any;
  }
  
  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...convertTimestamps(doc.data())
  })) as Document[];
}

export async function createDocument(data: CreateDocument): Promise<Document> {
  const db = getDb();
  const documentData = {
    ...data,
    createdAt: Timestamp.now(),
  };
  const docRef = await db.collection('documents').add(documentData);
  return { id: docRef.id, ...documentData } as Document;
}

export async function updateDocument(id: string, data: UpdateDocument): Promise<void> {
  const db = getDb();
  await db.collection('documents').doc(id).update(data);
}

export async function deleteDocument(id: string): Promise<void> {
  const db = getDb();
  await db.collection('documents').doc(id).delete();
}

// ============================================================================
// Transactions
// ============================================================================

export async function getTransactions(
  month?: string,
  visibility?: 'member' | 'board'
): Promise<Transaction[]> {
  const db = getDb();
  let query = db.collection('transactions').orderBy('date', 'desc');
  
  if (month) {
    const startDate = Timestamp.fromDate(new Date(`${month}-01`));
    const endDate = Timestamp.fromDate(new Date(new Date(`${month}-01`).setMonth(new Date(`${month}-01`).getMonth() + 1)));
    query = query.where('date', '>=', startDate).where('date', '<', endDate) as any;
  }
  
  if (visibility) {
    query = query.where('visibility', '==', visibility) as any;
  }
  
  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...convertTimestamps(doc.data())
  })) as Transaction[];
}

export async function createTransaction(data: CreateTransaction): Promise<Transaction> {
  const db = getDb();
  const transactionData = {
    ...data,
    createdAt: Timestamp.now(),
  };
  const docRef = await db.collection('transactions').add(transactionData);
  return { id: docRef.id, ...transactionData } as Transaction;
}

export async function updateTransaction(id: string, data: UpdateTransaction): Promise<void> {
  const db = getDb();
  await db.collection('transactions').doc(id).update(data);
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = getDb();
  await db.collection('transactions').doc(id).delete();
}

// ============================================================================
// Monthly Summaries
// ============================================================================

export async function getMonthlySummary(month: string): Promise<MonthlySummary | null> {
  const db = getDb();
  const doc = await db.collection('monthlySummaries').doc(month).get();
  if (!doc.exists) return null;
  return convertTimestamps(doc.data()) as MonthlySummary;
}

export async function getMonthlySummaries(limit?: number): Promise<MonthlySummary[]> {
  const db = getDb();
  let query = db.collection('monthlySummaries').orderBy('month', 'desc');
  
  if (limit) {
    query = query.limit(limit) as any;
  }
  
  const snapshot = await query.get();
  return snapshot.docs.map(doc => convertTimestamps(doc.data())) as MonthlySummary[];
}

export async function createOrUpdateMonthlySummary(
  month: string,
  data: CreateMonthlySummary
): Promise<void> {
  const db = getDb();
  await db.collection('monthlySummaries').doc(month).set({
    ...data,
    month,
    updatedAt: Timestamp.now(),
  });
}

export async function updateMonthlySummary(
  month: string,
  data: UpdateMonthlySummary
): Promise<void> {
  const db = getDb();
  await db.collection('monthlySummaries').doc(month).update({
    ...data,
    updatedAt: Timestamp.now(),
  });
}
