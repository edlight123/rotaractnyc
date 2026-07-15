/**
 * Seed the `pastBoards` collection (one doc per Rotary year) from the club's
 * "Board Members by Year" sheet. Shown on the public /leadership page and the
 * portal Board Manager.
 *
 * This is public leadership information (names + roles), not personal contact
 * data, so it lives in the committed script. Idempotent: doc id = year slug,
 * re-runs overwrite. Current year (2026–2027) is left to the live board.
 *
 *   npx tsx scripts/seed-past-boards.ts
 */
import { getDb } from './seedFirestore';

const db = getDb();

interface BoardMemberEntry {
  name: string;
  title: string;
}
interface YearBoard {
  year: string; // "YYYY-YYYY"
  members: BoardMemberEntry[];
}

const BOARDS: YearBoard[] = [
  {
    year: '2025-2026',
    members: [
      { name: 'Harrison Evans', title: 'President' },
      { name: 'Ted Olivier Jacquet', title: 'Treasurer' },
      { name: 'Marina MacKinnon', title: 'Secretary' },
      { name: 'Audrey Zvinavashe', title: 'Immediate Past President' },
      { name: 'Christina Wellington', title: 'Advisor' },
    ],
  },
  {
    year: '2024-2025',
    members: [
      { name: 'Audrey Zvinavashe', title: 'President' },
      { name: 'Antonio Cesaro', title: 'Treasurer' },
      { name: 'Marina MacKinnon', title: 'Secretary' },
      { name: 'Akash Budhani', title: 'Community Service Director' },
      { name: 'Harrison Evans', title: 'Immediate Past President' },
    ],
  },
  {
    year: '2023-2024',
    members: [
      { name: 'Harrison Evans', title: 'President' },
      { name: 'Antonio Cesaro', title: 'Treasurer' },
      { name: 'Christina Wellington', title: 'Immediate Past President' },
    ],
  },
  {
    year: '2022-2023',
    members: [
      { name: 'Christina Wellington', title: 'President' },
      { name: 'Alara Tufekcioglu', title: 'Vice President' },
      { name: 'Harrison Evans', title: 'Treasurer' },
      { name: 'Vincenzo Giordano', title: 'Secretary' },
      { name: 'Amado Suarez', title: 'Membership Director' },
      { name: 'Hanna Lissinna', title: 'Community Service Director' },
      { name: 'Jessie Zhao', title: 'International Service Director' },
      { name: 'William Hsu', title: 'Professional Development Director' },
      { name: 'Fouad Kanneh', title: 'PR / Marketing Director' },
      { name: 'Quentin Alexandre', title: 'Immediate Past President' },
    ],
  },
  {
    year: '2021-2022',
    members: [
      { name: 'Quentin Alexandre', title: 'President' },
      { name: 'Christina Wellington', title: 'Treasurer' },
      { name: 'Elaine Zuo', title: 'Community Service Director' },
      { name: 'Maia Krivoruk', title: 'International Service Director' },
    ],
  },
  {
    year: '2020-2021',
    members: [
      { name: 'Vincenzo Giordano', title: 'President' },
      { name: 'Leo Zambrano', title: 'Vice President' },
      { name: 'Evan Harris', title: 'Treasurer' },
      { name: 'Quentin Alexandre', title: 'Secretary' },
      { name: 'Anish Prabhu', title: 'Community Service Director' },
      { name: 'Suleyman Can Keles', title: 'International Service Director' },
      { name: 'Antonio Ferega', title: 'Professional Development Director' },
      { name: 'Petra Nelson', title: 'Events / Social Director' },
      { name: 'Ana Maria Salas Picon', title: 'PR / Marketing Director' },
      { name: 'Anna Folz', title: 'Immediate Past President' },
      { name: 'Jennifer Lapper', title: 'Advisor' },
      { name: 'Emilia Guzman', title: 'Advisor' },
    ],
  },
  { year: '2019-2020', members: [{ name: 'Anna Folz', title: 'President' }] },
  { year: '2018-2019', members: [{ name: 'Crystal Osner', title: 'President' }] },
  { year: '2017-2018', members: [{ name: 'Chris Daley', title: 'President' }] },
  { year: '2016-2017', members: [{ name: 'Maria Gozon', title: 'President' }] },
  {
    year: '2015-2016',
    members: [
      { name: 'Piyumi Buddhakorala', title: 'President' },
      { name: 'Maria Gozon', title: 'Vice President' },
      { name: 'Adrian Stewart', title: 'Treasurer' },
      { name: 'Lisa Ly', title: 'Secretary' },
      { name: 'Chris Daley', title: 'Events / Social Director' },
      { name: 'Sylvester Weise', title: 'PR / Marketing Director' },
    ],
  },
  {
    year: '2014-2015',
    members: [
      { name: 'Alanna Walker', title: 'President' },
      { name: 'Piyumi Buddhakorala', title: 'Vice President' },
      { name: 'Justin Sharma', title: 'Treasurer' },
      { name: 'Michael Roemer', title: 'Secretary' },
      { name: 'Angela Amico', title: 'International Service Director' },
      { name: 'Maria Gozon', title: 'Events / Social Director' },
    ],
  },
  {
    year: '2013-2014',
    members: [
      { name: 'Zineb Touzani', title: 'President' },
      { name: 'Leon Horwitz', title: 'Fundraising' },
    ],
  },
  {
    year: '2012-2013',
    members: [
      { name: 'Rita Shulgina', title: 'Co-President' },
      { name: 'Michael Lipton', title: 'Co-President' },
    ],
  },
];

async function main() {
  const now = new Date().toISOString();
  const batch = db.batch();
  for (const b of BOARDS) {
    batch.set(db.collection('pastBoards').doc(b.year), {
      year: b.year,
      members: b.members.map((m) => ({ name: m.name, title: m.title, photoURL: '' })),
      createdAt: now,
      createdBy: 'seed-script',
    });
  }
  await batch.commit();
  console.log(`✓ Seeded ${BOARDS.length} past-board years:`);
  BOARDS.forEach((b) => console.log(`    • ${b.year} — ${b.members.length} member(s)`));
  process.exit(0);
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
