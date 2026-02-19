/**
 * Server-side Firestore query helpers.
 * Used by public pages to fetch data with fallback to defaults.
 */
import { adminDb, serializeDoc } from './admin';
import {
  defaultEvents,
  defaultArticles,
  defaultBoard,
  defaultGallery,
} from '@/lib/defaults/data';
import type {
  RotaractEvent,
  Article,
  BoardMember,
  GalleryImage,
} from '@/types';

// ---- Events ----

export async function getPublicEvents(): Promise<RotaractEvent[]> {
  try {
    const snap = await adminDb
      .collection('events')
      .where('isPublic', '==', true)
      .where('status', '==', 'published')
      .orderBy('date', 'asc')
      .get();

    if (snap.empty) return defaultEvents;
    return snap.docs.map((d) => serializeDoc({ id: d.id, ...d.data() }) as RotaractEvent);
  } catch (e) {
    console.error('getPublicEvents error:', e);
    return defaultEvents;
  }
}

export async function getEventBySlug(slug: string): Promise<RotaractEvent | null> {
  try {
    const snap = await adminDb
      .collection('events')
      .where('slug', '==', slug)
      .where('isPublic', '==', true)
      .limit(1)
      .get();

    if (!snap.empty) {
      return serializeDoc({ id: snap.docs[0].id, ...snap.docs[0].data() }) as RotaractEvent;
    }
    // fallback
    return defaultEvents.find((e) => e.slug === slug) ?? null;
  } catch {
    return defaultEvents.find((e) => e.slug === slug) ?? null;
  }
}

// ---- Articles ----

export async function getPublishedArticles(): Promise<Article[]> {
  try {
    const snap = await adminDb
      .collection('articles')
      .where('isPublished', '==', true)
      .orderBy('publishedAt', 'desc')
      .get();

    if (snap.empty) return defaultArticles;
    return snap.docs.map((d) => serializeDoc({ id: d.id, ...d.data() }) as Article);
  } catch (e) {
    console.error('getPublishedArticles error:', e);
    return defaultArticles;
  }
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  try {
    const snap = await adminDb
      .collection('articles')
      .where('slug', '==', slug)
      .where('isPublished', '==', true)
      .limit(1)
      .get();

    if (!snap.empty) {
      return serializeDoc({ id: snap.docs[0].id, ...snap.docs[0].data() }) as Article;
    }
    return defaultArticles.find((a) => a.slug === slug) ?? null;
  } catch {
    return defaultArticles.find((a) => a.slug === slug) ?? null;
  }
}

// ---- Board / Leadership ----

export async function getBoardMembers(): Promise<BoardMember[]> {
  try {
    const snap = await adminDb
      .collection('settings')
      .doc('board')
      .get();

    if (snap.exists) {
      const data = snap.data();
      if (data?.members && Array.isArray(data.members) && data.members.length > 0) {
        return (data.members as BoardMember[]).map((m) => serializeDoc(m) as BoardMember);
      }
    }

    // Alternative: members collection with board/president roles
    const membersSnap = await adminDb
      .collection('members')
      .where('role', 'in', ['board', 'president', 'treasurer'])
      .where('status', '==', 'active')
      .orderBy('displayName')
      .get();

    if (!membersSnap.empty) {
      return membersSnap.docs.map((d, i) => {
        const m = d.data();
        return {
          id: d.id,
          name: m.displayName || `${m.firstName || ''} ${m.lastName || ''}`.trim(),
          title: m.role === 'president' ? 'President' : m.role === 'treasurer' ? 'Treasurer' : m.committee || 'Board Member',
          photoURL: m.photoURL || '',
          linkedIn: m.linkedIn || '',
          order: i + 1,
        } as BoardMember;
      });
    }

    return defaultBoard;
  } catch (e) {
    console.error('getBoardMembers error:', e);
    return defaultBoard;
  }
}

// ---- Gallery ----

export async function getGalleryImages(): Promise<GalleryImage[]> {
  try {
    const snap = await adminDb
      .collection('gallery')
      .orderBy('createdAt', 'desc')
      .limit(24)
      .get();

    if (snap.empty) return defaultGallery;
    return snap.docs.map((d) => serializeDoc({ id: d.id, ...d.data() }) as GalleryImage);
  } catch (e) {
    console.error('getGalleryImages error:', e);
    return defaultGallery;
  }
}
