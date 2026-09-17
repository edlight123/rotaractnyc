'use client';

import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import { useAllMembers } from '@/hooks/useFirestore';
import { formatDate } from '@/lib/utils/format';
import {
  missingProfileFields,
  PROFILE_FIELD_LABELS,
} from '@/lib/utils/profileCompleteness';
import type { Member } from '@/types';

/**
 * Who still owes the club a profile.
 *
 * The spec deliberately stops short of blocking induction in software —
 * something that can strand a real person on the night is a liability. This
 * is the mechanism instead: a list someone can work through beforehand.
 *
 * Alumni and inactive members are excluded. Chasing a bio from someone who
 * left in 2019 helps nobody, and a list full of them is a list nobody reads.
 */
export default function IncompleteProfilesPanel() {
  const { data: members, loading } = useAllMembers();

  if (loading) {
    return <div className="h-32 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />;
  }

  const chaseable = ((members || []) as Member[])
    .filter((m) => m.status === 'active' || m.status === 'pending')
    .filter((m) => !m.isSystemAccount)
    .map((m) => ({ member: m, missing: missingProfileFields(m) }))
    .filter((row) => row.missing.length > 0)
    .sort((a, b) => String(b.member.joinedAt ?? '').localeCompare(String(a.member.joinedAt ?? '')));

  if (chaseable.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Everyone&rsquo;s profile is complete.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {chaseable.length} {chaseable.length === 1 ? 'member has' : 'members have'} not finished
        their profile. Newest first, so the people closest to induction are at the top.
      </p>

      <ul className="divide-y divide-gray-100 dark:divide-gray-800 rounded-2xl border border-gray-200 dark:border-gray-800">
        {chaseable.map(({ member, missing }) => (
          <li key={member.id} className="flex items-start gap-3 p-3.5">
            <Avatar src={member.photoURL} alt={member.displayName} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                {member.displayName}
                {member.status === 'pending' && <Badge variant="gold">Pending</Badge>}
              </p>
              <p className="truncate text-xs text-gray-400">{member.email}</p>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                Missing: {missing.map((f) => PROFILE_FIELD_LABELS[f]).join(', ')}
              </p>
            </div>
            {member.joinedAt && (
              <span className="hidden shrink-0 text-xs text-gray-400 sm:block">
                Joined {formatDate(member.joinedAt)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
