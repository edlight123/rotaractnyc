'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  type QueryConstraint,
  type DocumentData,
} from 'firebase/firestore';
import { db as getDb } from '@/lib/firebase/client';
import { Timestamp } from 'firebase/firestore';

// ─── Helpers ───

/**
 * Recursively convert Firestore Timestamp fields to ISO strings.
 */
function serialiseTimestamps<T>(obj: T): T {
  if (obj == null) return obj;
  if (obj instanceof Timestamp) return obj.toDate().toISOString() as T;
  const objRecord = obj as Record<string, unknown>;
  if (objRecord.toDate && typeof objRecord.toDate === 'function') {
    return (objRecord.toDate() as Date).toISOString() as T;
  }
  if (Array.isArray(obj)) return obj.map(serialiseTimestamps) as T;
  if (typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      out[key] = serialiseTimestamps((obj as Record<string, unknown>)[key]);
    }
    return out as T;
  }
  return obj;
}

export type LoadingState = 'idle' | 'loading' | 'loaded' | 'error';

/** Subscribe to a Firestore collection with real-time updates */
export function useCollection<T = DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
  enabled = true,
) {
  const [data, setData] = useState<T[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);

  // Serialize constraints to a stable string key so the effect re-runs
  // when filters change, without causing infinite loops from object identity.
  const constraintKey = useMemo(() => {
    return constraints
      .map((c) => {
        const constraint = c as unknown as Record<string, unknown>;
        return `${String(constraint.type)}:${String(constraint._field ?? '')}:${JSON.stringify(constraint._value ?? constraint._direction ?? constraint._limit ?? '')}`;
      })
      .join('||');
  }, [constraints]);

  useEffect(() => {
    if (!enabled) {
      setLoadingState('idle');
      return;
    }

    setLoadingState('loading');

    const q = query(collection(getDb(), collectionName), ...constraints);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => serialiseTimestamps({ id: d.id, ...d.data() }) as T);
        setData(items);
        setLoadingState('loaded');
        setError(null);
      },
      (err) => {
        console.error(`Error fetching ${collectionName}:`, err);
        setError(err.message);
        setLoadingState('error');
      },
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, enabled, constraintKey]);

  return { data, loading: loadingState === 'loading', loadingState, error };
}

/** Fetch a single Firestore document */
export function useDocument<T = DocumentData>(
  collectionName: string,
  docId: string | null,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!docId) {
      setLoading(false);
      return;
    }

    const docRef = doc(getDb(), collectionName, docId);
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          setData(serialiseTimestamps({ id: snap.id, ...snap.data() }) as T);
        } else {
          setData(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error(`Error fetching ${collectionName}/${docId}:`, err);
        setError(err.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [collectionName, docId]);

  return { data, loading, error };
}

// ─── Domain-specific hooks ───

export function useEvents() {
  return useCollection('events', [
    where('status', '==', 'published'),
    where('isPublic', '==', true),
    orderBy('date', 'desc'),
    limit(30),
  ]);
}

export function usePortalEvents() {
  return useCollection('events', [
    orderBy('date', 'desc'),
    limit(30),
  ]);
}

export function useArticles(onlyPublished = true) {
  const constraints = onlyPublished
    ? [where('isPublished', '==', true), orderBy('publishedAt', 'desc'), limit(20)]
    : [orderBy('publishedAt', 'desc'), limit(20)];
  return useCollection('articles', constraints);
}

export function useGallery() {
  return useCollection('gallery', [orderBy('createdAt', 'desc'), limit(50)]);
}

export function usePosts() {
  return useCollection('posts', [orderBy('createdAt', 'desc'), limit(30)]);
}

export function useMembers(activeOnly = true) {
  const constraints = activeOnly
    ? [where('status', '==', 'active'), orderBy('displayName')]
    : [where('status', '==', 'alumni'), orderBy('displayName')];
  return useCollection('members', constraints);
}

export function useAllMembers() {
  return useCollection('members', [orderBy('displayName')]);
}

/**
 * usePendingMembers — members awaiting approval (status === 'pending').
 *
 * Gated by `enabled` so only admins subscribe; powers the Directory nav
 * count badge and the pinned pending-approvals banner.
 */
export function usePendingMembers(enabled = true) {
  return useCollection('members', [where('status', '==', 'pending')], enabled);
}

export function useServiceHours(memberId: string | null) {
  return useCollection(
    'serviceHours',
    memberId ? [where('memberId', '==', memberId), orderBy('createdAt', 'desc'), limit(50)] : [],
    !!memberId,
  );
}

export function useMessages(recipientId: string | null) {
  return useCollection(
    'messages',
    recipientId ? [where('recipientId', '==', recipientId), orderBy('createdAt', 'desc'), limit(50)] : [],
    !!recipientId,
  );
}

export function useDocuments() {
  return useCollection('documents', [orderBy('createdAt', 'desc')]);
}

// No orderBy constraint — documents missing the `order` field are excluded by
// Firestore ordered queries. Client-side sort in the page handles ordering.
export function useDocumentFolders() {
  return useCollection('documentFolders', []);
}

export function useCommittees() {
  return useCollection('committees', [orderBy('name', 'asc')]);
}

export function useCommitteeDocuments(committeeId: string | null) {
  return useCollection(
    'documents',
    committeeId ? [where('committeeId', '==', committeeId), orderBy('createdAt', 'desc')] : [],
    !!committeeId,
  );
}

export function useCommitteePosts(committeeId: string | null) {
  return useCollection(
    'posts',
    committeeId
      ? [where('committeeId', '==', committeeId), orderBy('createdAt', 'desc'), limit(30)]
      : [],
    !!committeeId,
  );
}

export function useRsvps(eventId: string | null) {
  return useCollection(
    'rsvps',
    eventId ? [where('eventId', '==', eventId)] : [],
    !!eventId,
  );
}

/**
 * Real-time subscription to guest RSVPs for an event. Reads are gated to
 * board+ by Firestore rules, so callers should pass `enabled` only for
 * authorised users (otherwise the snapshot listener will error out).
 */
export function useGuestRsvps(eventId: string | null, enabled = true) {
  return useCollection(
    'guest_rsvps',
    eventId ? [where('eventId', '==', eventId), orderBy('createdAt', 'desc')] : [],
    !!eventId && enabled,
  );
}

export function useMemberRsvps(memberId: string | null) {
  return useCollection(
    'rsvps',
    memberId ? [where('memberId', '==', memberId), orderBy('createdAt', 'desc'), limit(50)] : [],
    !!memberId,
  );
}

// ─── API helpers (call server-side API routes) ───

export async function apiPost<T = any>(url: string, body: Record<string, any>): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export async function apiPatch<T = any>(url: string, body: Record<string, any>): Promise<T> {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export async function apiGet<T = any>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export async function apiDelete<T = any>(url: string): Promise<T> {
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}
