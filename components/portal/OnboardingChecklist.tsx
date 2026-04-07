'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { Member, DuesPaymentStatus } from '@/types';

interface OnboardingChecklistProps {
  member: Member;
  duesStatus: DuesPaymentStatus;
  hasRsvp: boolean;
}

interface ChecklistItem {
  label: string;
  href: string;
  done: boolean;
}

const DISMISS_KEY = 'rotaract_onboarding_checklist_dismissed';

export default function OnboardingChecklist({
  member,
  duesStatus,
  hasRsvp,
}: OnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  useEffect(() => {
    const stored = localStorage.getItem(DISMISS_KEY);
    setDismissed(stored === 'true');
  }, []);

  const items: ChecklistItem[] = useMemo(
    () => [
      {
        label: 'Complete profile',
        href: '/portal/profile',
        done: !!(member.firstName && member.lastName && member.bio),
      },
      {
        label: 'Upload photo',
        href: '/portal/profile',
        done: !!member.photoURL,
      },
      {
        label: 'Pay dues',
        href: '/portal/dues',
        done: duesStatus === 'PAID' || duesStatus === 'PAID_OFFLINE' || duesStatus === 'WAIVED',
      },
      {
        label: 'RSVP to an event',
        href: '/portal/events',
        done: hasRsvp,
      },
      {
        label: 'Join a committee',
        href: '/portal/committees',
        done: !!member.committeeId,
      },
    ],
    [member, duesStatus, hasRsvp],
  );

  const completedCount = items.filter((i) => i.done).length;
  const allDone = completedCount === items.length;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, 'true');
  };

  if (dismissed) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-gray-900 dark:text-white text-sm">
          Getting Started
        </h3>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Dismiss onboarding checklist"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
          <span>{completedCount} of {items.length} complete</span>
          <span>{Math.round((completedCount / items.length) * 100)}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-cranberry rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(completedCount / items.length) * 100}%` }}
          />
        </div>
      </div>

      {/* All-done celebration */}
      {allDone ? (
        <div className="text-center py-3">
          <span className="text-2xl" role="img" aria-label="Celebration">
            🎉
          </span>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
            You&apos;re all set!
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            You&apos;ve completed all onboarding steps. Welcome aboard!
          </p>
          <button
            onClick={handleDismiss}
            className="mt-3 text-xs text-cranberry hover:text-cranberry-700 font-medium transition-colors"
          >
            Dismiss
          </button>
        </div>
      ) : (
        /* Checklist items */
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 group"
              >
                {item.done ? (
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                ) : (
                  <span className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 group-hover:border-cranberry transition-colors" />
                )}
                <span
                  className={
                    item.done
                      ? 'text-gray-400 dark:text-gray-500 line-through'
                      : 'text-gray-700 dark:text-gray-300'
                  }
                >
                  {item.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
