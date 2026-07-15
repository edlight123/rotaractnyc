/**
 * Shared Firebase Admin bootstrap for seed scripts.
 *
 * Usage from a seed script:
 *   import { getDb, FieldValue } from './seedFirestore';
 *   const db = getDb();
 *
 * Requires .env.local with FIREBASE_SERVICE_ACCOUNT_KEY (or FIREBASE_SERVICE_ACCOUNT),
 * or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { initializeApp, cert, getApps, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, FieldValue, Firestore } from 'firebase-admin/firestore';

let _db: Firestore | null = null;

export function getDb(): Firestore {
  if (_db) return _db;

  if (!getApps().length) {
    const saJson =
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
    if (saJson) {
      let sa: ServiceAccount;
      try {
        sa = JSON.parse(saJson) as ServiceAccount;
      } catch {
        sa = JSON.parse(saJson.replace(/\n/g, '\\n')) as ServiceAccount;
      }
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
      throw new Error(
        'No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT(_KEY) or ' +
          'FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY in .env.local',
      );
    }
  }

  _db = getFirestore();
  return _db;
}

export { FieldValue };

/** URL-safe slug from a title. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * The date of the Nth given weekday of a month.
 * weekday: 0=Sun … 6=Sat. nth: 1-based (3 = third).
 * Returns a Date at UTC noon (so the calendar day is stable in any timezone).
 */
export function nthWeekdayOfMonth(year: number, month0: number, weekday: number, nth: number): Date {
  const first = new Date(Date.UTC(year, month0, 1));
  const firstWeekday = first.getUTCDay();
  const offset = (weekday - firstWeekday + 7) % 7;
  const day = 1 + offset + (nth - 1) * 7;
  return new Date(Date.UTC(year, month0, day, 16, 0, 0)); // 16:00 UTC = noon ET
}

/** The next `count` Nth-weekday dates, starting from (and including) `from`. */
export function upcomingNthWeekdays(
  from: Date,
  weekday: number,
  nth: number,
  count: number,
): Date[] {
  const out: Date[] = [];
  let year = from.getUTCFullYear();
  let month0 = from.getUTCMonth();
  while (out.length < count) {
    const d = nthWeekdayOfMonth(year, month0, weekday, nth);
    if (d.getTime() >= from.getTime()) out.push(d);
    month0 += 1;
    if (month0 > 11) {
      month0 = 0;
      year += 1;
    }
  }
  return out;
}
