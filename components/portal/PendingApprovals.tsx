'use client';

import { useState } from 'react';
import { UserRoundCheck, ChevronDown } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';
import type { Member } from '@/types';

const roleColors: Record<string, 'cranberry' | 'gold' | 'azure' | 'gray'> = {
  president: 'cranberry',
  treasurer: 'gold',
  board: 'azure',
  member: 'gray',
};

interface PendingApprovalsProps {
  members: Member[];
  onApprove: (m: Member) => void;
  onReject?: (m: Member) => void;
  /** Only the President can reject/delete records. */
  canReject?: boolean;
  busyId?: string | null;
  duplicateEmails?: Set<string>;
  /** How many rows to show before collapsing behind "Show all". */
  previewCount?: number;
}

/**
 * PendingApprovals — admin-only pinned banner at the top of the Directory.
 *
 * Surfaces members awaiting approval so admins can't miss them, while keeping
 * them out of the member-facing grid. Renders nothing when the queue is empty.
 */
export default function PendingApprovals({
  members,
  onApprove,
  onReject,
  canReject = false,
  busyId,
  duplicateEmails,
  previewCount = 3,
}: PendingApprovalsProps) {
  const [expanded, setExpanded] = useState(false);
  if (members.length === 0) return null;

  const shown = expanded ? members : members.slice(0, previewCount);
  const hiddenCount = members.length - shown.length;

  return (
    <section
      aria-label="Pending member approvals"
      className="rounded-2xl border border-gold-200 dark:border-gold-900/40 bg-gradient-to-br from-gold-50 to-cranberry-50/40 dark:from-gold-900/10 dark:to-cranberry-900/10 overflow-hidden"
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gold-200/70 dark:border-gold-900/30">
        <div className="shrink-0 w-9 h-9 rounded-xl bg-white/70 dark:bg-gray-900/40 flex items-center justify-center text-gold-700 dark:text-gold-400">
          <UserRoundCheck className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h2 className="font-display font-bold text-gray-900 dark:text-white leading-tight">
            Pending Approvals
            <span className="ml-2 align-middle text-xs font-bold px-2 py-0.5 rounded-full bg-gold-200/80 text-gold-900 dark:bg-gold-900/40 dark:text-gold-300">
              {members.length}
            </span>
          </h2>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            {members.length === 1 ? 'A member is' : 'Members are'} awaiting your review.
          </p>
        </div>
      </div>

      <ul className="divide-y divide-gold-200/50 dark:divide-gold-900/20">
        {shown.map((m) => {
          const isDup = duplicateEmails?.has((m.email || '').toLowerCase());
          const name =
            m.displayName || `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email;
          const busy = busyId === m.id;
          return (
            <li key={m.id} className="flex items-center gap-3 px-5 py-3">
              <Avatar src={m.photoURL} alt={name} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{name}</p>
                  {m.role !== 'member' && (
                    <Badge variant={roleColors[m.role] || 'gray'}>{m.role}</Badge>
                  )}
                  {m.boardTitle && <Badge variant="azure">{m.boardTitle}</Badge>}
                  {isDup && <Badge variant="red">Duplicate email</Badge>}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {m.email}
                  {m.committee ? ` · ${m.committee}` : ''}
                  {m.invitedAt ? ` · invited ${new Date(m.invitedAt).toLocaleDateString()}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" onClick={() => onApprove(m)} loading={busy} disabled={busy}>
                  Approve
                </Button>
                {canReject && onReject && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onReject(m)}
                    disabled={busy}
                    className="!text-red-600 hover:!bg-red-50 dark:!text-red-400 dark:hover:!bg-red-900/20"
                  >
                    Reject
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {(hiddenCount > 0 || expanded) && members.length > previewCount && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-gold-800 dark:text-gold-300 hover:bg-gold-100/60 dark:hover:bg-gold-900/20 transition-colors border-t border-gold-200/50 dark:border-gold-900/20"
        >
          {expanded ? 'Show fewer' : `Show all ${members.length}`}
          <ChevronDown className={cn('w-4 h-4 transition-transform', expanded && 'rotate-180')} />
        </button>
      )}
    </section>
  );
}
