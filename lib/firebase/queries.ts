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
  defaultTestimonials,
} from '@/lib/defaults/data';
import type {
  RotaractEvent,
  Article,
  BoardMember,
  GalleryImage,
  PhotoAlbum,
  Testimonial,
  ImpactStat,
} from '@/types';
import { IMPACT_STATS } from '@/lib/constants';

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
      return membersSnap.docs
        .map((d) => {
          const m = d.data();
          // boardTitle comes from the Rotaract charter predefined list;
          // fall back to role-based label if not yet assigned.
          const title =
            m.boardTitle ||
            (m.role === 'president'
              ? 'President'
              : m.role === 'treasurer'
              ? 'Treasurer'
              : m.committee || 'Board Member');
          return {
            id: d.id,
            name: m.displayName || `${m.firstName || ''} ${m.lastName || ''}`.trim(),
            title,
            photoURL: m.photoURL || '',
            bio: m.bio || '',
            linkedIn: m.linkedIn || '',
            order: typeof m.boardOrder === 'number' ? m.boardOrder : 999,
          } as BoardMember;
        })
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
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

// ---- Hero Slides ----

export interface HeroSlide {
  id: string;
  url: string;
  storagePath: string;
  order: number;
  createdAt: string;
}

export async function getHeroSlides(): Promise<HeroSlide[]> {
  try {
    // Tier 1: explicit hero slides from site_media
    const snap = await adminDb
      .collection('site_media')
      .where('section', '==', 'hero')
      .orderBy('order', 'asc')
      .get();

    if (!snap.empty) {
      return snap.docs.map((d) => serializeDoc({ id: d.id, ...d.data() }) as HeroSlide);
    }

    // Tier 2: auto-populate from album photos (2 per album, most liked first)
    return await getHeroPhotosFromAlbums();
  } catch (e) {
    console.error('getHeroSlides error:', e);
    return [];
  }
}

/**
 * Picks up to 2 photos per public album for the hero slideshow.
 *
 * Selection priority per album:
 *   1. Most liked photos (community favourites)
 *   2. isFeatured photos
 *   3. First photos by order
 */
async function getHeroPhotosFromAlbums(perAlbum = 2): Promise<HeroSlide[]> {
  try {
    const albumSnap = await adminDb
      .collection('albums')
      .where('isPublic', '==', true)
      .orderBy('date', 'desc')
      .limit(10)
      .get();

    if (albumSnap.empty) return [];

    const picks: HeroSlide[] = [];
    let order = 0;

    for (const albumDoc of albumSnap.docs) {
      const albumId = albumDoc.id;
      const chosen: GalleryImage[] = [];

      // Try most-liked first
      try {
        const likedSnap = await adminDb
          .collection('gallery')
          .where('albumId', '==', albumId)
          .where('likes', '>=', 1)
          .orderBy('likes', 'desc')
          .limit(perAlbum)
          .get();
        likedSnap.docs.forEach((d) =>
          chosen.push(serializeDoc({ id: d.id, ...d.data() }) as GalleryImage)
        );
      } catch { /* index may not exist yet */ }

      // Fill remaining with featured photos
      if (chosen.length < perAlbum) {
        const chosenIds = new Set(chosen.map((p) => p.id));
        try {
          const featSnap = await adminDb
            .collection('gallery')
            .where('albumId', '==', albumId)
            .where('isFeatured', '==', true)
            .orderBy('order', 'asc')
            .limit(perAlbum)
            .get();
          featSnap.docs.forEach((d) => {
            if (chosen.length < perAlbum && !chosenIds.has(d.id)) {
              chosen.push(serializeDoc({ id: d.id, ...d.data() }) as GalleryImage);
              chosenIds.add(d.id);
            }
          });
        } catch { /* index may not exist yet */ }
      }

      // Final fallback: first photos by order
      if (chosen.length < perAlbum) {
        const chosenIds = new Set(chosen.map((p) => p.id));
        const fallSnap = await adminDb
          .collection('gallery')
          .where('albumId', '==', albumId)
          .orderBy('order', 'asc')
          .limit(perAlbum + chosen.length)
          .get();
        fallSnap.docs.forEach((d) => {
          if (chosen.length < perAlbum && !chosenIds.has(d.id)) {
            chosen.push(serializeDoc({ id: d.id, ...d.data() }) as GalleryImage);
          }
        });
      }

      // Convert to HeroSlide shape
      for (const photo of chosen) {
        picks.push({
          id: photo.id,
          url: photo.url,
          storagePath: photo.storagePath || '',
          order: order++,
          createdAt: photo.createdAt,
        });
      }
    }

    return picks;
  } catch (e) {
    console.error('getHeroPhotosFromAlbums error:', e);
    return [];
  }
}

// ---- Photo Albums ----

export async function getPublicAlbums(): Promise<PhotoAlbum[]> {
  try {
    const snap = await adminDb
      .collection('albums')
      .where('isPublic', '==', true)
      .orderBy('date', 'desc')
      .get();

    if (snap.empty) return [];
    return snap.docs.map((d) => serializeDoc({ id: d.id, ...d.data() }) as PhotoAlbum);
  } catch (e) {
    console.error('getPublicAlbums error:', e);
    return [];
  }
}

export async function getAlbumBySlug(slug: string): Promise<PhotoAlbum | null> {
  try {
    const snap = await adminDb
      .collection('albums')
      .where('slug', '==', slug)
      .limit(1)
      .get();

    if (snap.empty) return null;
    return serializeDoc({ id: snap.docs[0].id, ...snap.docs[0].data() }) as PhotoAlbum;
  } catch {
    return null;
  }
}

export async function getAlbumPhotos(albumId: string, limit?: number): Promise<GalleryImage[]> {
  try {
    let query: FirebaseFirestore.Query = adminDb
      .collection('gallery')
      .where('albumId', '==', albumId)
      .orderBy('order', 'asc');

    if (limit) query = query.limit(limit);

    const snap = await query.get();
    return snap.docs.map((d) => serializeDoc({ id: d.id, ...d.data() }) as GalleryImage);
  } catch (e) {
    console.error('getAlbumPhotos error:', e);
    return [];
  }
}

/**
 * Returns up to `limit` photos for the public homepage carousel.
 *
 * Tier 1 — liked photos ordered by likes desc (most community love first).
 * Tier 2 — isFeatured photos fill any remaining slots so the carousel is
 *           always populated from day one, before likes accumulate.
 *
 * As members like photos, tier-2 placeholders are naturally pushed out.
 */
export async function getCarouselPhotos(limit = 10): Promise<GalleryImage[]> {
  try {
    // Tier 1: top liked photos
    const likedSnap = await adminDb
      .collection('gallery')
      .where('likes', '>=', 1)
      .orderBy('likes', 'desc')
      .limit(limit)
      .get();

    const liked = likedSnap.docs.map((d) => serializeDoc({ id: d.id, ...d.data() }) as GalleryImage);

    if (liked.length >= limit) return liked;

    // Tier 2: fill remaining slots with featured photos not already shown
    const likedIds = new Set(liked.map((p) => p.id));
    const needed   = limit - liked.length;

    const featSnap = await adminDb
      .collection('gallery')
      .where('isFeatured', '==', true)
      .orderBy('order', 'asc')
      .limit(needed + liked.length) // slight over-fetch to account for any overlap
      .get();

    const featured = featSnap.docs
      .map((d) => serializeDoc({ id: d.id, ...d.data() }) as GalleryImage)
      .filter((p) => !likedIds.has(p.id))
      .slice(0, needed);

    return [...liked, ...featured];
  } catch (e) {
    console.error('getCarouselPhotos error:', e);
    // Final fallback: grab any recent gallery photos
    try {
      const snap = await adminDb
        .collection('gallery')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
      return snap.docs.map((d) => serializeDoc({ id: d.id, ...d.data() }) as GalleryImage);
    } catch {
      return [];
    }
  }
}

// ---- Testimonials ----

export async function getTestimonials(): Promise<Testimonial[]> {
  try {
    const snap = await adminDb
      .collection('testimonials')
      .where('isActive', '==', true)
      .orderBy('order', 'asc')
      .get();

    if (snap.empty) return defaultTestimonials;
    return snap.docs.map((d) => serializeDoc({ id: d.id, ...d.data() }) as Testimonial);
  } catch (e) {
    console.error('getTestimonials error:', e);
    return defaultTestimonials;
  }
}

// ---- Impact Stats ----

export async function getImpactStats(): Promise<ImpactStat[]> {
  try {
    const doc = await adminDb.collection('settings').doc('site').get();
    if (doc.exists) {
      const data = doc.data();
      if (data?.impactStats && Array.isArray(data.impactStats) && data.impactStats.length > 0) {
        return data.impactStats as ImpactStat[];
      }
    }
    return [...IMPACT_STATS];
  } catch (e) {
    console.error('getImpactStats error:', e);
    return [...IMPACT_STATS];
  }
}


