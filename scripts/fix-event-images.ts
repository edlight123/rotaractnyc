/** Reassign distinct, topic-matched photos to events that share a category-album cover.
 *  Recurring series (Neighborhood Supper) is left untouched. Read-only unless --apply. */
import { getDb } from './seedFirestore';
const db = getDb();
const APPLY = process.argv.includes('--apply');

// event slug -> category album slug to draw a distinct photo from
const GROUPS: Record<string, string[]> = {
  'community-service': [
    'epic-day-of-service-2026-05',
    'walk-to-end-alzheimer-s-2025-11',
    'recycling-with-sure-we-can-2025-04',
    'nyc-parks-it-s-my-park-cleanup-2025-03',
    'holiday-toy-drive-2024-12',
    'volunteering-with-alliance-for-positive-change-2024-11',
  ],
  'socials': ['holiday-social-2025-12', 'summer-rooftop-social-2025-08', 'holiday-party-2024-12'],
  'meetings': ['general-meeting-new-member-induction-2024-11', 'world-mental-health-day-wellness-session-2024-10'],
  'food-pantry': ['monthly-food-pantry-holiday-edition-2024-12', 'monthly-food-pantry-thanksgiving-edition-2024-11'],
};

async function albumPhotos(albumSlug: string): Promise<string[]> {
  const a = await db.collection('albums').where('slug', '==', albumSlug).limit(1).get();
  if (a.empty) throw new Error(`album ${albumSlug} not found`);
  const g = await db.collection('gallery').where('albumId', '==', a.docs[0].id).get();
  const photos = g.docs
    .map((d) => ({ url: d.data().url as string, order: d.data().order ?? 9999 }))
    .filter((p) => p.url)
    .sort((x, y) => x.order - y.order);
  // Keep only ONE photo per capture "scene" (same minute = burst frames that look
  // identical), so distinct events get visually different images, not near-dupes.
  const scene = (url: string) => {
    const m = url.split('?')[0].match(/PHOTO-(\d{4}-\d{2}-\d{2}-\d{2}-\d{2})/);
    return m ? m[1] : url.split('?')[0];
  };
  const seenScene = new Set<string>();
  const out: string[] = [];
  for (const p of photos) {
    const k = scene(p.url);
    if (seenScene.has(k)) continue;
    seenScene.add(k);
    out.push(p.url);
  }
  return out;
}

async function eventBySlug(slug: string) {
  const s = await db.collection('events').where('slug', '==', slug).limit(1).get();
  return s.empty ? null : s.docs[0];
}

async function main() {
  // reserve images already used by recurring events so we don't collide with them
  const recur = await db.collection('events').where('isRecurring', '==', true).get();
  const reserved = new Set<string>();
  recur.forEach((d) => { if (d.data().imageURL) reserved.add(d.data().imageURL); });

  const used = new Set<string>(reserved);
  let changed = 0;
  for (const [album, slugs] of Object.entries(GROUPS)) {
    const pool = (await albumPhotos(album)).filter((u) => !reserved.has(u));
    console.log(`\n▶ ${album}: ${pool.length} distinct photos available for ${slugs.length} events`);
    let pi = 0;
    for (const slug of slugs) {
      const ev = await eventBySlug(slug);
      if (!ev) { console.log(`   ! event not found: ${slug}`); continue; }
      // next unused photo
      while (pi < pool.length && used.has(pool[pi])) pi++;
      if (pi >= pool.length) { console.log(`   ! ran out of photos for ${slug}`); continue; }
      const url = pool[pi++]; used.add(url);
      const short = url.replace(/^https?:\/\/[^/]+\//, '…/').replace(/\?.*$/, '');
      console.log(`   ${APPLY ? '✔' : '·'} ${ev.data().title}  →  ${short}`);
      if (APPLY) await ev.ref.update({ imageURL: url, updatedAt: new Date().toISOString() });
      changed++;
    }
  }
  console.log(`\n${APPLY ? 'Applied' : 'Would change'} ${changed} events.${APPLY ? '' : '  (run with --apply)'}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
