'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth';
import { useCommittees, useMembers, useCommitteePosts, useCommitteeDocuments } from '@/hooks/useFirestore';
import { useToast } from '@/components/ui/Toast';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import FeedCard from '@/components/portal/FeedCard';
import { cn } from '@/lib/utils/cn';
import { formatRelativeTime } from '@/lib/utils/format';
import type { Committee, Member, CommunityPost, PortalDocument } from '@/types';
import {
  Users, FileText, MessageSquare, History, Settings,
  ExternalLink, Lock, Clock, Trash2, Crown, UserMinus,
  ChevronLeft, Plus, FolderOpen, Download, BookOpen, EyeOff, Eye,
} from 'lucide-react';

// ─── Tab definitions ──────────────────────────────────────────────────────────
type Tab = 'overview' | 'roster' | 'updates' | 'documents' | 'history';
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',   label: 'Overview',   icon: <Settings className="w-4 h-4" /> },
  { id: 'roster',     label: 'Roster',     icon: <Users className="w-4 h-4" /> },
  { id: 'updates',    label: 'Updates',    icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'documents',  label: 'Documents',  icon: <FileText className="w-4 h-4" /> },
  { id: 'history',    label: 'History',    icon: <History className="w-4 h-4" /> },
];

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({
  committee,
  canEdit,
  onSaved,
}: {
  committee: Committee;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(committee.description || '');
  const [meetingCadence, setMeetingCadence] = useState(committee.meetingCadence || '');
  const [driveURL, setDriveURL] = useState(committee.driveURL || '');
  const [capacity, setCapacity] = useState(committee.capacity ?? 5);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setDescription(committee.description || '');
    setMeetingCadence(committee.meetingCadence || '');
    setDriveURL(committee.driveURL || '');
    setCapacity(committee.capacity ?? 5);
  }, [committee]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/portal/committees/${committee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, meetingCadence, driveURL, capacity }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast('Committee updated.', 'success');
      setEditing(false);
      onSaved();
    } catch {
      toast('Failed to save changes.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = committee.status === 'inactive' ? 'active' : 'inactive';
    setToggling(true);
    try {
      const res = await fetch(`/api/portal/committees/${committee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      toast(
        newStatus === 'inactive'
          ? 'Committee deactivated. Members can no longer join.'
          : 'Committee reactivated.',
        'success',
      );
      onSaved();
    } catch {
      toast('Failed to update committee status.', 'error');
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Committee info */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-5">
        {/* Chair / Co-Chair */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Chair</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {committee.chairName || <span className="text-gray-400">Not assigned</span>}
            </p>
          </div>
          {committee.coChairName && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Co-Chair</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{committee.coChairName}</p>
            </div>
          )}
        </div>

        {/* Capacity */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Capacity</p>
          {!editing ? (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {capacity === 0 ? 'Unlimited' : `${committee.memberIds?.length ?? 0} / ${capacity} members`}
            </p>
          ) : (
            <Input
              type="number"
              min={0}
              value={capacity}
              onChange={(e) => setCapacity(parseInt(e.target.value) || 0)}
              className="max-w-[120px]"
            />
          )}
        </div>

        {/* Description */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">About</p>
          {!editing ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {committee.description || <span className="text-gray-400 italic">No description yet.</span>}
            </p>
          ) : (
            <textarea
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cranberry/30 focus:border-cranberry resize-none"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this committee do?"
            />
          )}
        </div>

        {/* Meeting cadence */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Meeting Schedule</p>
          {!editing ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {committee.meetingCadence || <span className="text-gray-400 italic">Not set.</span>}
            </p>
          ) : (
            <Input
              value={meetingCadence}
              onChange={(e) => setMeetingCadence(e.target.value)}
              placeholder="e.g. Every 2nd Monday, 6:30 PM"
            />
          )}
        </div>

        {/* Google Drive */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Google Drive Folder</p>
          {!editing ? (
            committee.driveURL ? (
              <a
                href={committee.driveURL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-azure-600 dark:text-azure-400 hover:underline font-medium"
              >
                <FolderOpen className="w-4 h-4" />
                Open Committee Drive
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span className="text-sm text-gray-400 italic">No Drive link set.</span>
            )
          ) : (
            <Input
              type="url"
              value={driveURL}
              onChange={(e) => setDriveURL(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
            />
          )}
        </div>

        {/* Edit actions */}
        {canEdit && (
          <div className="flex flex-wrap gap-2 pt-1">
            {!editing ? (
              <Button variant="ghost" onClick={() => setEditing(true)}>Edit Details</Button>
            ) : (
              <>
                <Button variant="primary" onClick={handleSave} loading={loading}>Save</Button>
                <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              </>
            )}
            {/* Deactivate / Reactivate */}
            {!editing && (
              <Button
                variant="ghost"
                loading={toggling}
                onClick={handleToggleStatus}
                className={committee.status === 'inactive' ? 'text-emerald-600 hover:text-emerald-700' : 'text-gray-400 hover:text-amber-600'}
              >
                {committee.status === 'inactive'
                  ? <><Eye className="w-4 h-4" /> Reactivate</>  
                  : <><EyeOff className="w-4 h-4" /> Deactivate</>}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Roster Tab ───────────────────────────────────────────────────────────────
function RosterTab({
  committee,
  allMembers,
  currentMemberId,
  canManage,
  isBoard,
  onRemoved,
}: {
  committee: Committee;
  allMembers: Member[];
  currentMemberId: string;
  canManage: boolean;
  isBoard: boolean;
  onRemoved: () => void;
}) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [settingChairId, setSettingChairId] = useState<string | null>(null);
  const { toast } = useToast();

  // Board appoints/unsets the chair or co-chair straight from the roster.
  const handleSetChair = async (m: Member, kind: 'chair' | 'coChair') => {
    const isAlready = kind === 'chair' ? committee.chairId === m.id : committee.coChairId === m.id;
    const patch =
      kind === 'chair'
        ? { chairId: isAlready ? '' : m.id, chairName: isAlready ? '' : m.displayName }
        : { coChairId: isAlready ? '' : m.id, coChairName: isAlready ? '' : m.displayName };
    setSettingChairId(m.id);
    try {
      const res = await fetch(`/api/portal/committees/${committee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
      toast(
        isAlready
          ? `${m.displayName} is no longer ${kind === 'chair' ? 'chair' : 'co-chair'}.`
          : `${m.displayName} is now ${kind === 'chair' ? 'chair' : 'co-chair'}.`,
        'success',
      );
      onRemoved(); // refresh committee data
    } catch {
      toast('Failed to update chair.', 'error');
    } finally {
      setSettingChairId(null);
    }
  };

  const memberMap = Object.fromEntries(allMembers.map((m) => [m.id, m]));

  const committeeMembers = (committee.memberIds || [])
    .map((id) => memberMap[id])
    .filter(Boolean) as Member[];
  const waitlistMembers = (committee.waitlistIds || [])
    .map((id) => memberMap[id])
    .filter(Boolean) as Member[];

  const handleRemove = async (memberId: string) => {
    setRemovingId(memberId);
    try {
      const res = await fetch(
        `/api/portal/committees/${committee.id}/members?memberId=${memberId}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error('Failed to remove member');
      toast('Member removed.', 'success');
      onRemoved();
    } catch {
      toast('Failed to remove member.', 'error');
    } finally {
      setRemovingId(null);
    }
  };

  const MemberRow = ({ m, isWaiting = false }: { m: Member; isWaiting?: boolean }) => (
    <div className="flex items-center gap-3 py-3 px-1 group">
      <Avatar src={m.photoURL} alt={m.displayName} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{m.displayName}</p>
          {m.id === committee.chairId && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-cranberry/10 text-cranberry dark:bg-cranberry/20">
              <Crown className="w-2.5 h-2.5" /> Chair
            </span>
          )}
          {m.id === committee.coChairId && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-azure-100 dark:bg-azure-900/30 text-azure-600 dark:text-azure-400">
              Co-Chair
            </span>
          )}
          {isWaiting && (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
              <Clock className="w-2.5 h-2.5" /> Waitlist
            </span>
          )}
          {m.id === currentMemberId && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">You</span>
          )}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
          {m.occupation || m.role}
        </p>
      </div>
      {isBoard && !isWaiting && (
        <>
          <button
            onClick={() => handleSetChair(m, 'chair')}
            disabled={settingChairId === m.id}
            className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all ${
              committee.chairId === m.id
                ? 'text-cranberry opacity-100 hover:bg-cranberry/10'
                : 'text-gray-400 hover:text-cranberry hover:bg-cranberry/10'
            }`}
            title={committee.chairId === m.id ? 'Remove as chair' : 'Make chair'}
          >
            {settingChairId === m.id ? <Spinner className="w-3.5 h-3.5" /> : <Crown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => handleSetChair(m, 'coChair')}
            disabled={settingChairId === m.id}
            className={`opacity-0 group-hover:opacity-100 px-1.5 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
              committee.coChairId === m.id
                ? 'text-azure-600 opacity-100 hover:bg-azure-100 dark:hover:bg-azure-900/30'
                : 'text-gray-400 hover:text-azure-600 hover:bg-azure-100 dark:hover:bg-azure-900/30'
            }`}
            title={committee.coChairId === m.id ? 'Remove as co-chair' : 'Make co-chair'}
          >
            Co
          </button>
        </>
      )}
      {canManage && m.id !== currentMemberId && (
        <button
          onClick={() => handleRemove(m.id)}
          disabled={removingId === m.id}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          title="Remove from committee"
        >
          {removingId === m.id ? <Spinner className="w-3.5 h-3.5" /> : <UserMinus className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );

  return (
    <div className="max-w-xl space-y-6">
      {/* Active members */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Members <span className="text-gray-400 font-normal">({committeeMembers.length}
              {(committee.capacity ?? 5) > 0 && ` / ${committee.capacity}`})</span>
          </h3>
        </div>
        <div className="px-5 divide-y divide-gray-100 dark:divide-gray-800">
          {committeeMembers.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">No members yet.</p>
          ) : (
            committeeMembers.map((m) => <MemberRow key={m.id} m={m} />)
          )}
        </div>
      </div>

      {/* Waitlist — visible to board/chair */}
      {canManage && waitlistMembers.length > 0 && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 overflow-hidden">
          <div className="px-5 py-3 border-b border-amber-200 dark:border-amber-800/40">
            <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              Waitlist ({waitlistMembers.length})
            </h3>
          </div>
          <div className="px-5 divide-y divide-amber-100 dark:divide-amber-900/30">
            {waitlistMembers.map((m) => <MemberRow key={m.id} m={m} isWaiting />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Updates Tab ──────────────────────────────────────────────────────────────
function UpdatesTab({
  committee,
  currentMember,
}: {
  committee: Committee;
  currentMember: Member;
}) {
  const { data: posts, loading } = useCommitteePosts(committee.id);
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [promoteId, setPromoteId] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const handlePost = async () => {
    if (!content.trim()) return;
    setPosting(true);
    try {
      const res = await fetch('/api/portal/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          type: 'text',
          audience: 'committee',
          committeeId: committee.id,
        }),
      });
      if (!res.ok) throw new Error('Failed to post');
      setContent('');
      toast('Update posted!', 'success');
      router.refresh();
    } catch {
      toast('Failed to post update.', 'error');
    } finally {
      setPosting(false);
    }
  };

  const handlePromote = async (postId: string) => {
    setPromoteId(postId);
    try {
      const res = await fetch(`/api/portal/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audience: 'all' }),
      });
      if (!res.ok) throw new Error('Failed to promote');
      toast('Post promoted to club-wide feed!', 'success');
      router.refresh();
    } catch {
      toast('Failed to promote post.', 'error');
    } finally {
      setPromoteId(null);
    }
  };

  const isChairOrBoard =
    committee.chairId === currentMember.id ||
    committee.coChairId === currentMember.id ||
    ['board', 'president', 'treasurer'].includes(currentMember.role);

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Composer */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <div className="flex gap-3">
          <Avatar src={currentMember.photoURL} alt={currentMember.displayName} size="sm" />
          <div className="flex-1">
            <textarea
              className="w-full bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none resize-none"
              rows={3}
              placeholder={`Share an update with ${committee.name}…`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={1000}
            />
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
              <span className="text-xs text-gray-400">{content.length}/1000</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-cranberry-50 dark:bg-cranberry-900/20 text-cranberry text-xs font-medium">
                  Committee only
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePost}
                  loading={posting}
                  disabled={!content.trim()}
                >
                  Post
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner className="w-7 h-7 text-cranberry" />
        </div>
      ) : (posts as CommunityPost[]).length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">
          No updates yet. Be the first to post!
        </div>
      ) : (
        (posts as CommunityPost[]).map((post) => (
          <div key={post.id} className="relative group">
            <FeedCard post={post} />
            {/* Promote to club-wide feed — chair/board only */}
            {isChairOrBoard && post.audience === 'committee' && (
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handlePromote(post.id)}
                  disabled={promoteId === post.id}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-cranberry hover:border-cranberry/30 transition-colors shadow-sm"
                  title="Promote to club-wide feed"
                >
                  {promoteId === post.id ? 'Promoting…' : '↑ Promote to club'}
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ─── Documents Tab ────────────────────────────────────────────────────────────
function DocumentsTab({
  committee,
  canManage,
}: {
  committee: Committee;
  canManage: boolean;
}) {
  const { data: docs, loading } = useCommitteeDocuments(committee.id);

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {committee.name} Documents
        </h3>
        {canManage && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open('/portal/documents', '_blank')}
          >
            <Plus className="w-3.5 h-3.5" /> Add via Documents
          </Button>
        )}
      </div>

      {committee.driveURL && (
        <a
          href={committee.driveURL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 rounded-2xl border border-azure-200 dark:border-azure-800/40 bg-azure-50 dark:bg-azure-900/10 hover:bg-azure-100 dark:hover:bg-azure-900/20 transition-colors"
        >
          <FolderOpen className="w-5 h-5 text-azure-600 dark:text-azure-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-azure-700 dark:text-azure-300">
              Google Drive Folder
            </p>
            <p className="text-xs text-azure-500 dark:text-azure-500">
              Working files, templates, archives
            </p>
          </div>
          <ExternalLink className="w-4 h-4 text-azure-500 ml-auto shrink-0" />
        </a>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner className="w-6 h-6 text-cranberry" />
        </div>
      ) : (docs as PortalDocument[]).length === 0 ? (
        <div className="text-center py-10 text-sm text-gray-400">
          No documents tagged to this committee yet.
          {canManage && (
            <p className="mt-1">
              Upload a document in{' '}
              <a href="/portal/documents" className="text-cranberry hover:underline">Documents</a>{' '}
              and select this committee.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
          {(docs as PortalDocument[]).map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 px-5 py-3.5">
              <BookOpen className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{doc.title}</p>
                <p className="text-xs text-gray-400 capitalize">{doc.category}</p>
              </div>
              {(doc.fileURL || doc.linkURL) && (
                <a
                  href={doc.fileURL || doc.linkURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-cranberry hover:bg-cranberry-50 dark:hover:bg-cranberry-900/20 transition-colors"
                >
                  {doc.fileURL ? <Download className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────
function HistoryTab({
  committee,
  canManage,
  currentMemberId,
  onYearClosed,
}: {
  committee: Committee;
  canManage: boolean;
  currentMemberId: string;
  onYearClosed: () => void;
}) {
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [handoffNote, setHandoffNote] = useState('');
  const [year, setYear] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    return now.getMonth() >= 6 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
  });
  const [closing, setClosing] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const history = [...(committee.termHistory || [])].sort(
    (a, b) => b.year.localeCompare(a.year),
  );

  const handleCloseYear = async () => {
    setClosing(true);
    try {
      const res = await fetch(`/api/portal/committees/${committee.id}/close-year`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, handoffNote }),
      });
      if (!res.ok) throw new Error('Failed to close year');
      toast(`${year} term archived!`, 'success');
      setShowCloseModal(false);
      onYearClosed();
      router.refresh();
    } catch {
      toast('Failed to archive year.', 'error');
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {canManage && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCloseModal(true)}
          >
            <History className="w-3.5 h-3.5" /> Archive this year
          </Button>
        </div>
      )}

      {history.length === 0 ? (
        <div className="text-center py-14">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <History className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No history yet.</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Term archives will appear here after each year is closed out.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((term, i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    {term.year} Term
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Chair: {term.chairName} · {term.memberCount} member{term.memberCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <span className="text-[10px] text-gray-400">
                  Archived {formatRelativeTime(term.closedAt)}
                </span>
              </div>

              {term.handoffNote && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 p-3">
                  <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 mb-1">
                    Handoff Note from {term.chairName}
                  </p>
                  <p className="text-sm text-amber-900 dark:text-amber-200 whitespace-pre-wrap">
                    {term.handoffNote}
                  </p>
                </div>
              )}

              {term.memberNames?.length > 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
                  Members: {term.memberNames.join(', ')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Close Year Modal */}
      <Modal open={showCloseModal} onClose={() => setShowCloseModal(false)} title="Archive This Year">
        <div className="space-y-4 p-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This will snapshot the current roster and save it as institutional history.
            Future chairs can read this archive.
          </p>
          <Input
            label="Term Year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="e.g. 2025-2026"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Handoff Note <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cranberry/30 focus:border-cranberry resize-none"
              rows={5}
              value={handoffNote}
              onChange={(e) => setHandoffNote(e.target.value)}
              placeholder="Key contacts, lessons learned, ongoing projects, advice for the next chair…"
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="ghost" onClick={() => setShowCloseModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCloseYear} loading={closing}>
              Archive & Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CommitteeWorkspacePage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { tab?: Tab };
}) {
  const { slug } = params;
  const { tab: initialTab } = searchParams;
  const { member } = useAuth();
  const { data: committeesRaw, loading: committeesLoading } = useCommittees();
  const { data: allMembers } = useMembers();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab || 'overview');
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();

  const committees = committeesRaw as Committee[];
  const committee = committees.find((c) => c.slug === slug);

  if (!member) return null;

  const isBoard =
    member.role === 'board' ||
    member.role === 'president' ||
    member.role === 'treasurer';

  const isChair =
    committee?.chairId === member.id || committee?.coChairId === member.id;

  const canManage = isBoard || isChair;

  const isMember = committee?.memberIds?.includes(member.id) ?? false;
  const onWaitlist = committee?.waitlistIds?.includes(member.id) ?? false;
  const canViewUpdates = isMember || isBoard;

  if (committeesLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="w-8 h-8 text-cranberry" />
      </div>
    );
  }

  if (!committee) {
    return (
      <div className="text-center py-24">
        <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Committee not found</p>
        <p className="text-sm text-gray-500 mb-6">This committee may have been removed.</p>
        <Button variant="ghost" onClick={() => router.push('/portal/committees')}>
          Back to Committees
        </Button>
      </div>
    );
  }

  const refresh = () => setRefreshKey((k) => k + 1);

  // Filter tabs for non-members: hide Updates (committee-only)
  const visibleTabs = TABS.filter((t) => {
    if (t.id === 'updates' && !canViewUpdates) return false;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back + header */}
      <div>
        <button
          onClick={() => router.push('/portal/committees')}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" /> All Committees
        </button>

        {/* Inactive banner */}
        {committee.status === 'inactive' && (
          <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 text-sm text-amber-700 dark:text-amber-400">
            <EyeOff className="w-4 h-4 shrink-0" />
            <span>This committee is <strong>inactive</strong> — members cannot join until it is reactivated.</span>
          </div>
        )}

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cranberry-50 dark:bg-cranberry-900/20 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-cranberry dark:text-cranberry-400" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
                {committee.name}
              </h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {isMember && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cranberry/10 text-cranberry">
                    Your Committee
                  </span>
                )}
                {onWaitlist && (
                  <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                    <Clock className="w-3 h-3" /> Waitlisted
                  </span>
                )}
                <span className="text-xs text-gray-400">
                  {(committee.capacity ?? 5) > 0
                    ? `${committee.memberIds?.length ?? 0} / ${committee.capacity} members`
                    : `${committee.memberIds?.length ?? 0} members`}
                </span>
                {(committee.capacity ?? 5) > 0 &&
                  (committee.memberIds?.length ?? 0) >= (committee.capacity ?? 5) && (
                    <span className="flex items-center gap-1 text-xs text-cranberry font-semibold">
                      <Lock className="w-3 h-3" /> Full
                    </span>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl w-fit">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div key={refreshKey}>
        {activeTab === 'overview' && (
          <OverviewTab committee={committee} canEdit={canManage} onSaved={refresh} />
        )}
        {activeTab === 'roster' && (
          <RosterTab
            committee={committee}
            allMembers={allMembers as Member[]}
            currentMemberId={member.id}
            canManage={canManage}
            isBoard={isBoard}
            onRemoved={refresh}
          />
        )}
        {activeTab === 'updates' && canViewUpdates && (
          <UpdatesTab committee={committee} currentMember={member} />
        )}
        {activeTab === 'documents' && (
          <DocumentsTab committee={committee} canManage={canManage} />
        )}
        {activeTab === 'history' && (
          <HistoryTab
            committee={committee}
            canManage={canManage}
            currentMemberId={member.id}
            onYearClosed={refresh}
          />
        )}
      </div>
    </div>
  );
}
