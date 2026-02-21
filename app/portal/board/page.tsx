'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Input from '@/components/ui/Input';
import {
  GripVertical,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Users,
  ExternalLink,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BoardEntry {
  id: string;
  name: string;
  title: string;
  photoURL: string;
  linkedIn: string;
  bio: string;
  memberId: string; // UID of linked portal member (optional)
  order: number;
}

interface PortalMember {
  uid: string;
  displayName: string;
  photoURL?: string;
  linkedIn?: string;
  role: string;
  status: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ROTARACT_TITLES = [
  'President',
  'Immediate Past President',
  'President-Elect',
  'Vice President',
  'VP of Service',
  'VP of Fellowship',
  'VP of Membership',
  'VP of Administration',
  'VP of Professional Development',
  'Secretary',
  'Treasurer',
  'Sergeant-at-Arms',
  'Director at Large',
  'Public Relations Director',
  'Technology Director',
  'Social Media Chair',
  'Alumni Relations Chair',
  'Community Service Chair',
  'International Service Chair',
  'Professional Development Chair',
  'Fundraising Chair',
  'Custom…',
];

const EMPTY_ENTRY: Omit<BoardEntry, 'id' | 'order'> = {
  name: '',
  title: '',
  photoURL: '',
  linkedIn: '',
  bio: '',
  memberId: '',
};

// ─── Helper ──────────────────────────────────────────────────────────────────

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Edit / Add Form Modal ────────────────────────────────────────────────────

interface FormModalProps {
  entry: BoardEntry | null; // null = add new
  members: PortalMember[];
  onSave: (entry: BoardEntry) => void;
  onClose: () => void;
}

function FormModal({ entry, members, onSave, onClose }: FormModalProps) {
  const isNew = !entry;
  const [form, setForm] = useState<Omit<BoardEntry, 'id' | 'order'>>(() =>
    entry ? { name: entry.name, title: entry.title, photoURL: entry.photoURL, linkedIn: entry.linkedIn, bio: entry.bio, memberId: entry.memberId }
          : { ...EMPTY_ENTRY },
  );
  const [customTitle, setCustomTitle] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [titleMode, setTitleMode] = useState<'select' | 'custom'>(
    entry && entry.title && !ROTARACT_TITLES.includes(entry.title) ? 'custom' : 'select',
  );

  // Pre-populate search with linked member name
  useEffect(() => {
    if (entry?.memberId) {
      const m = members.find((m) => m.uid === entry.memberId);
      if (m) setMemberSearch(m.displayName);
    }
  }, [entry, members]);

  const filteredMembers = memberSearch.trim().length > 0
    ? members.filter((m) =>
        m.displayName.toLowerCase().includes(memberSearch.toLowerCase()) && m.status === 'active',
      )
    : [];

  function linkMember(m: PortalMember) {
    setForm((f) => ({
      ...f,
      memberId: m.uid,
      name: f.name || m.displayName,
      photoURL: f.photoURL || m.photoURL || '',
      linkedIn: f.linkedIn || m.linkedIn || '',
    }));
    setMemberSearch(m.displayName);
  }

  function unlinkMember() {
    setForm((f) => ({ ...f, memberId: '' }));
    setMemberSearch('');
  }

  function handleTitleChange(val: string) {
    if (val === 'Custom…') {
      setTitleMode('custom');
      setForm((f) => ({ ...f, title: '' }));
    } else {
      setTitleMode('select');
      setForm((f) => ({ ...f, title: val }));
    }
  }

  function handleSubmit() {
    const finalTitle = titleMode === 'custom' ? customTitle.trim() : form.title;
    if (!form.name.trim()) return;
    if (!finalTitle) return;
    onSave({
      id: entry?.id ?? newId(),
      order: entry?.order ?? 999,
      ...form,
      title: finalTitle,
    });
  }

  const linkedMember = form.memberId ? members.find((m) => m.uid === form.memberId) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white">
            {isNew ? 'Add Board Member' : 'Edit Board Member'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Link to portal member */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
            Link to Portal Member <span className="font-normal normal-case text-gray-400">(optional — auto-fills photo &amp; LinkedIn)</span>
          </label>
          {linkedMember ? (
            <div className="flex items-center gap-3 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <Avatar src={linkedMember.photoURL} alt={linkedMember.displayName} size="sm" />
              <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">{linkedMember.displayName}</span>
              <button onClick={unlinkMember} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Unlink</button>
            </div>
          ) : (
            <div className="relative">
              <Input
                placeholder="Search by name…"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />
              {filteredMembers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-10 overflow-hidden max-h-48 overflow-y-auto">
                  {filteredMembers.map((m) => (
                    <button
                      key={m.uid}
                      onClick={() => linkMember(m)}
                      className="flex items-center gap-3 w-full px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                    >
                      <Avatar src={m.photoURL} alt={m.displayName} size="sm" />
                      <span className="text-sm text-gray-900 dark:text-white">{m.displayName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
            Full Name *
          </label>
          <Input
            placeholder="e.g. Jane Smith"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
            Board Title *
          </label>
          <select
            value={titleMode === 'custom' ? 'Custom…' : form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cranberry"
          >
            <option value="">— Select a title —</option>
            {ROTARACT_TITLES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {titleMode === 'custom' && (
            <Input
              className="mt-2"
              placeholder="Enter custom title"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
            />
          )}
        </div>

        {/* Photo URL */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
            Photo URL <span className="font-normal normal-case text-gray-400">(auto-filled from linked member)</span>
          </label>
          <Input
            placeholder="https://…"
            value={form.photoURL}
            onChange={(e) => setForm((f) => ({ ...f, photoURL: e.target.value }))}
          />
          {form.photoURL && (
            <img src={form.photoURL} alt="" className="mt-2 w-12 h-12 rounded-full object-cover" />
          )}
        </div>

        {/* LinkedIn */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
            LinkedIn URL
          </label>
          <Input
            placeholder="https://linkedin.com/in/…"
            value={form.linkedIn}
            onChange={(e) => setForm((f) => ({ ...f, linkedIn: e.target.value }))}
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
            Short Bio <span className="font-normal normal-case text-gray-400">(optional)</span>
          </label>
          <textarea
            rows={2}
            placeholder="A short sentence about this person…"
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-cranberry"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!form.name.trim() || (!form.title.trim() && !customTitle.trim())}
          >
            <Check className="w-4 h-4 mr-1" />
            {isNew ? 'Add' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BoardManagerPage() {
  const { member, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [board, setBoard] = useState<BoardEntry[]>([]);
  const [members, setMembers] = useState<PortalMember[]>([]);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editEntry, setEditEntry] = useState<BoardEntry | null | 'new'>(null);
  const [dirty, setDirty] = useState(false);

  const hasAccess = member && ['president', 'board', 'treasurer'].includes(member.role);

  useEffect(() => {
    if (!loading && !hasAccess) router.push('/portal');
  }, [loading, hasAccess, router]);

  const load = useCallback(async () => {
    setFetching(true);
    try {
      const [boardRes, membersRes] = await Promise.all([
        fetch('/api/portal/board').then((r) => r.json()),
        fetch('/api/portal/members').then((r) => r.json()),
      ]);
      const loaded: BoardEntry[] = (boardRes.members ?? []).sort(
        (a: BoardEntry, b: BoardEntry) => a.order - b.order,
      );
      setBoard(loaded);
      setMembers(Array.isArray(membersRes) ? membersRes : []);
    } catch {
      toast('Failed to load board data', 'error');
    } finally {
      setFetching(false);
    }
  }, [toast]);

  useEffect(() => {
    if (hasAccess) load();
  }, [hasAccess, load]);

  // ── Save ──────────────────────────────────────────────────────────────────

  async function save(newBoard: BoardEntry[]) {
    setSaving(true);
    try {
      const res = await fetch('/api/portal/board', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members: newBoard }),
      });
      if (!res.ok) throw new Error();
      toast('Board saved! Public leadership page updated.');
      setDirty(false);
    } catch {
      toast('Failed to save board', 'error');
    } finally {
      setSaving(false);
    }
  }

  // ── Entry actions ─────────────────────────────────────────────────────────

  function handleSaveEntry(entry: BoardEntry) {
    setBoard((prev) => {
      const idx = prev.findIndex((e) => e.id === entry.id);
      const updated = idx >= 0
        ? prev.map((e) => (e.id === entry.id ? entry : e))
        : [...prev, { ...entry, order: prev.length }];
      return updated;
    });
    setEditEntry(null);
    setDirty(true);
  }

  function handleRemove(id: string) {
    setBoard((prev) => prev.filter((e) => e.id !== id).map((e, i) => ({ ...e, order: i })));
    setDirty(true);
  }

  function moveUp(index: number) {
    if (index === 0) return;
    setBoard((prev) => {
      const arr = [...prev];
      [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
      return arr.map((e, i) => ({ ...e, order: i }));
    });
    setDirty(true);
  }

  function moveDown(index: number) {
    setBoard((prev) => {
      if (index >= prev.length - 1) return prev;
      const arr = [...prev];
      [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
      return arr.map((e, i) => ({ ...e, order: i }));
    });
    setDirty(true);
  }

  if (loading || fetching) {
    return <div className="flex justify-center py-16"><Spinner /></div>;
  }
  if (!member || !hasAccess) return null;

  const formEntry = editEntry === 'new' ? null : editEntry;
  const showForm = editEntry !== null;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Board Manager</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Define the current board with official titles and ordering. Changes are reflected on the public{' '}
            <a href="/leadership" target="_blank" rel="noopener noreferrer" className="text-cranberry hover:underline inline-flex items-center gap-0.5">
              Leadership page <ExternalLink className="w-3 h-3" />
            </a>.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {dirty && (
            <Button onClick={() => save(board)} disabled={saving}>
              {saving ? <Spinner size="sm" className="mr-1" /> : <Check className="w-4 h-4 mr-1" />}
              Save
            </Button>
          )}
          <Button variant="secondary" onClick={() => setEditEntry('new')}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
      </div>

      {/* Unsaved banner */}
      {dirty && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2.5 text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
          <span className="font-semibold">Unsaved changes</span> — click Save to publish to the public page.
        </div>
      )}

      {/* Empty state */}
      {board.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
          <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="font-display font-bold text-gray-900 dark:text-white mb-2">No board members yet</h3>
          <p className="text-sm text-gray-500 mb-6">Add board members to display them on the public leadership page.</p>
          <Button onClick={() => setEditEntry('new')}><Plus className="w-4 h-4 mr-1" /> Add First Member</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {board.map((entry, i) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3 group"
            >
              {/* Reorder */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  onClick={() => moveUp(i)}
                  disabled={i === 0}
                  className="p-0.5 text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                </button>
                <button
                  onClick={() => moveDown(i)}
                  disabled={i === board.length - 1}
                  className="p-0.5 text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>

              {/* Position number */}
              <span className="text-xs font-mono text-gray-300 dark:text-gray-600 w-4 text-center shrink-0">{i + 1}</span>

              {/* Avatar */}
              <Avatar src={entry.photoURL} alt={entry.name} size="sm" />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{entry.name}</p>
                <p className="text-xs text-cranberry font-medium">{entry.title}</p>
                {entry.bio && <p className="text-xs text-gray-400 truncate mt-0.5">{entry.bio}</p>}
              </div>

              {/* LinkedIn badge */}
              {entry.linkedIn && (
                <a
                  href={entry.linkedIn}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-azure transition-colors shrink-0"
                  title="LinkedIn"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => setEditEntry(entry)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Edit"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleRemove(entry.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Save footer */}
      {board.length > 0 && dirty && (
        <div className="flex justify-end">
          <Button onClick={() => save(board)} disabled={saving}>
            {saving ? <Spinner size="sm" className="mr-1" /> : <Check className="w-4 h-4 mr-1" />}
            Save & Publish
          </Button>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <FormModal
          entry={formEntry}
          members={members}
          onSave={handleSaveEntry}
          onClose={() => setEditEntry(null)}
        />
      )}
    </div>
  );
}
