/**
 * Seed the recurring "Neighborhood Supper" community meal service event.
 *
 * Third Saturday of every month, 3:30–6:30 PM, at the Holy Trinity
 * Neighborhood Center. Creates a published, public `service` event as a
 * recurring series (parent + monthly occurrences), matching the shape the
 * portal writes (recurrenceParentId / occurrenceIndex). Registration uses the
 * site's native guest RSVP on the event page.
 *
 * Idempotent: if the parent slug already exists it exits without changes,
 * unless FORCE=1 is set (which deletes the existing series first).
 *
 *   npx tsx scripts/seed-food-pantry.ts
 *   FORCE=1 npx tsx scripts/seed-food-pantry.ts   # wipe & reseed
 */
import { getDb, slugify, upcomingNthWeekdays } from './seedFirestore';

const db = getDb();

const PARENT_SLUG = 'neighborhood-supper-community-meal-service';
const OCCURRENCES = 12; // seed a year of monthly suppers
const START = new Date('2026-07-18T00:00:00.000Z'); // first upcoming 3rd Saturday

const BASE = {
  title: 'Neighborhood Supper — Community Meal Service',
  description: `Join Rotaract NYC for our monthly **Neighborhood Supper**, a community meal service in partnership with the Holy Trinity Neighborhood Center.

Volunteers help prepare and serve a warm, restaurant-style dinner to homeless and working-poor New Yorkers — guests are served coffee, water, and a hot meal right at their table. We serve **90–120 guests** each month.

Volunteers typically arrive in the early afternoon to help set up. No experience needed — just bring a warm heart and a willingness to help.

**When:** The third Saturday of every month, 3:30–6:30 PM.
**Where:** The Church of the Holy Trinity, 316 East 88th Street, New York, NY.

Register below to claim your volunteer spot for an upcoming date.`,
  time: '3:30 PM',
  endTime: '6:30 PM',
  location: 'Holy Trinity Neighborhood Center',
  address: '316 East 88th Street, New York, NY 10128',
  type: 'service' as const,
  pricing: null,
  imageURL: null,
  tags: ['service', 'food-pantry', 'community', 'volunteer'],
  capacity: 20,
  isPublic: true,
  status: 'published' as const,
  committeeId: null,
  acceptsDonations: false,
  fundraisingGoalCents: null,
  donationsTotalCents: 0,
  donationsCount: 0,
};

async function deleteExistingSeries(parentId: string) {
  const children = await db.collection('events').where('recurrenceParentId', '==', parentId).get();
  const batch = db.batch();
  children.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(db.collection('events').doc(parentId));
  await batch.commit();
  console.log(`  deleted existing series (${children.size + 1} docs)`);
}

async function main() {
  const force = process.env.FORCE === '1';
  const existing = await db.collection('events').where('slug', '==', PARENT_SLUG).limit(1).get();

  if (!existing.empty) {
    if (!force) {
      console.log(`✓ Food pantry event already exists (slug=${PARENT_SLUG}). Nothing to do.`);
      console.log('  Re-run with FORCE=1 to wipe and reseed.');
      process.exit(0);
    }
    await deleteExistingSeries(existing.docs[0].id);
  }

  const dates = upcomingNthWeekdays(START, 6 /* Saturday */, 3 /* third */, OCCURRENCES);
  const now = new Date().toISOString();

  // Parent = first occurrence.
  const parentRef = db.collection('events').doc();
  const parentId = parentRef.id;
  const parentData = {
    ...BASE,
    slug: PARENT_SLUG,
    date: dates[0].toISOString(),
    endDate: null,
    attendeeCount: 0,
    isRecurring: true,
    recurrence: { frequency: 'monthly', interval: 1, daysOfWeek: [6], occurrences: OCCURRENCES },
    recurrenceParentId: null,
    occurrenceIndex: 0,
    createdBy: 'seed-script',
    createdAt: now,
    updatedAt: now,
  };

  const batch = db.batch();
  batch.set(parentRef, parentData);

  const created: string[] = [`${dates[0].toISOString().slice(0, 10)} (parent)`];
  for (let i = 1; i < dates.length; i++) {
    const childRef = db.collection('events').doc();
    batch.set(childRef, {
      ...parentData,
      slug: `${PARENT_SLUG}-${i + 1}`,
      date: dates[i].toISOString(),
      recurrenceParentId: parentId,
      occurrenceIndex: i,
      attendeeCount: 0,
    });
    created.push(dates[i].toISOString().slice(0, 10));
  }

  await batch.commit();

  console.log(`✓ Seeded "${BASE.title}" — ${dates.length} occurrences:`);
  created.forEach((d) => console.log(`    • ${d}`));
  console.log(`  Public event page: /events/${PARENT_SLUG}`);
  process.exit(0);
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
