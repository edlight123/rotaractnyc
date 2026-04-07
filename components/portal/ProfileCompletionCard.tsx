'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import type { Member } from '@/types';

/* ── Icons ── */
const SparklesIcon = () => (
  <svg aria-hidden="true" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

const XIcon = () => (
  <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg aria-hidden="true" className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

/* ── Field definitions ── */
interface FieldDef {
  label: string;
  weight: number;
  href: string;
  check: (m: Member) => boolean;
}

const PROFILE_FIELDS: FieldDef[] = [
  { label: 'Display name',       weight: 10, href: '/portal/profile', check: (m) => !!m.displayName?.trim() },
  { label: 'First & last name',  weight: 10, href: '/portal/profile', check: (m) => !!m.firstName?.trim() && !!m.lastName?.trim() },
  { label: 'Profile photo',      weight: 15, href: '/portal/profile', check: (m) => !!m.photoURL },
  { label: 'Bio',                weight: 15, href: '/portal/profile', check: (m) => !!m.bio?.trim() },
  { label: 'Phone number',       weight: 10, href: '/portal/profile', check: (m) => !!m.phone?.trim() },
  { label: 'Occupation',         weight: 10, href: '/portal/profile', check: (m) => !!m.occupation?.trim() },
  { label: 'Employer',           weight: 10, href: '/portal/profile', check: (m) => !!m.employer?.trim() },
  { label: 'Interests',          weight: 10, href: '/portal/profile', check: (m) => Array.isArray(m.interests) && m.interests.length > 0 },
  { label: 'LinkedIn',           weight:  5, href: '/portal/profile', check: (m) => !!m.linkedIn?.trim() },
  { label: 'Committee',          weight:  5, href: '/portal/committees', check: (m) => !!m.committee || !!m.committeeId },
];

/* ── Helpers ── */
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getDismissKey(memberId: string) {
  return `profile-prompt-dismissed-${memberId}`;
}

function isDismissedRecently(memberId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(getDismissKey(memberId));
    if (!raw) return false;
    const dismissedAt = Number(raw);
    return Date.now() - dismissedAt < DISMISS_DURATION_MS;
  } catch {
    return false;
  }
}

/* ── Component ── */
interface ProfileCompletionCardProps {
  member: Member;
  className?: string;
}

function ProfileCompletionCard({ member, className }: ProfileCompletionCardProps) {
  const [dismissed, setDismissed] = useState(true); // default hidden to avoid flash

  useEffect(() => {
    setDismissed(isDismissedRecently(member.id));
  }, [member.id]);

  const { percentage, incomplete } = useMemo(() => {
    let score = 0;
    const missing: FieldDef[] = [];

    for (const field of PROFILE_FIELDS) {
      if (field.check(member)) {
        score += field.weight;
      } else {
        missing.push(field);
      }
    }

    return { percentage: score, incomplete: missing };
  }, [member]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(getDismissKey(member.id), String(Date.now()));
    } catch { /* storage full / blocked — ignore */ }
  };

  // Don't render if dismissed or 100% complete with nothing to show
  if (dismissed && percentage === 100) return null;
  if (dismissed) return null;

  const isComplete = percentage === 100;
  const isAlmostThere = percentage >= 80 && percentage < 100;

  return (
    <div
      className={cn(
        'relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 sm:p-5 transition-all duration-300',
        className,
      )}
    >
      {/* Dismiss button */}
      {!isComplete && (
        <button
          onClick={handleDismiss}
          aria-label="Dismiss profile completion prompt"
          className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
        >
          <XIcon />
        </button>
      )}

      {/* ── 100 % complete state ── */}
      {isComplete ? (
        <div className="flex items-center gap-3 py-1">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
            <SparklesIcon />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Profile 100% complete — nice work! 🎉
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              You&apos;re all set. Your profile is visible to fellow members in the directory.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Header row */}
          <div className="flex items-start gap-3 pr-8">
            <div className="w-10 h-10 rounded-full bg-cranberry-50 dark:bg-cranberry-900/20 flex items-center justify-center shrink-0 text-cranberry dark:text-cranberry-400">
              <svg aria-hidden="true" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {isAlmostThere ? 'Almost there!' : 'Complete your profile'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {isAlmostThere
                  ? `Just a few more details to finish your profile.`
                  : `A complete profile helps fellow Rotaractors connect with you.`}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Progress</span>
              <span className="text-xs font-bold text-cranberry dark:text-cranberry-400">{percentage}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cranberry to-cranberry-600 transition-all duration-500 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Suggestions list */}
          <ul className="mt-3 space-y-1" role="list">
            {incomplete.map((field) => (
              <li key={field.label}>
                <Link
                  href={field.href}
                  className="group flex items-center gap-2 px-2 py-1.5 -mx-2 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <span className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600 shrink-0 group-hover:border-cranberry dark:group-hover:border-cranberry-400 transition-colors" />
                  <span className="flex-1">Add {field.label.toLowerCase()}</span>
                  <ChevronRightIcon />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default ProfileCompletionCard;
