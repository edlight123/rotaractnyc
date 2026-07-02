'use client';

/**
 * Board Manager
 * ─────────────
 * Single source of truth for the public Leadership page is the `members`
 * collection. A member appears on /leadership when:
 *   - role ∈ {president, board, treasurer}
 *   - status === 'active'
 *
 * This page lets board+ users:
 *   1. Promote / demote members between member ↔ board / treasurer / president
 *      (role changes are restricted to the President per the members API).
 *   2. Set each board member's `boardTitle` (Secretary, VP, Director of …, etc).
 *   3. Reorder them (writes `boardOrder`).
 *
 * Every save calls the existing PATCH /api/portal/members endpoint, which
 * also revalidates the public Leadership page so changes appear immediately.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Input from '@/components/ui/Input';
import { apiGet, apiPost, apiDelete } from '@/hooks/useFirestore';
import { getCurrentRotaryYear } from '@/lib/utils/rotaryYear';
import { ROTARACT_BOARD_TITLES } from '@/lib/constants';
import {
  Plus,
  Trash2,
  X,
  Check,
  Users,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  Pencil,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PortalMember {
  uid: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  photoURL?: string;
  linkedIn?: string;
  bio?: string;
  role: 'member' | 'board' | 'treasurer' | 'president';
  status: string;
  boardTitle?: string;
  boardOrder?: number;
}

const BOARD_ROLES = ['president', 'board', 'treasurer'] as const;
const TITLE_OPTIONS = [...ROTARACT_BOARD_TITLES, 'Custom…'] as const;

// ─── Add Member Modal ────────────────────────────────────────────────────────

interface AddModalProps {
  candidates: PortalMember[];
  onAdd: (member: PortalMember, title: string, role: 'board' | 'treasurer' | 'president') => Promise<void>;
  onClose: () => void;
  isPresident: boolean;
}

function AddBoardMemberModal({ candidates, onAdd, onClose, isPresident }: AddModalProps) {
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<PortalMember | null>(null);
  const [title, setTitle] = useState<string>('');
  const [customTitle, setCustomTitle] = useState('');
  const [role, setRole] = useState<'board' | 'treasurer' | 'president'>('board');
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(
    () =>
      search.trim()
        ? candidates
            .filter((m) =>
              m.displayName.toLowerCase().includes(search.toLowerCase()),
            )
            .slice(0, 8)
        : [],
    [candidates, search],
  );

  const finalTitle = title === 'Custom…' ? customTitle.trim() : title;
  const canSubmit = !!picked && !!finalTitle && !busy;

  async function submit() {
    if (!picked || !finalTitle) return;
    setBusy(true);
    try {
      await onAdd(picked, finalTitle, role);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white">
            Add Board Member
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Member picker */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
            Pick an existing member *
          </label>
          {picked ? (
            <div className="flex items-center gap-3 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <Avatar src={picked.photoURL} alt={picked.displayName} size="sm" />
              <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">
                {picked.displayName}
              </span>
              <button
                onClick={() => {
                  setPicked(null);
                  setSearch('');
                }}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <Input
                placeholder="Search active members by name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {filtered.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-10 overflow-hidden max-h-48 overflow-y-auto">
                  {filtered.map((m) => (
                    <button
                      key={m.uid}
                      onClick={() => setPicked(m)}
                      className="flex items-center gap-3 w-full px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                    >
                      <Avatar src={m.photoURL} alt={m.displayName} size="sm" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {m.displayName}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-2 text-xs text-gray-400">
                Don&rsquo;t see them? Add or invite them via the{' '}
                <a href="/portal/directory" className="text-cranberry hover:underline">
                  Directory
                </a>{' '}
                first.
              </p>
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
            Board Title *
          </label>
          <select
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cranberry"
          >
            <option value="">— Select a title —</option>
            {TITLE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {title === 'Custom…' && (
            <Input
              className="mt-2"
              placeholder="Enter custom title"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
            />
          )}
        </div>

        {/* Role (president-only) */}
        {isPresident && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Portal Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cranberry"
            >
              <option value="board">Board (default — admin access)</option>
              <option value="treasurer">Treasurer</option>
              <option value="president">President</option>
            </select>
            <p className="mt-1.5 text-xs text-gray-400">
              This grants admin access to the portal. Only the President can change roles.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {busy ? <Spinner size="sm" className="mr-1" /> : <Check className="w-4 h-4 mr-1" />}
            Add to Board
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Title Modal ────────────────────────────────────────────────────────

interface EditTitleModalProps {
  member: PortalMember;
  onSave: (title: string) => Promise<void>;
  onClose: () => void;
}

function EditTitleModal({ member, onSave, onClose }: EditTitleModalProps) {
  const presetMatch = ROTARACT_BOARD_TITLES.includes(member.boardTitle as any);
  const [title, setTitle] = useState<string>(presetMatch ? (member.boardTitle as string) : 'Custom…');
  const [customTitle, setCustomTitle] = useState(presetMatch ? '' : member.boardTitle || '');
  const [busy, setBusy] = useState(false);

  const finalTitle = title === 'Custom…' ? customTitle.trim() : title;

  async function submit() {
    if (!finalTitle) return;
    setBusy(true);
    try {
      await onSave(finalTitle);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white">
            Edit Title — {member.displayName}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
            Board Title *
          </label>
          <select
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cranberry"
          >
            {TITLE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {title === 'Custom…' && (
            <Input
              className="mt-2"
              placeholder="Enter custom title"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
            />
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!finalTitle || busy}>
            {busy ? <Spinner size="sm" className="mr-1" /> : <Check className="w-4 h-4 mr-1" />}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

// ─── Past Boards ─────────────────────────────────────────────────────────────
// Archived rosters from previous Rotary years, shown here and on the public
// /leadership page. "Archive current board" snapshots the live roster above.

interface PastBoard {
  year: string;
  members: Array<{ name: string; title: string; photoURL?: string }>;
}

function PastBoardsSection({ isPresident }: { isPresident: boolean }) {
  const { toast } = useToast();
  const [boards, setBoards] = useState<PastBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [showArchiveForm, setShowArchiveForm] = useState(false);
  const [expandedYear, setExpandedYear] = useState<string | null>(null);
  // Default to the PREVIOUS Rotary year — that's the board you usually archive.
  const [archiveYear, setArchiveYear] = useState(() => {
    const [start] = getCurrentRotaryYear().split('-').map(Number);
    return `${start - 1}-${start}`;
  });

  const load = useCallback(async () => {
    try {
      const data = await apiGet('/api/portal/past-boards');
      setBoards(data.boards || []);
    } catch {
      // non-fatal — section just shows empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const archiveCurrent = async () => {
    if (!/^\d{4}-\d{4}$/.test(archiveYear.trim())) {
      toast('Year must look like 2025-2026', 'error');
      return;
    }
    setArchiving(true);
    try {
      const res = await apiPost('/api/portal/past-boards', { year: archiveYear.trim(), archiveCurrent: true });
      toast(`Archived ${res.count} members as the ${res.year} board`);
      setShowArchiveForm(false);
      await load();
    } catch (err: any) {
      toast(err.message || 'Failed to archive board', 'error');
    } finally {
      setArchiving(false);
    }
  };

  const deleteYear = async (year: string) => {
    if (!confirm(`Delete the archived ${year} board? This removes it from the public Leadership page.`)) return;
    try {
      await apiDelete(`/api/portal/past-boards?year=${encodeURIComponent(year)}`);
      toast(`Deleted ${year} board`);
      await load();
    } catch (err: any) {
      toast(err.message || 'Failed to delete', 'error');
    }
  };

  return (
    <div className="pt-8">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white">Past Boards</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Archived rosters from previous Rotary years — shown on the public Leadership page.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setShowArchiveForm((v) => !v)}>
          Archive current board
        </Button>
      </div>

      {showArchiveForm && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 mb-3 flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Rotary year to file the current roster under
            </label>
            <Input value={archiveYear} onChange={(e) => setArchiveYear(e.target.value)} placeholder="2025-2026" />
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" onClick={archiveCurrent} loading={archiving}>Archive</Button>
            <Button size="sm" variant="secondary" onClick={() => setShowArchiveForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-8 flex justify-center"><Spinner /></div>
      ) : boards.length === 0 ? (
        <div className="text-center py-8 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-400">No past boards archived yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {boards.map((pb) => (
            <div key={pb.year} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => setExpandedYear(expandedYear === pb.year ? null : pb.year)}
                  className="flex-1 flex items-center gap-2 text-left"
                >
                  <span className="text-sm font-semibold text-cranberry">{pb.year}</span>
                  <span className="text-xs text-gray-400">{pb.members.length} members</span>
                </button>
                {isPresident && (
                  <button
                    onClick={() => deleteYear(pb.year)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title={`Delete ${pb.year} archive`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {expandedYear === pb.year && (
                <ul className="px-4 pb-3 space-y-1.5 border-t border-gray-100 dark:border-gray-800 pt-3">
                  {pb.members.map((m, i) => (
                    <li key={`${m.name}-${i}`} className="flex items-center gap-2 text-sm">
                      <Avatar src={m.photoURL} alt={m.name} size="sm" />
                      <span className="font-medium text-gray-900 dark:text-white">{m.name}</span>
                      <span className="text-xs text-gray-400 ml-auto">{m.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BoardManagerPage() {
  const { member, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [allMembers, setAllMembers] = useState<PortalMember[]>([]);
  const [fetching, setFetching] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editTitleFor, setEditTitleFor] = useState<PortalMember | null>(null);

  const hasAccess = member && ['president', 'board', 'treasurer'].includes(member.role);
  const isPresident = member?.role === 'president';

  useEffect(() => {
    if (!loading && !hasAccess) router.push('/portal');
  }, [loading, hasAccess, router]);

  const load = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch('/api/portal/members');
      const data = await res.json();
      setAllMembers(Array.isArray(data) ? data : []);
    } catch {
      toast('Failed to load members', 'error');
    } finally {
      setFetching(false);
    }
  }, [toast]);

  useEffect(() => {
    if (hasAccess) load();
  }, [hasAccess, load]);

  // Active board members, sorted
  const board = useMemo(
    () =>
      allMembers
        .filter((m) => BOARD_ROLES.includes(m.role as any) && m.status === 'active')
        .sort((a, b) => {
          const ao = typeof a.boardOrder === 'number' ? a.boardOrder : 999;
          const bo = typeof b.boardOrder === 'number' ? b.boardOrder : 999;
          if (ao !== bo) return ao - bo;
          return (a.displayName || '').localeCompare(b.displayName || '');
        }),
    [allMembers],
  );

  // Active members not yet on the board (candidates for "Add")
  const candidates = useMemo(
    () =>
      allMembers
        .filter((m) => m.status === 'active' && !BOARD_ROLES.includes(m.role as any))
        .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '')),
    [allMembers],
  );

  // ── PATCH helper ────────────────────────────────────────────────────────
  async function patchMember(memberId: string, body: Record<string, any>) {
    const res = await fetch('/api/portal/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, ...body }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed (${res.status})`);
    }
    return res.json();
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  async function addToBoard(
    m: PortalMember,
    title: string,
    role: 'board' | 'treasurer' | 'president',
  ) {
    setSavingId(m.uid);
    try {
      const newOrder = board.length; // append at the end
      const updates: Record<string, any> = {
        boardTitle: title,
        boardOrder: newOrder,
        // Always request the role change. Server enforces permissions:
        //   - President: any role
        //   - Board/Treasurer: can only promote member → board
        role: isPresident ? role : 'board',
      };
      await patchMember(m.uid, updates);
      toast('Added to board — invite email sent. Leadership page updated.');
      setShowAdd(false);
      await load();
    } catch (e: any) {
      toast(e.message || 'Failed to add', 'error');
    } finally {
      setSavingId(null);
    }
  }

  async function removeFromBoard(m: PortalMember) {
    if (!isPresident) {
      toast('Only the President can change roles.', 'error');
      return;
    }
    if (!confirm(`Remove ${m.displayName} from the board? They will remain a regular member.`)) return;
    setSavingId(m.uid);
    try {
      await patchMember(m.uid, { role: 'member', boardTitle: '', boardOrder: null });
      toast('Removed from board — Leadership page updated.');
      await load();
    } catch (e: any) {
      toast(e.message || 'Failed to remove', 'error');
    } finally {
      setSavingId(null);
    }
  }

  async function updateTitle(m: PortalMember, title: string) {
    setSavingId(m.uid);
    try {
      await patchMember(m.uid, { boardTitle: title });
      toast('Title updated.');
      setEditTitleFor(null);
      await load();
    } catch (e: any) {
      toast(e.message || 'Failed to update title', 'error');
    } finally {
      setSavingId(null);
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= board.length) return;
    const a = board[index];
    const b = board[target];

    // Swap orders. Both members may currently have undefined/equal orders, so
    // rewrite to canonical sequential numbers.
    const reordered = [...board];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    setSavingId(`reorder`);
    try {
      // Persist new order for the two affected entries (and any with undefined
      // order to lock in a stable sequence).
      await Promise.all(
        reordered.map((m, i) =>
          m.boardOrder !== i ? patchMember(m.uid, { boardOrder: i }) : null,
        ),
      );
      await load();
    } catch (e: any) {
      toast(e.message || 'Failed to reorder', 'error');
    } finally {
      setSavingId(null);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading || fetching) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }
  if (!member || !hasAccess) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
            Board Manager
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manages the active board roster on the public{' '}
            <a
              href="/leadership"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cranberry hover:underline inline-flex items-center gap-0.5"
            >
              Leadership page <ExternalLink className="w-3 h-3" />
            </a>
            . Changes save and publish immediately.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Board Member
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
        <strong>How this works:</strong> Adding someone here grants them admin
        access to the portal and emails them a board-invite. They appear on the
        public Leadership page immediately.
        {!isPresident && (
          <span className="block mt-1 text-xs text-blue-700 dark:text-blue-400">
            You can promote members to <em>Board</em>. Only the President can
            assign <em>Treasurer</em> or <em>President</em>, or remove someone
            from the board.
          </span>
        )}
      </div>

      {/* Roster */}
      {board.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
          <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="font-display font-bold text-gray-900 dark:text-white mb-2">
            No board members yet
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Promote an existing active member to the board.
          </p>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add First Board Member
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {board.map((entry, i) => (
            <div
              key={entry.uid}
              className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3 group"
            >
              {/* Reorder arrows */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0 || savingId !== null}
                  className="p-0.5 text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-20 disabled:cursor-not-allowed"
                  title="Move up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === board.length - 1 || savingId !== null}
                  className="p-0.5 text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-20 disabled:cursor-not-allowed"
                  title="Move down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Position number */}
              <span className="text-xs font-mono text-gray-300 dark:text-gray-600 w-4 text-center shrink-0">
                {i + 1}
              </span>

              {/* Avatar */}
              <Avatar src={entry.photoURL} alt={entry.displayName} size="sm" />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {entry.displayName}
                </p>
                <p className="text-xs text-cranberry font-medium">
                  {entry.boardTitle ||
                    (entry.role === 'president'
                      ? 'President'
                      : entry.role === 'treasurer'
                      ? 'Treasurer'
                      : 'Board Member')}
                  <span className="ml-1.5 text-gray-400 font-normal">
                    · {entry.role}
                  </span>
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setEditTitleFor(entry)}
                  disabled={savingId !== null}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30"
                  title="Edit title"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {isPresident && (
                  <button
                    onClick={() => removeFromBoard(entry)}
                    disabled={savingId !== null}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-30"
                    title="Remove from board"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {savingId === entry.uid && <Spinner size="sm" />}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Past boards */}
      <PastBoardsSection isPresident={!!isPresident} />

      {/* Modals */}
      {showAdd && (
        <AddBoardMemberModal
          candidates={candidates}
          onAdd={addToBoard}
          onClose={() => setShowAdd(false)}
          isPresident={!!isPresident}
        />
      )}
      {editTitleFor && (
        <EditTitleModal
          member={editTitleFor}
          onSave={(t) => updateTitle(editTitleFor, t)}
          onClose={() => setEditTitleFor(null)}
        />
      )}
    </div>
  );
}
