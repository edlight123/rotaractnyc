'use client';

import { useState, useEffect, useCallback } from 'react';
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

// ─── Generic hooks ───

/** Subscribe to a Firestore collection with real-time updates */
export function useCollection<T = DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
  enabled = true,
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const q = query(collection(getDb(), collectionName), ...constraints);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as T));
        setData(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(`Error fetching ${collectionName}:`, err);
        setError(err.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, enabled]);

  return { data, loading, error };
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
          setData({ id: snap.id, ...snap.data() } as T);
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

export function useEvents(visibility: string[] = ['public', 'members', 'both']) {
  return useCollection('events', [
    where('visibility', 'in', visibility),
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

export function useRsvps(eventId: string | null) {
  return useCollection(
    'rsvps',
    eventId ? [where('eventId', '==', eventId)] : [],
    !!eventId,
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
