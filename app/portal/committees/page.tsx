'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth';
import { useCommittees } from '@/hooks/useFirestore';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { cn } from '@/lib/utils/cn';
import type { Committee } from '@/types';
import { Users, Plus, Lock, Clock, ChevronRight, Pencil, EyeOff, Mail } from 'lucide-react';
import CommitteeGroupEmailsModal from '@/components/portal/CommitteeGroupEmailsModal';

// ─── Create Committee Modal ───────────────────────────────────────────────────

function CreateCommitteeModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState(5);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/portal/committees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), capacity }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create committee');
      }
      toast(`${name.trim()} committee created!`, 'success');
      setName('');
      setDescription('');
      setCapacity(5);
      onCreated();
      onClose();
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Committee">
      <form onSubmit={handleSubmit} className="space-y-4 p-1">
        <Input
          label="Committee Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Community Service"
          required
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cranberry/30 focus:border-cranberry resize-none"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this committee do?"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Capacity <span className="text-gray-400 font-normal">(0 = unlimited)</span>
          </label>
          <Input
            type="number"
            min={0}
            value={capacity}
            onChange={(e) => setCapacity(parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={loading}>Create Committee</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Committee Card ───────────────────────────────────────────────────────────

function CommitteeCard({
  committee,
  currentMemberId,
  isBoard,
  myCommitteeCount,
  onJoin,
  onLeave,
  loadingId,
}: {
  committee: Committee;
  currentMemberId: string;
  isBoard: boolean;
  myCommitteeCount: number;
  onJoin: (id: string) => Promise<void>;
  onLeave: (id: string) => Promise<void>;
  loadingId: string | null;
}) {
  const router = useRouter();
  const { memberIds = [], waitlistIds = [], pendingMemberIds = [], capacity = 5 } = committee;
  const isInactive = committee.status === 'inactive';

  const isMember = memberIds.includes(currentMemberId);
  const onWaitlist = waitlistIds.includes(currentMemberId);
  const isPending = pendingMemberIds.includes(currentMemberId);
  const wouldNeedApproval = !isMember && !onWaitlist && !isPending && myCommitteeCount >= 2;
  const atCapacity = capacity > 0 && memberIds.length >= capacity;
  const isLoading = loadingId === committee.id;

  const fillPct =
    capacity > 0 ? Math.min((memberIds.length / capacity) * 100, 100) : 0;

  const barColor =
    fillPct >= 100
      ? 'bg-cranberry'
      : fillPct >= 80
      ? 'bg-amber-400'
      : 'bg-emerald-400';

  return (
    <div
      className={cn(
        'relative group flex flex-col rounded-2xl border bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden',
        isMember
          ? 'border-cranberry/30 dark:border-cranberry/30 ring-1 ring-cranberry/10'
          : isInactive
          ? 'border-gray-200 dark:border-gray-800 opacity-60'
          : 'border-gray-200/80 dark:border-gray-800/80',
      )}
    >
      {/* Inactive badge */}
      {isInactive && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
          <EyeOff className="w-2.5 h-2.5" /> Inactive
        </div>
      )}
      {/* Your committee badge */}
      {!isInactive && isMember && (
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cranberry text-white">
          Your Committee
        </div>
      )}
      {onWaitlist && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
          <Clock className="w-2.5 h-2.5" />
          Waitlisted
        </div>
      )}
      {isPending && !isMember && !onWaitlist && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
          <Clock className="w-2.5 h-2.5" />
          Pending Approval
        </div>
      )}

      {/* Card body */}
      <div className="p-5 flex-1">
        <div className="flex items-start gap-3 mb-3">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-cranberry-50 dark:bg-cranberry-900/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-cranberry dark:text-cranberry-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white text-[15px] leading-tight truncate pr-16">
              {committee.name}
            </h3>
            {committee.chairName && (
              <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-0.5">
                Chair: {committee.chairName}
              </p>
            )}
          </div>
        </div>

        {committee.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">
            {committee.description}
          </p>
        )}

        {/* Capacity bar */}
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              {capacity === 0 ? (
                <>{memberIds.length} members · unlimited</>
              ) : (
                <>{memberIds.length} / {capacity} members</>
              )}
            </span>
            {atCapacity && capacity > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-cranberry">
                <Lock className="w-2.5 h-2.5" /> Full
              </span>
            )}
            {waitlistIds.length > 0 && (
              <span className="text-[11px] text-amber-500 dark:text-amber-400">
                {waitlistIds.length} on waitlist
              </span>
            )}
          </div>
          {capacity > 0 && (
            <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', barColor)}
                style={{ width: `${fillPct}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Card footer actions */}
      <div className="px-5 pb-5 pt-0 flex items-center gap-2">
        <button
          onClick={() => router.push(`/portal/committees/${committee.slug}`)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          View <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {isMember ? (
          <button
            onClick={() => onLeave(committee.id)}
            disabled={isLoading || isInactive}
            className="flex-1 flex items-center justify-center px-3 py-2 rounded-xl text-sm font-medium text-cranberry border border-cranberry/30 hover:bg-cranberry-50 dark:hover:bg-cranberry-900/20 transition-colors disabled:opacity-50"
          >
            {isLoading ? <Spinner className="w-4 h-4" /> : 'Leave'}
          </button>
        ) : onWaitlist ? (
          <button
            onClick={() => onLeave(committee.id)}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center px-3 py-2 rounded-xl text-sm font-medium text-amber-600 border border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors disabled:opacity-50"
          >
            {isLoading ? <Spinner className="w-4 h-4" /> : 'Leave Waitlist'}
          </button>
        ) : isPending ? (
          <button
            onClick={() => onLeave(committee.id)}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-purple-600 border border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors disabled:opacity-50"
          >
            {isLoading ? <Spinner className="w-4 h-4" /> : 'Withdraw'}
          </button>
        ) : isInactive ? (
          <span className="flex-1 flex items-center justify-center px-3 py-2 rounded-xl text-sm font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 cursor-not-allowed">
            Not accepting members
          </span>
        ) : (
          <button
            onClick={() => onJoin(committee.id)}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center px-3 py-2 rounded-xl text-sm font-medium text-white bg-cranberry hover:bg-cranberry-600 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <Spinner className="w-4 h-4 text-white" />
            ) : wouldNeedApproval ? (
              'Apply'
            ) : atCapacity && capacity > 0 ? (
              'Join Waitlist'
            ) : (
              'Join'
            )}
          </button>
        )}

        {isBoard && (
          <button
            onClick={() => router.push(`/portal/committees/${committee.slug}?tab=overview&edit=1`)}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Edit committee"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CommitteesPage() {
  const { member } = useAuth();
  const { data: committees, loading } = useCommittees();
  const [showCreate, setShowCreate] = useState(false);
  const [showGroupEmails, setShowGroupEmails] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const isBoard =
    member?.role === 'board' ||
    member?.role === 'president' ||
    member?.role === 'treasurer';

  const handleJoin = async (id: string) => {
    if (!member) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/portal/committees/${id}/join`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join');
      if (data.status === 'pending_approval') {
        toast(data.message, 'info');
      } else {
        toast(data.message || 'Joined!', 'success');
      }
      router.refresh();
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const handleLeave = async (id: string) => {
    if (!member) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/portal/committees/${id}/leave`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to leave');
      toast(data.message || 'Left committee.', 'success');
      router.refresh();
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setLoadingId(null);
    }
  };

  if (!member) return null;

  const allCommittees = committees as Committee[];
  const visibleCommittees = isBoard
    ? showInactive ? allCommittees : allCommittees.filter((c) => c.status !== 'inactive')
    : allCommittees.filter((c) => c.status !== 'inactive');

  const myCommittees = allCommittees.filter(
    (c) => c.memberIds?.includes(member.id) || c.waitlistIds?.includes(member.id),
  );
  const myCommitteeCount = allCommittees.filter(
    (c) => c.memberIds?.includes(member.id) && c.status !== 'inactive',
  ).length;

  const inactiveCount = allCommittees.filter((c) => c.status === 'inactive').length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
            Committees
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {myCommittees.length === 0
              ? 'Join a committee to get involved and help lead the club.'
              : myCommittees.length === 1
              ? `You're on the ${myCommittees[0].name} committee.`
              : `You're on ${myCommittees.length} committees.`}
            {myCommitteeCount >= 2 && (
              <span className="ml-1.5 inline-flex items-center gap-1 text-amber-500 dark:text-amber-400">
                · A 3rd committee requires board approval.
              </span>
            )}
          </p>
        </div>
        {isBoard && (
          <div className="flex items-center gap-2">
            {inactiveCount > 0 && (
              <button
                onClick={() => setShowInactive((v) => !v)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                  showInactive
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800',
                )}
              >
                <EyeOff className="w-3.5 h-3.5" />
                {showInactive ? 'Hide inactive' : `Show inactive (${inactiveCount})`}
              </button>
            )}
            <Button
              variant="secondary"
              onClick={() => setShowGroupEmails(true)}
            >
              <Mail className="w-4 h-4" /> Group emails
            </Button>
            <Button
              variant="primary"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="w-4 h-4" /> New Committee
            </Button>
          </div>
        )}
      </div>

      {/* Committees grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="w-8 h-8 text-cranberry" />
        </div>
      ) : visibleCommittees.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
            No committees yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isBoard
              ? 'Create the first committee to get started.'
              : "Committees will appear here once they\u2019re set up by the board."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleCommittees.map((c) => (
            <CommitteeCard
              key={c.id}
              committee={c}
              currentMemberId={member.id}
              isBoard={isBoard}
              myCommitteeCount={myCommitteeCount}
              onJoin={handleJoin}
              onLeave={handleLeave}
              loadingId={loadingId}
            />
          ))}
        </div>
      )}

      <CreateCommitteeModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => router.refresh()}
      />

      <CommitteeGroupEmailsModal
        open={showGroupEmails}
        onClose={() => setShowGroupEmails(false)}
        onProvisioned={() => router.refresh()}
      />
    </div>
  );
}
