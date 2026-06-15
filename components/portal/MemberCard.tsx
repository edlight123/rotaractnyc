'use client';

import Link from 'next/link';
import { Linkedin, MessageSquare, Phone, ChevronRight } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/utils/cn';
import type { Member } from '@/types';

const roleColors: Record<string, 'cranberry' | 'gold' | 'azure' | 'gray'> = {
  president: 'cranberry',
  treasurer: 'gold',
  board: 'azure',
  member: 'gray',
};

/** Human-readable role label, preferring boardTitle for board members. */
function roleLabel(m: Member): string {
  if (m.boardTitle) return m.boardTitle;
  const map: Record<string, string> = {
    president: 'President',
    treasurer: 'Treasurer',
    board: 'Board',
    member: 'Member',
  };
  return map[m.role] ?? m.role;
}

function initialsOf(name?: string): string {
  return String(name ?? '')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface MemberCardProps {
  member: Member;
  viewerRole?: string;
  onMessage?: () => void;
  /**
   * Layout:
   *  - `grid`    → full photo card (directory grid, default)
   *  - `list`    → dense horizontal row (directory list view)
   *  - `compact` → minimal row (sidebars / widgets)
   */
  variant?: 'grid' | 'list' | 'compact';
}

/**
 * MemberCard — accessible by design.
 *
 * A single stretched <Link> overlay makes the whole card navigable to the
 * member profile, while action buttons sit above it (higher z-index) and
 * handle their own clicks — no nested-button `stopPropagation` hacks.
 */
export default function MemberCard({ member: m, viewerRole, onMessage, variant = 'grid' }: MemberCardProps) {
  const isBoard = ['president', 'board', 'treasurer'].includes(viewerRole || '');
  const whatsAppNumber = m.whatsAppSameAsPhone ? m.phone : m.whatsAppPhone;
  const whatsAppLink = whatsAppNumber ? `https://wa.me/${whatsAppNumber.replace(/\D/g, '')}` : null;
  const initials = initialsOf(m.displayName);
  const href = `/portal/directory/${m.id}`;

  const roleDot =
    m.role === 'president' ? 'bg-cranberry' : m.role === 'treasurer' ? 'bg-gold' : 'bg-azure';

  // ── Compact layout (sidebars, widget use) ─────────────────────────────────
  if (variant === 'compact') {
    return (
      <Link
        href={href}
        className="group flex items-center gap-3 p-3 rounded-xl border border-gray-200/60 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-cranberry-200 dark:hover:border-cranberry-800 hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cranberry-500"
      >
        <div className="relative shrink-0">
          {m.photoURL ? (
            <img src={m.photoURL} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-gray-800" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-cranberry-100 dark:bg-cranberry-900/40 flex items-center justify-center ring-2 ring-white dark:ring-gray-800">
              <span className="text-sm font-bold text-cranberry-700 dark:text-cranberry-300">{initials}</span>
            </div>
          )}
          {m.role !== 'member' && (
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center shadow-sm">
              <div className={cn('w-2.5 h-2.5 rounded-full', roleDot)} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 dark:text-white truncate group-hover:text-cranberry transition-colors">{m.displayName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{roleLabel(m)}{m.committee ? ` · ${m.committee}` : ''}</p>
        </div>
      </Link>
    );
  }

  // ── List layout (dense, scannable rows) ───────────────────────────────────
  if (variant === 'list') {
    return (
      <div className="group relative flex items-center gap-4 p-3 sm:p-4 bg-white dark:bg-gray-900 hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors">
        {/* Stretched link overlay */}
        <Link
          href={href}
          aria-label={`View ${m.displayName}'s profile`}
          className="absolute inset-0 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cranberry-500"
        />
        <div className="relative shrink-0">
          {m.photoURL ? (
            <img src={m.photoURL} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-white dark:ring-gray-800" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-cranberry-100 dark:bg-cranberry-900/40 flex items-center justify-center ring-2 ring-white dark:ring-gray-800">
              <span className="text-sm font-bold text-cranberry-700 dark:text-cranberry-300">{initials}</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate group-hover:text-cranberry dark:group-hover:text-cranberry-400 transition-colors">
              {m.displayName}
            </p>
            {m.role !== 'member' && <Badge variant={roleColors[m.role] || 'gray'}>{roleLabel(m)}</Badge>}
            {m.status === 'alumni' && <Badge variant="gold">Alumni</Badge>}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {m.committee || 'No committee'}
            {m.occupation ? ` · ${m.occupation}` : ''}
          </p>
        </div>

        {/* Quick actions — above the stretched link */}
        <div className="relative z-20 flex items-center gap-1 shrink-0">
          {onMessage && (
            <button
              type="button"
              onClick={onMessage}
              className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center text-cranberry hover:bg-cranberry-50 dark:hover:bg-cranberry-900/20 transition-colors"
              title="Send message"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="sr-only">Message {m.displayName}</span>
            </button>
          )}
          {m.linkedIn && (
            <a
              href={m.linkedIn}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center text-cranberry hover:bg-cranberry-50 dark:hover:bg-cranberry-900/20 transition-colors"
              title="LinkedIn"
            >
              <Linkedin className="w-4 h-4" />
              <span className="sr-only">LinkedIn</span>
            </a>
          )}
          <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-cranberry transition-colors" aria-hidden="true" />
        </div>
      </div>
    );
  }

  // ── Full magazine-style grid card (default) ───────────────────────────────
  return (
    <div className="group relative bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200/60 dark:border-gray-800 transition-all duration-200 hover:shadow-xl hover:shadow-cranberry-900/5 hover:-translate-y-0.5 hover:border-cranberry-200/70 dark:hover:border-cranberry-800/70">
      {/* Stretched link overlay — makes the whole card navigable */}
      <Link
        href={href}
        aria-label={`View ${m.displayName}'s profile`}
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cranberry-500"
      />

      {/* Photo / avatar hero — now in full color */}
      <div className="h-48 overflow-hidden bg-cranberry-50 dark:bg-cranberry-950/20 relative">
        {m.photoURL ? (
          <img
            src={m.photoURL}
            alt=""
            className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cranberry-50 to-gold-50 dark:from-cranberry-950/30 dark:to-gold-950/20">
            <div className="w-20 h-20 rounded-full bg-white/70 dark:bg-gray-900/40 flex items-center justify-center shadow-sm">
              <span className="text-2xl font-bold text-cranberry-700 dark:text-cranberry-300 select-none">
                {initials}
              </span>
            </div>
          </div>
        )}
        {/* Role badge overlay (board/officer roles) */}
        {m.role !== 'member' && (
          <div className="absolute top-2 right-2">
            <Badge variant={roleColors[m.role] || 'gray'}>{roleLabel(m)}</Badge>
          </div>
        )}
        {m.status === 'alumni' && (
          <div className="absolute top-2 left-2">
            <Badge variant="gold">Alumni</Badge>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-4">
        <div className="mb-3">
          <h3 className="font-display font-semibold text-gray-900 dark:text-white group-hover:text-cranberry dark:group-hover:text-cranberry-400 transition-colors leading-tight truncate">
            {m.displayName}
          </h3>
          {m.committee ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">{m.committee}</p>
          ) : (
            m.role === 'member' && (
              <p className="text-xs font-semibold uppercase tracking-wider text-gold-600 dark:text-gold-400 mt-1">Member</p>
            )
          )}
          {m.occupation && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5 truncate">
              {m.occupation}{m.employer ? ` · ${m.employer}` : ''}
            </p>
          )}
        </div>

        {/* Action row — above the stretched link (z-20) so clicks don't navigate */}
        <div className="relative z-20 flex items-center gap-1 pt-3 border-t border-gray-100 dark:border-gray-800">
          {onMessage && (
            <button
              type="button"
              onClick={onMessage}
              className="w-8 h-8 rounded-full flex items-center justify-center text-cranberry hover:bg-cranberry-50 dark:hover:bg-cranberry-900/20 transition-colors"
              title="Send message"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="sr-only">Message {m.displayName}</span>
            </button>
          )}
          {m.linkedIn && (
            <a
              href={m.linkedIn}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full flex items-center justify-center text-cranberry hover:bg-cranberry-50 dark:hover:bg-cranberry-900/20 transition-colors"
              title="LinkedIn"
            >
              <Linkedin className="w-4 h-4" />
              <span className="sr-only">LinkedIn profile</span>
            </a>
          )}
          {isBoard && whatsAppLink && (
            <a
              href={whatsAppLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full flex items-center justify-center text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
              title="WhatsApp"
            >
              <Phone className="w-4 h-4" />
              <span className="sr-only">WhatsApp</span>
            </a>
          )}
          <span
            className="ml-auto w-8 h-8 rounded-full flex items-center justify-center text-gray-400 group-hover:text-cranberry transition-colors"
            aria-hidden="true"
          >
            <ChevronRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </div>
  );
}
