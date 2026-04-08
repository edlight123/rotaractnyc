/**
 * Google Photos → Firebase Storage + Firestore importer
 *
 * Scrapes shared Google Photos album links using a headless Playwright browser,
 * downloads every full-resolution photo, uploads them to Firebase Storage,
 * and indexes them in Firestore under the `albums` and `gallery` collections.
 *
 * USAGE (from the project root, with .env.local present):
 *   npx tsx scripts/import-google-photos.ts
 *
 * FLAGS:
 *   --dry-run       Print what would be imported without uploading anything
 *   --album <slug>  Only import the album matching this slug
 *   --limit <n>     Max photos per album (default: all)
 *   --skip-existing Skip albums that already exist in Firestore (default: true)
 *
 * REQUIREMENTS:
 *   - .env.local with FIREBASE_SERVICE_ACCOUNT_KEY (or FIREBASE_PROJECT_ID etc.)
 *   - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET in .env.local
 *   - npx playwright install chromium  (run once if not yet done)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import * as os from 'os';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { chromium, type Page } from '@playwright/test';
import { initializeApp, cert, getApps, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// ─── Parse CLI flags ─────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const ONLY_ALBUM = args.includes('--album') ? args[args.indexOf('--album') + 1] : null;
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1], 10) : Infinity;
const SKIP_EXISTING = !args.includes('--no-skip-existing');

// ─── Album definitions ───────────────────────────────────────────────────────

interface AlbumDef {
  slug: string;
  title: string;
  date: string;         // ISO date string
  description?: string;
  googlePhotosUrl: string;
  isPublic: boolean;
  publicPreviewCount: number;
  isFeatured?: boolean; // first N photos marked as featured (for homepage mosaic)
  featuredCount?: number;
}

const ALBUMS: AlbumDef[] = [
  {
    slug: 'pickleball-2025',
    title: 'Pickleball Social',
    date: '2025-09-14',           // from page title: "25.9.14 Pickleball Social"
    description: 'Rotaract NYC Pickleball Social — fellowship on the courts!',
    googlePhotosUrl: 'https://photos.app.goo.gl/f1v5fwReK3ZNNYM46',
    isPublic: true,
    publicPreviewCount: 6,
    isFeatured: true,
    featuredCount: 3,
  },
  {
    slug: 'gala-2025',
    title: 'RCUN Gala 2025',
    date: '2025-01-01',
    description: 'Rotaract NYC Annual Gala 2025 — celebrating another year of service and fellowship.',
    googlePhotosUrl: 'https://photos.app.goo.gl/md5aDSN8oLNEaeW1A',
    isPublic: true,
    publicPreviewCount: 6,
    isFeatured: true,
    featuredCount: 4,
  },
  {
    slug: 'penta-fundraiser-2024',
    title: 'Penta Fundraiser 2024',
    date: '2024-01-01',           // from page title: "RCUN Penta Fundraiser 2024"
    description: 'Rotaract NYC Penta Fundraiser 2024.',
    googlePhotosUrl: 'https://photos.app.goo.gl/wpP4EaFfdbEqGJfB7',
    isPublic: true,
    publicPreviewCount: 6,
    isFeatured: true,
    featuredCount: 2,
  },
  {
    slug: 'rotaract-reception-2022',
    title: 'Rotaract Reception 2022',
    date: '2022-01-01',           // from page title: "Rotaract Reception 2022"
    description: 'Rotaract NYC Reception 2022.',
    googlePhotosUrl: 'https://photos.app.goo.gl/MZFmtCeeVEj5qVkj9',
    isPublic: true,
    publicPreviewCount: 6,
  },
  {
    slug: 'rotary-day-of-service',
    title: 'Rotary Day of Service',
    date: '2023-05-20',           // from page title: "23.5.20 Rotary Day of service"
    description: 'A day of community service with fellow Rotaractors across New York City.',
    googlePhotosUrl: 'https://photos.app.goo.gl/Bz95o4C8RnbCQ5LBA',
    isPublic: true,
    publicPreviewCount: 6,
    isFeatured: true,
    featuredCount: 3,
  },
  {
    slug: 'henry-street-settlement',
    title: 'Henry Street Settlement',
    date: '2022-08-27',           // from page title: "22.8.27 Henry Street Settlement"
    description: 'Volunteering at Henry Street Settlement — one of NYC\'s oldest social service organizations.',
    googlePhotosUrl: 'https://photos.app.goo.gl/uc7MCjgg5cBop8tR6',
    isPublic: true,
    publicPreviewCount: 6,
    isFeatured: true,
    featuredCount: 2,
  },
  {
    slug: 'the-door-visit',
    title: 'The Door Visit',
    date: '2023-03-10',           // from page title: "23.3.10 The Door RCUN visit"
    description: 'Visit to The Door — a center for youth development in New York City.',
    googlePhotosUrl: 'https://photos.app.goo.gl/f6Y9N9WiBQ6JNRPX8',
    isPublic: true,
    publicPreviewCount: 6,
    isFeatured: true,
    featuredCount: 2,
  },
];

// ─── Firebase init ───────────────────────────────────────────────────────────

function initFirebase() {
  if (getApps().length) return;
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
  if (saJson) {
    let sa: ServiceAccount;
    try { sa = JSON.parse(saJson) as ServiceAccount; }
    catch { sa = JSON.parse(saJson.replace(/\n/g, '\\n')) as ServiceAccount; }
    initializeApp({ credential: cert(sa) });
  } else if (process.env.FIREBASE_PROJECT_ID) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      } as ServiceAccount),
    });
  } else {
    throw new Error('No Firebase credentials found. Add FIREBASE_SERVICE_ACCOUNT_KEY to .env.local');
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        return downloadFile(res.headers.location!, dest).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
    });
    req.on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Convert a Google Photos thumbnail URL to the highest-res version */
function toFullRes(url: string): string {
  // Google Photos URLs end in =wXXX-hYYY or =s512 etc.
  // Replace with =w4096 to get max resolution
  let hi = url
    .replace(/=w\d+-h\d+(-[^?]+)?(\?.*)?$/, '=w4096')
    .replace(/=s\d+(\?.*)?$/, '=s4096');
  // /pw/ URLs often have no size suffix — append one for max resolution
  if (hi === url && /\/pw\//.test(url) && !url.includes('=w') && !url.includes('=s')) {
    hi = url + '=w4096';
  }
  return hi;
}

// ─── Google Photos scraper ───────────────────────────────────────────────────

const DEBUG = args.includes('--debug');

async function scrapeAlbum(page: Page, albumUrl: string, limit: number): Promise<string[]> {
  console.log(`  🌐 Opening album: ${albumUrl}`);

  // Use 'load' instead of 'networkidle' — Google Photos makes continuous API calls
  // that prevent networkidle from ever firing within reasonable timeouts
  await page.goto(albumUrl, { waitUntil: 'load', timeout: 60000 });

  // Let the JS app hydrate and lazy-load initial photos
  await sleep(4000);

  // Log page info so we can detect sign-in redirects / errors
  const pageTitle = await page.title();
  const pageUrl = page.url();
  if (DEBUG) {
    console.log(`  🔗 Final URL: ${pageUrl}`);
    console.log(`  📄 Page title: ${pageTitle}`);
  }

  // Detect if we got redirected to a sign-in page
  if (
    pageUrl.includes('accounts.google.com') ||
    pageUrl.includes('/signin') ||
    pageTitle.toLowerCase().includes('sign in') ||
    pageTitle.toLowerCase().includes('log in')
  ) {
    console.log('  ⚠️  Redirected to sign-in — album may be private or require Google account');
    return [];
  }

  // Detect error / empty pages
  if (pageTitle.includes('Error') || pageTitle.includes('not found') || pageTitle === '') {
    console.log(`  ⚠️  Unexpected page: "${pageTitle}"`);
    return [];
  }

  // Scroll to load all photos (Google Photos lazy-loads thumbnails)
  console.log('  📜 Scrolling to load all photos...');
  let previousCount = 0;
  let stableRounds = 0;

  while (stableRounds < 4) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(2000);

    const currentCount = await page.evaluate(() => {
      // Count all candidate images
      const imgs = document.querySelectorAll('img[src*="googleusercontent.com"]');
      return imgs.length;
    });

    if (currentCount === previousCount) {
      stableRounds++;
    } else {
      stableRounds = 0;
      previousCount = currentCount;
    }

    if (currentCount >= limit) break;

    process.stdout.write(`\r  📷 Found ${currentCount} images so far...`);
  }
  console.log('');

  // Extract all unique photo URLs — check img src, data-src, and background-image
  const rawUrls: string[] = await page.evaluate(() => {
    const urls = new Set<string>();

    // Strategy 1: img[src] and img[data-src]
    document.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
      const src = img.src || img.getAttribute('data-src') || '';
      if (src) urls.add(src);
    });

    // Strategy 2: elements with background-image style containing googleusercontent
    document.querySelectorAll<HTMLElement>('[style*="googleusercontent.com"]').forEach((el) => {
      const style = el.getAttribute('style') || '';
      const match = style.match(/url\(["']?(https:\/\/[^"')]+googleusercontent[^"')]+)["']?\)/);
      if (match) urls.add(match[1]);
    });

    // Strategy 3: any element with data-src containing googleusercontent
    document.querySelectorAll<HTMLElement>('[data-src*="googleusercontent"]').forEach((el) => {
      const src = el.getAttribute('data-src') || '';
      if (src) urls.add(src);
    });

    return Array.from(urls);
  });

  if (DEBUG) {
    console.log(`  🔍 DEBUG: ${rawUrls.length} total raw URLs found`);
    rawUrls.slice(0, 5).forEach((u) => console.log(`     → ${u.slice(0, 100)}`));
  }

  // Filter to real photo URLs (not UI icons, avatars, profile pics)
  const filtered = rawUrls.filter((src) => {
    if (!src.includes('googleusercontent.com')) return false;
    // Exclude profile / avatar URLs (path component /a/)
    if (/googleusercontent\.com\/a\//.test(src)) return false;
    // Exclude tiny icons (usually < 32px in size param)
    const sizeMatch = src.match(/=(?:w|s)(\d+)/);
    if (sizeMatch && parseInt(sizeMatch[1], 10) < 100) return false;
    // Must have size params or known photo path segments
    const isPhoto = src.includes('=w') || src.includes('=s') || src.includes('/photo/') || /\/pw\//.test(src) || /lh\d\.googleusercontent/.test(src);
    return isPhoto;
  });

  if (DEBUG) {
    console.log(`  🔍 DEBUG: ${filtered.length} photo URLs after filtering`);
    filtered.slice(0, 5).forEach((u) => console.log(`     → ${u.slice(0, 100)}`));
  }

  // Deduplicate by base URL (strip size params for comparison)
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const url of filtered) {
    const base = url.replace(/=[^?]+(\?.*)?$/, '');
    if (!seen.has(base)) {
      seen.add(base);
      unique.push(toFullRes(url));
    }
  }

  console.log(`  ✅ Found ${unique.length} unique photos`);
  return unique.slice(0, limit);
}

// ─── Upload to Firebase Storage ──────────────────────────────────────────────

async function uploadToStorage(
  localPath: string,
  storagePath: string,
  contentType: string,
): Promise<string> {
  const bucket = getStorage().bucket(
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    process.env.FIREBASE_STORAGE_BUCKET
  );

  await bucket.upload(localPath, {
    destination: storagePath,
    metadata: { contentType },
    public: true,
  });

  const file = bucket.file(storagePath);
  const [metadata] = await file.getMetadata();
  // Return the public CDN URL
  return `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
}

// ─── Main import logic ───────────────────────────────────────────────────────

async function importAlbum(
  page: Page,
  album: AlbumDef,
  db: FirebaseFirestore.Firestore,
): Promise<void> {
  console.log(`\n📁 Album: ${album.title} (${album.slug})`);

  // Check if album already exists (skip in dry-run)
  if (SKIP_EXISTING && !DRY_RUN) {
    const existing = await db.collection('albums').where('slug', '==', album.slug).limit(1).get();
    if (!existing.empty) {
      console.log(`  ⏭️  Skipping — already exists in Firestore (use --no-skip-existing to re-import)`);
      return;
    }
  }

  // Scrape photo URLs from Google Photos
  const photoUrls = await scrapeAlbum(page, album.googlePhotosUrl, LIMIT);

  if (photoUrls.length === 0) {
    console.log('  ⚠️  No photos found — album may be private or require sign-in');
    return;
  }

  if (DRY_RUN) {
    console.log(`  🔍 DRY RUN — would upload ${photoUrls.length} photos`);
    photoUrls.slice(0, 3).forEach((url, i) => console.log(`     [${i}] ${url.slice(0, 80)}...`));
    return;
  }

  // Create temp directory for downloads
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `rotaract-${album.slug}-`));

  try {
    let coverPhotoUrl = '';
    const photoIds: string[] = [];

    // Create album doc first to get the ID
    const albumRef = db.collection('albums').doc();
    const albumId = albumRef.id;

    console.log(`  ⬆️  Uploading ${photoUrls.length} photos to Firebase Storage...`);

    for (let i = 0; i < photoUrls.length; i++) {
      const photoUrl = photoUrls[i];
      const fileName = `photo_${String(i + 1).padStart(4, '0')}.jpg`;
      const localPath = path.join(tmpDir, fileName);
      const storagePath = `albums/${album.slug}/${fileName}`;

      process.stdout.write(`\r  📤 Uploading ${i + 1}/${photoUrls.length}: ${fileName}...`);

      try {
        // Download
        await downloadFile(photoUrl, localPath);

        // Upload to Firebase Storage
        const publicUrl = await uploadToStorage(localPath, storagePath, 'image/jpeg');

        // Create gallery doc
        const galleryRef = db.collection('gallery').doc();
        const isFeatured = album.isFeatured === true && i < (album.featuredCount || 2);
        const isPreview = i < album.publicPreviewCount;

        await galleryRef.set({
          albumId,
          url: publicUrl,
          storagePath,
          caption: '',
          order: i,
          isPreview,
          isFeatured,
          createdAt: new Date().toISOString(),
        });

        photoIds.push(galleryRef.id);

        // First photo becomes the cover
        if (i === 0) coverPhotoUrl = publicUrl;

        // Clean up local file
        fs.unlinkSync(localPath);

      } catch (err: any) {
        console.log(`\n  ⚠️  Failed to upload photo ${i + 1}: ${err.message}`);
      }

      // Small delay to avoid rate limiting
      await sleep(200);
    }

    console.log('');

    // Save album to Firestore
    await albumRef.set({
      slug: album.slug,
      title: album.title,
      date: album.date,
      description: album.description || '',
      coverPhotoUrl,
      photoCount: photoIds.length,
      isPublic: album.isPublic,
      publicPreviewCount: album.publicPreviewCount,
      googlePhotosUrl: album.googlePhotosUrl,
      isFeatured: album.isFeatured || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log(`  ✅ Done! ${photoIds.length} photos uploaded. Album ID: ${albumId}`);
    console.log(`     Cover: ${coverPhotoUrl.slice(0, 60)}...`);

  } finally {
    // Clean up temp dir
    try { fs.rmdirSync(tmpDir, { recursive: true }); } catch {}
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Rotaract NYC — Google Photos → Firebase Importer');
  console.log('═'.repeat(52));

  if (DRY_RUN) console.log('🔍 DRY RUN MODE — nothing will be uploaded\n');

  // Init Firebase
  if (!DRY_RUN) {
    try {
      initFirebase();
      console.log('✅ Firebase Admin initialized\n');
    } catch (err: any) {
      console.error('❌ Firebase init failed:', err.message);
      console.error('   Make sure .env.local has FIREBASE_SERVICE_ACCOUNT_KEY');
      process.exit(1);
    }
  }

  const db = DRY_RUN ? null as any : getFirestore();

  // Filter albums if --album flag provided
  const albumsToImport = ONLY_ALBUM
    ? ALBUMS.filter((a) => a.slug === ONLY_ALBUM)
    : ALBUMS;

  if (albumsToImport.length === 0) {
    console.error(`❌ No album found with slug "${ONLY_ALBUM}"`);
    console.error('   Available slugs:', ALBUMS.map((a) => a.slug).join(', '));
    process.exit(1);
  }

  console.log(`📋 Albums to import: ${albumsToImport.map((a) => a.title).join(', ')}`);
  console.log(`🔢 Photo limit per album: ${LIMIT === Infinity ? 'all' : LIMIT}`);
  console.log('');

  // Launch Playwright
  console.log('🎭 Launching headless browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  let successCount = 0;
  let failCount = 0;

  for (const album of albumsToImport) {
    try {
      await importAlbum(page, album, db);
      successCount++;
    } catch (err: any) {
      console.error(`\n❌ Failed to import "${album.title}": ${err.message}`);
      failCount++;
    }
  }

  await browser.close();

  console.log('\n' + '═'.repeat(52));
  console.log(`✅ Import complete!`);
  console.log(`   Succeeded: ${successCount}/${albumsToImport.length} albums`);
  if (failCount > 0) console.log(`   Failed: ${failCount} albums`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Visit your site → /gallery to see the albums');
  console.log('  2. Visit Portal → Media → Albums to manage them');
  console.log('  3. Set accurate dates per album in the portal editor');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
