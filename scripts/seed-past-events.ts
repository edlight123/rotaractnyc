/**
 * Create past-event records from the existing public photo albums, so the
 * /events "Past" tab reflects the club's history (socials, service days, galas).
 * The photos already live in the `gallery`/`albums` collections — this only
 * adds the matching `events` docs and links each album via `album.eventId`.
 *
 * The RCUN Gala 2026 album is linked to the Gala event that already exists
 * (no duplicate created).
 *
 * Idempotent: an event is created only if its slug doesn't already exist;
 * album links are always refreshed.
 *
 *   npx tsx scripts/seed-past-events.ts
 */
import { getDb } from './seedFirestore';

const db = getDb();

type EventType = 'free' | 'paid' | 'service' | 'hybrid';

/** Per-album event metadata, keyed by the album's slug. */
const ALBUM_EVENTS: Record<
  string,
  { title: string; type: EventType; description: string; tags: string[] } | { linkExistingSlug: string }
> = {
  'gala-2026': { linkExistingSlug: 'fundraiser-gala-30th-year-celebration' },
  'rotary-day-of-service': {
    title: 'Rotary Day of Service',
    type: 'service',
    description:
      'Rotaractors joined fellow Rotary members for a day of hands-on community service across New York City — giving back together in the spirit of Service Above Self.',
    tags: ['service', 'community', 'rotary'],
  },
  'pickleball-2025': {
    title: 'Pickleball Social',
    type: 'free',
    description:
      'An afternoon of friendly competition and fellowship on the pickleball courts — one of our favorite ways to connect, stay active, and welcome new faces to the club.',
    tags: ['social', 'fellowship', 'sports'],
  },
  'the-door-visit': {
    title: 'The Door — Youth Service Visit',
    type: 'service',
    description:
      'Members volunteered with The Door, supporting programs that empower New York City youth with the resources and mentorship they need to thrive.',
    tags: ['service', 'youth', 'community'],
  },
  'gala-2025': {
    title: 'RCUN Gala 2025',
    type: 'paid',
    description:
      'Our annual gala — an evening of celebration, connection, and fundraising in support of the causes at the heart of our club’s mission.',
    tags: ['gala', 'fundraiser', 'fellowship'],
  },
  'rotaract-reception-2022': {
    title: 'Rotaract Reception 2022',
    type: 'free',
    description:
      'A welcome reception bringing together members, alumni, and friends of the club for an evening of fellowship and connection.',
    tags: ['social', 'reception', 'fellowship'],
  },
  'penta-fundraiser-2024': {
    title: 'Penta Fundraiser 2024',
    type: 'paid',
    description:
      'A community fundraiser rallying members and supporters behind our service initiatives for the year.',
    tags: ['fundraiser', 'community'],
  },
  'henry-street-settlement': {
    title: 'Henry Street Settlement Service Day',
    type: 'service',
    description:
      'Rotaractors volunteered with the Henry Street Settlement, supporting one of New York City’s longtime social-service organizations serving Lower East Side families.',
    tags: ['service', 'community'],
  },
};

async function albumCoverUrl(albumId: string, coverPhotoUrl?: string): Promise<string> {
  if (coverPhotoUrl) return coverPhotoUrl;
  const first = await db
    .collection('gallery')
    .where('albumId', '==', albumId)
    .orderBy('order', 'asc')
    .limit(1)
    .get();
  return first.empty ? '' : first.docs[0].data().url || '';
}

async function main() {
  const albums = await db.collection('albums').get();
  const now = new Date().toISOString();
  let created = 0;
  let linked = 0;
  let skipped = 0;

  for (const albumDoc of albums.docs) {
    const album = albumDoc.data();
    const meta = ALBUM_EVENTS[album.slug];
    if (!meta) {
      console.log(`  – no mapping for album "${album.slug}", skipping`);
      skipped++;
      continue;
    }

    // Albums that map to an already-existing event: just link them.
    if ('linkExistingSlug' in meta) {
      const ev = await db.collection('events').where('slug', '==', meta.linkExistingSlug).limit(1).get();
      if (!ev.empty) {
        await albumDoc.ref.update({ eventId: ev.docs[0].id });
        console.log(`  ↔ linked album "${album.slug}" → existing event "${meta.linkExistingSlug}"`);
        linked++;
      } else {
        console.log(`  ! existing event "${meta.linkExistingSlug}" not found for album "${album.slug}"`);
      }
      continue;
    }

    const slug = album.slug; // reuse album slug for a clean, stable event URL
    const existing = await db.collection('events').where('slug', '==', slug).limit(1).get();
    let eventId: string;

    if (!existing.empty) {
      eventId = existing.docs[0].id;
      console.log(`  = event "${slug}" already exists, refreshing album link`);
    } else {
      const imageURL = await albumCoverUrl(albumDoc.id, album.coverPhotoUrl);
      const ref = db.collection('events').doc();
      eventId = ref.id;
      await ref.set({
        title: meta.title,
        slug,
        description: meta.description,
        date: album.date, // album date = event date
        endDate: null,
        time: '',
        endTime: null,
        location: 'New York, NY',
        address: null,
        type: meta.type,
        pricing: null,
        imageURL: imageURL || null,
        tags: meta.tags,
        capacity: null,
        attendeeCount: 0,
        isPublic: true,
        status: 'published',
        committeeId: null,
        acceptsDonations: false,
        fundraisingGoalCents: null,
        donationsTotalCents: 0,
        donationsCount: 0,
        isRecurring: false,
        recurrence: null,
        recurrenceParentId: null,
        occurrenceIndex: null,
        createdBy: 'seed-script',
        createdAt: now,
        updatedAt: now,
      });
      console.log(`  + created past event "${meta.title}" (${album.date?.slice(0, 10)})`);
      created++;
    }

    await albumDoc.ref.update({ eventId });
  }

  console.log(`\n✓ Done. Created ${created}, linked ${linked}, skipped ${skipped}.`);
  process.exit(0);
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
