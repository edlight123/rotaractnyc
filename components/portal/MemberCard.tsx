'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Linkedin, MessageSquare, MoreHorizontal, ChevronRight } from 'lucide-react';
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
  const [menuOpen, setMenuOpen] = useState(false);
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

  // ── Grid card (default) — photo-first: the entire card is the portrait,
  //    identity on a bottom scrim, quiet glass chips for actions ─────────────
  const isOfficer = m.role !== 'member';
  const subtitle = isOfficer
    ? m.committee
      ? `${roleLabel(m)} · ${m.committee}`
      : roleLabel(m)
    : m.committee || m.occupation || 'Member';

  const menuItemClass =
    'block w-full text-left px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200';

  return (
    <div className="group relative aspect-[4/5] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800">
      {/* Photo — or a quiet silhouette placeholder */}
      {m.photoURL ? (
        <img
          src={m.photoURL}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center pb-[14%] bg-gray-200 dark:bg-gray-800">
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            className="w-[45%] h-auto text-gray-400 dark:text-gray-500"
          >
            <circle cx="12" cy="7.5" r="4.5" />
            <path d="M12 14c-4.97 0-9 3.13-9 7v.5c0 .28.22.5.5.5h17a.5.5 0 0 0 .5-.5V21c0-3.87-4.03-7-9-7z" />
          </svg>
        </div>
      )}

      {/* Bottom scrim — identity, always visible */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3.5 pt-14 pb-3">
        <p className="text-sm font-semibold text-white truncate">{m.displayName}</p>
        <p className="text-[11px] text-white/70 truncate">{subtitle}</p>
      </div>

      {/* Stretched link overlay — makes the whole card navigable */}
      <Link
        href={href}
        aria-label={`View ${m.displayName}'s profile`}
        className="absolute inset-0 z-10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cranberry-500"
      />

      {/* Alumni tag */}
      {m.status === 'alumni' && (
        <div className="absolute top-2 left-2 z-20">
          <Badge variant="gold">Alumni</Badge>
        </div>
      )}

      {/* Actions — glass chips above the stretched link */}
      <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5">
        {onMessage && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMessage();
            }}
            className="w-7 h-7 rounded-md bg-black/35 text-white/90 hover:bg-black/55 backdrop-blur-sm flex items-center justify-center transition-colors"
            title="Send message"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="sr-only">Message {m.displayName}</span>
          </button>
        )}
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((open) => !open);
            }}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="w-7 h-7 rounded-md bg-black/35 text-white/90 hover:bg-black/55 backdrop-blur-sm flex items-center justify-center transition-colors"
            title="More options"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
            <span className="sr-only">More options for {m.displayName}</span>
          </button>
          {menuOpen && (
            <>
              {/* Click-outside backdrop */}
              <div
                className="fixed inset-0 z-20"
                aria-hidden="true"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                }}
              />
              <div
                role="menu"
                className="absolute right-0 top-8 z-30 w-40 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1 text-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <Link href={href} role="menuitem" className={menuItemClass} onClick={() => setMenuOpen(false)}>
                  View profile
                </Link>
                {onMessage && (
                  <button
                    type="button"
                    role="menuitem"
                    className={menuItemClass}
                    onClick={() => {
                      setMenuOpen(false);
                      onMessage();
                    }}
                  >
                    Send message
                  </button>
                )}
                {m.linkedIn && (
                  <a
                    href={m.linkedIn}
                    target="_blank"
                    rel="noopener noreferrer"
                    role="menuitem"
                    className={menuItemClass}
                    onClick={() => setMenuOpen(false)}
                  >
                    LinkedIn
                  </a>
                )}
                {isBoard && whatsAppLink && (
                  <a
                    href={whatsAppLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    role="menuitem"
                    className={menuItemClass}
                    onClick={() => setMenuOpen(false)}
                  >
                    WhatsApp
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
