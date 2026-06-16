/**
 * One-time migration: convert legacy "pending" self-signups into supporter
 * accounts.
 *
 * Background
 * ----------
 * Before the accounts model, every Google sign-in auto-created a
 * `members/{uid}` doc with status 'pending'. Those people were never real
 * members — they just signed in hoping to join. Under the new model they
 * belong in the `accounts` collection as 'supporter's, with an explicit
 * membership application capturing their intent.
 *
 * What it does (per pending self-signup, i.e. status == 'pending' AND no
 * `invitedAt`):
 *   1. Ensures an `accounts/{uid}` doc (accountType: 'supporter').
 *   2. Creates a `membershipApplications` doc (status: 'submitted') so the
 *      board still sees their interest.
 *   3. Sets the `accountType: 'supporter'` custom claim.
 *   4. Deletes the obsolete pending `members/{uid}` doc.
 *
 * Board-invited members (they carry `invitedAt`) are left untouched — they are
 * migrated to active on their next sign-in by the session route.
 *
 * Safety
 * ------
 * Dry-run by default: prints what it WOULD do and writes nothing. Pass
 * `--apply` to perform the migration.
 *
 *   npx tsx scripts/migrate-pending-members.ts            # dry run
 *   npx tsx scripts/migrate-pending-members.ts --apply    # execute
 *
 * Requires .env.local with FIREBASE_SERVICE_ACCOUNT_KEY or
 * FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import {
  initializeApp,
  cert,
  getApps,
  type ServiceAccount,
} from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// ─── Init ────────────────────────────────────────────────────────────────────
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
    console.error('❌  No Firebase credentials found in .env.local');
    process.exit(1);
  }
}

const db = getFirestore();
const auth = getAuth();

const APPLY = process.argv.includes('--apply');

async function main() {
  console.log(
    `\n🔁  Pending-member → supporter migration (${APPLY ? 'APPLY' : 'DRY RUN'})\n`,
  );

  const snap = await db.collection('members').where('status', '==', 'pending').get();

  if (snap.empty) {
    console.log('✅  No pending members found. Nothing to do.');
    return;
  }

  let converted = 0;
  let skippedInvited = 0;
  let failed = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data() || {};
    const uid = docSnap.id;
    const email = (data.email || '').toLowerCase();
    const displayName = data.displayName || '';

    // Skip board-invited members — handled on their next sign-in.
    if (data.invitedAt) {
      skippedInvited += 1;
      console.log(`   ↪︎  skip invited: ${email || uid}`);
      continue;
    }

    if (!APPLY) {
      console.log(`   •  would convert: ${email || uid} (${displayName || 'no name'})`);
      converted += 1;
      continue;
    }

    try {
      const nowIso = new Date().toISOString();

      // 1. Ensure the account doc (don't clobber an existing one).
      const accountRef = db.collection('accounts').doc(uid);
      const accountSnap = await accountRef.get();
      const applicationRef = db.collection('membershipApplications').doc();

      if (!accountSnap.exists) {
        await accountRef.set({
          email,
          emailVerified: true, // legacy self-signups were Google-only
          displayName,
          firstName: data.firstName || displayName.split(' ')[0] || '',
          lastName: data.lastName || displayName.split(' ').slice(1).join(' ') || '',
          photoURL: data.photoURL || '',
          phone: data.phone || '',
          accountType: 'supporter',
          authProviders: ['google'],
          membershipApplicationId: applicationRef.id,
          subscriptions: { newsletter: false, volunteer: false, eventReminders: true },
          createdAt: data.joinedAt || nowIso,
          updatedAt: nowIso,
        });
      } else {
        await accountRef.update({
          accountType: 'supporter',
          membershipApplicationId: applicationRef.id,
          updatedAt: nowIso,
        });
      }

      // 2. Capture their membership intent as an explicit application.
      await applicationRef.set({
        accountUid: uid,
        email,
        name: displayName,
        memberType: data.memberType || 'professional',
        occupation: data.occupation || '',
        employer: data.employer || '',
        reason: 'Imported from a pre-accounts self-signup.',
        status: 'submitted',
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      // 3. Mirror the type into a custom claim (best-effort).
      try {
        await auth.setCustomUserClaims(uid, { accountType: 'supporter' });
      } catch (claimErr) {
        console.warn(`     ⚠️  claim set failed for ${email || uid}:`, claimErr);
      }

      // 4. Remove the obsolete pending member doc.
      await docSnap.ref.delete();

      converted += 1;
      console.log(`   ✅  converted: ${email || uid}`);
    } catch (err) {
      failed += 1;
      console.error(`   ❌  failed: ${email || uid}:`, err);
    }
  }

  console.log(
    `\n──────────────\n` +
      `${APPLY ? 'Converted' : 'Would convert'}: ${converted}\n` +
      `Skipped (invited): ${skippedInvited}\n` +
      `Failed: ${failed}\n`,
  );

  if (!APPLY) {
    console.log('ℹ️   Dry run only. Re-run with --apply to perform the migration.\n');
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  });
