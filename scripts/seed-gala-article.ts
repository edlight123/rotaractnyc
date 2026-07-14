/**
 * Seed the "30 Years of Service" news article, adapted from the club's LinkedIn
 * post recapping the 30th-anniversary gala (which supported Elimisha Kakuma).
 *
 * Publishing any real article removes the placeholder default articles that
 * show while the `articles` collection is empty. Cover image is pulled from the
 * existing RCUN Gala 2026 photo album.
 *
 * Idempotent: skips if the slug already exists (FORCE=1 to overwrite).
 *
 *   npx tsx scripts/seed-gala-article.ts
 *   FORCE=1 npx tsx scripts/seed-gala-article.ts
 */
import { getDb } from './seedFirestore';

const db = getDb();

const SLUG = 'celebrating-30-years-of-service';
const GALA_ALBUM_SLUG = 'gala-2026';

const CONTENT = `
<p>This year, the <strong>Rotaract Club at the United Nations</strong> proudly celebrated its 30th anniversary — three decades of service, leadership, fellowship, and community impact. To commemorate this milestone, our anniversary gala brought together Rotaractors, Rotarians, alumni, community partners, friends, and supporters to celebrate our history and advance a cause reflecting the club's founding values.</p>

<p>The event supported <strong>Elimisha Kakuma</strong>, an organization expanding higher-education access for graduates in Kenya's Kakuma Refugee Camp. Founded in 2021 by Mary Maker, Diing Manyang, Dudi Miabok, and Deirdre Hand — three of whom are former refugees — the organization provides intensive academic preparation, standardized-test coaching, technology resources, mentorship, and university guidance.</p>

<p>The results speak for themselves: nearly <strong>50 students</strong> have received acceptances from roughly <strong>30 universities</strong> — including UC Berkeley, Dartmouth, McGill, Northwestern, and Virginia Tech — with over <strong>$20 million</strong> in secured scholarships and a 100% acceptance and retention rate.</p>

<p>Thirty years of service behind us, and a new chapter of impact ahead.</p>
`.trim();

async function pickCoverImage(): Promise<string> {
  // Prefer a featured photo from the gala album; fall back to the first photo.
  const album = await db.collection('albums').where('slug', '==', GALA_ALBUM_SLUG).limit(1).get();
  if (!album.empty) {
    const albumId = album.docs[0].id;
    const feat = await db
      .collection('gallery')
      .where('albumId', '==', albumId)
      .where('isFeatured', '==', true)
      .limit(1)
      .get();
    if (!feat.empty) return feat.docs[0].data().url;
    const any = await db.collection('gallery').where('albumId', '==', albumId).limit(1).get();
    if (!any.empty) return any.docs[0].data().url;
  }
  return '';
}

async function main() {
  const force = process.env.FORCE === '1';
  const existing = await db.collection('articles').where('slug', '==', SLUG).limit(1).get();
  if (!existing.empty && !force) {
    console.log(`✓ Article already exists (slug=${SLUG}). Nothing to do.`);
    console.log('  Re-run with FORCE=1 to overwrite.');
    process.exit(0);
  }

  const coverImage = await pickCoverImage();
  const now = new Date().toISOString();
  const ref = existing.empty ? db.collection('articles').doc() : existing.docs[0].ref;

  const article = {
    title: 'Celebrating 30 Years of Service',
    slug: SLUG,
    excerpt:
      "The Rotaract Club at the United Nations marked its 30th anniversary with a gala supporting Elimisha Kakuma — expanding higher-education access for refugee students in Kenya's Kakuma camp.",
    content: CONTENT,
    coverImage,
    author: { id: 'rcun', name: 'Rotaract Club at the United Nations', photoURL: '' },
    category: 'Impact',
    tags: ['gala', 'anniversary', 'impact', 'scholarships'],
    isPublished: true,
    publishedAt: '2026-06-23T12:00:00.000Z',
    createdAt: existing.empty ? now : existing.docs[0].data().createdAt || now,
    updatedAt: now,
    viewCount: existing.empty ? 0 : existing.docs[0].data().viewCount || 0,
    likeCount: existing.empty ? 0 : existing.docs[0].data().likeCount || 0,
  };

  await ref.set(article, { merge: true });

  console.log(`✓ Seeded article "${article.title}"`);
  console.log(`    cover: ${coverImage || '(none found)'}`);
  console.log(`    public page: /news/${SLUG}`);
  process.exit(0);
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
