/**
 * Document library CRUD operations (server-side).
 */
import { adminDb } from '@/lib/firebase/admin';
import type { PortalDocument, DocumentCategory } from '@/types';
import { DOCUMENT_CATEGORIES } from '@/types';

const COLLECTION = 'documents';

export async function getDocuments(category?: DocumentCategory): Promise<PortalDocument[]> {
  let q: FirebaseFirestore.Query = adminDb.collection(COLLECTION);
  if (category) q = q.where('category', '==', category);
  q = q.orderBy('createdAt', 'desc');
  const snap = await q.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PortalDocument));
}

export async function getPinnedDocuments(): Promise<PortalDocument[]> {
  const snap = await adminDb
    .collection(COLLECTION)
    .where('pinned', '==', true)
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PortalDocument));
}

export async function getDocument(id: string): Promise<PortalDocument | null> {
  const doc = await adminDb.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as PortalDocument;
}

export async function createDocument(data: Omit<PortalDocument, 'id'>): Promise<string> {
  const ref = await adminDb.collection(COLLECTION).add({
    ...data,
    pinned: data.pinned ?? false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function updateDocument(id: string, data: Partial<PortalDocument>): Promise<void> {
  await adminDb.collection(COLLECTION).doc(id).update({
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function pinDocument(id: string, pinned: boolean): Promise<void> {
  await updateDocument(id, { pinned } as Partial<PortalDocument>);
}

export async function deleteDocument(id: string): Promise<void> {
  await adminDb.collection(COLLECTION).doc(id).delete();
}

export async function getDocumentCategories(): Promise<DocumentCategory[]> {
  const docs = await getDocuments();
  const categories = new Set(docs.map((d) => d.category));
  // Return only categories that have docs, in the canonical order
  return DOCUMENT_CATEGORIES.filter((c) => categories.has(c));
}
