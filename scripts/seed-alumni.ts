/**
 * Seed alumni into the member directory (members with status 'alumni').
 *
 * Reads a roster JSON of past/non-active people from a path given by
 * ALUMNI_ROSTER_PATH. That file contains personal contact data and is
 * intentionally kept OUT of the repo (staged in the scratchpad), so no PII is
 * ever committed to git. This script holds logic only.
 *
 * Safety:
 *  - Skips anyone whose email OR normalized name matches an existing member
 *    (so current active members are never duplicated as alumni).
 *  - Idempotent: deterministic doc ids (alumni-<key>), re-runs upsert.
 *
 * Usage:
 *   ALUMNI_ROSTER_PATH=/abs/path/alumniRoster.json npx tsx scripts/seed-alumni.ts
 *   ALUMNI_ROSTER_PATH=... DRY_RUN=1 npx tsx scripts/seed-alumni.ts   # preview only
 */
import * as fs from 'fs';
import { getDb, slugify } from './seedFirestore';

interface AlumniSeed {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  birthYear?: string;
  memberType?: 'professional' | 'student';
  inductionYear?: number;
  lastActiveYear?: number;
  pastTitle?: string;
}

const db = getDb();

const normName = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
const normEmail = (s: string) => s.trim().toLowerCase();
const isoJan1 = (y: number) => `${y}-01-01T00:00:00.000Z`;
const isoJun30 = (y: number) => `${y}-06-30T00:00:00.000Z`;

async function main() {
  const path = process.env.ALUMNI_ROSTER_PATH;
  if (!path) throw new Error('Set ALUMNI_ROSTER_PATH to the roster JSON file.');
  const dryRun = process.env.DRY_RUN === '1';

  const roster: AlumniSeed[] = JSON.parse(fs.readFileSync(path, 'utf8'));

  // Build exclusion sets from ALL existing member docs (any status).
  const existing = await db.collection('members').get();
  const existingEmails = new Set<string>();
  const existingNames = new Set<string>();
  existing.docs.forEach((d) => {
    const m = d.data();
    if (m.email) existingEmails.add(normEmail(m.email));
    const nm = m.displayName || `${m.firstName || ''} ${m.lastName || ''}`;
    if (nm.trim()) existingNames.add(normName(nm));
  });

  const now = new Date().toISOString();
  let created = 0;
  let skippedExisting = 0;
  const createdNames: string[] = [];
  const skippedNames: string[] = [];
  const batch = db.batch();

  for (const a of roster) {
    const fullName = `${a.firstName} ${a.lastName}`.trim();
    const email = a.email ? normEmail(a.email) : '';

    // Dedupe: never duplicate someone who's already a member (active or otherwise).
    if ((email && existingEmails.has(email)) || existingNames.has(normName(fullName))) {
      skippedExisting++;
      skippedNames.push(fullName);
      continue;
    }

    const key = email ? email.replace(/[^a-z0-9]/g, '_') : slugify(fullName);
    const docId = `alumni-${key}`;

    const joinedAt = a.inductionYear
      ? isoJan1(a.inductionYear)
      : a.lastActiveYear
        ? isoJan1(a.lastActiveYear)
        : '';
    const alumniSince = a.lastActiveYear ? isoJun30(a.lastActiveYear) : joinedAt;

    const doc: Record<string, unknown> = {
      displayName: fullName,
      firstName: a.firstName,
      lastName: a.lastName,
      email,
      role: 'member',
      status: 'alumni',
      onboardingComplete: false,
      joinedAt,
      ...(alumniSince && { alumniSince }),
      ...(a.memberType && { memberType: a.memberType }),
      ...(a.phone && { phone: a.phone }),
      ...(a.address && { address: a.address }),
      ...(a.birthYear && { birthday: a.birthYear }),
      ...(a.pastTitle && { bio: a.pastTitle }),
      createdAt: now,
      updatedAt: now,
    };

    if (!dryRun) batch.set(db.collection('members').doc(docId), doc, { merge: true });
    created++;
    createdNames.push(`${fullName}${a.pastTitle ? ` — ${a.pastTitle}` : ''}`);
  }

  if (!dryRun && created > 0) await batch.commit();

  console.log(`${dryRun ? '[DRY RUN] ' : ''}Alumni seed complete.`);
  console.log(`  Would create / created: ${created}`);
  console.log(`  Skipped (already a member): ${skippedExisting}`);
  if (skippedNames.length) console.log(`    skipped: ${skippedNames.join(', ')}`);
  console.log('  Alumni:');
  createdNames.forEach((n) => console.log(`    • ${n}`));
  process.exit(0);
}

main().catch((e) => {
  console.error('Alumni seed failed:', e);
  process.exit(1);
});
