'use client';

import Link from 'next/link';
import { UserPen } from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth';
import {
  missingProfileFields,
  PROFILE_FIELD_LABELS,
} from '@/lib/utils/profileCompleteness';

/**
 * The ambient half of the backfill.
 *
 * Thirty-five of thirty-eight active members completed onboarding and left no
 * bio behind, because step 2 never validated anything. Those people are not
 * new and should not be marched back through a four-step wizard — this points
 * them at a short page with only the fields they are missing.
 *
 * It does not dismiss. A prompt you can wave away is one people wave away,
 * and the whole reason we are here is an ask that nothing enforced. It
 * disappears the moment the profile is complete, which is the only exit.
 *
 * The copy has one job beyond the ask: explain why someone who already
 * finished onboarding is being asked again. Without that it reads as the
 * product being broken.
 */
export default function ProfilePrompt() {
  const { member } = useAuth();

  // Nothing to say while auth is still resolving.
  if (!member) return null;

  const missing = missingProfileFields(member);
  if (missing.length === 0) return null;

  return (
    <div className="rounded-2xl border border-gold-300 bg-gold-50 p-5 dark:border-gold-900/50 dark:bg-gold-950/20">
      <div className="flex items-start gap-3.5">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-200 text-gold-900 dark:bg-gold-900/40 dark:text-gold-200">
          <UserPen className="h-4.5 w-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="font-display font-bold text-gray-900 dark:text-white">
            Your profile is missing a few things
          </h3>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
            We used to collect this over email, so most members never filled it in here.
            It is what the club reads at inductions and what other members see in the
            directory.
          </p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Still needed: {missing.map((f) => PROFILE_FIELD_LABELS[f]).join(', ')}.
          </p>
          <Link
            href="/portal/profile/complete"
            className="mt-3.5 inline-flex btn-sm bg-cranberry text-white font-semibold rounded-xl hover:bg-cranberry-800 transition-colors"
          >
            Finish your profile
          </Link>
        </div>
      </div>
    </div>
  );
}
