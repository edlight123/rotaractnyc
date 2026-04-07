'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { apiGet, apiPost } from '@/hooks/useFirestore';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';

// ─── Types ─────────────────────────────────────────────────────────────────

type Segment = 'all' | 'unpaid' | 'board' | 'committee';

interface Broadcast {
  id: string;
  subject: string;
  body: string;
  segment: Segment;
  committeeId?: string;
  recipientCount: number;
  sentBy: string;
  sentByName: string;
  sentAt: string;
}

interface Committee {
  id: string;
  name: string;
}

const ADMIN_ROLES = ['board', 'president', 'treasurer'];

const SEGMENT_OPTIONS: { value: Segment; label: string; description: string }[] = [
  { value: 'all', label: 'All Members', description: 'Every active member' },
  { value: 'unpaid', label: 'Unpaid Members', description: 'Members with unpaid dues' },
  { value: 'board', label: 'Board Only', description: 'Board, president & treasurer' },
  { value: 'committee', label: 'Committee', description: 'Members of a specific committee' },
];

const SEGMENT_BADGE_VARIANT: Record<Segment, 'cranberry' | 'gold' | 'azure' | 'green'> = {
  all: 'cranberry',
  unpaid: 'gold',
  board: 'azure',
  committee: 'green',
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Simple markdown-ish → HTML for preview (matches the server-side formatting) */
function formatBodyHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

// ─── Skeleton components ───────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3">
          <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-20 bg-gray-100 dark:bg-gray-800 rounded" />
          <div className="h-4 w-12 bg-gray-100 dark:bg-gray-800 rounded" />
          <div className="h-4 w-28 bg-gray-100 dark:bg-gray-800 rounded" />
          <div className="h-4 w-32 bg-gray-100 dark:bg-gray-800 rounded" />
        </div>
      ))}
    </div>
  );
}

// ─── Page component ────────────────────────────────────────────────────────

export default function AdminBroadcastsPage() {
  const { member, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // Compose state
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [segment, setSegment] = useState<Segment>('all');
  const [committeeId, setCommitteeId] = useState('');
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [committeesLoading, setCommitteesLoading] = useState(false);

  // Preview
  const [showPreview, setShowPreview] = useState(false);

  // Confirmation
  const [showConfirm, setShowConfirm] = useState(false);

  // Sending
  const [sending, setSending] = useState(false);

  // History
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const hasAccess = member && ADMIN_ROLES.includes(member.role);

  // ── Fetch committees when segment is 'committee' ──

  useEffect(() => {
    if (segment !== 'committee' || committees.length > 0) return;
    setCommitteesLoading(true);
    apiGet<Committee[]>('/api/portal/committees')
      .then(setCommittees)
      .catch(() => toast('Failed to load committees', 'error'))
      .finally(() => setCommitteesLoading(false));
  }, [segment, committees.length, toast]);

  // ── Fetch broadcast history ──

  const fetchHistory = useCallback(async () => {
    try {
      const data = await apiGet<{ broadcasts: Broadcast[] }>('/api/portal/broadcasts');
      setBroadcasts(data.broadcasts);
    } catch {
      toast('Failed to load broadcast history', 'error');
    } finally {
      setHistoryLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!hasAccess) {
      setHistoryLoading(false);
      return;
    }
    fetchHistory();
  }, [hasAccess, fetchHistory]);

  // ── Send broadcast ──

  const handleSend = async () => {
    setShowConfirm(false);
    setSending(true);
    try {
      const payload: Record<string, string> = { subject: subject.trim(), body, segment };
      if (segment === 'committee') payload.committeeId = committeeId;

      const result = await apiPost<{ success: boolean; recipientCount: number }>(
        '/api/portal/broadcasts',
        payload,
      );

      toast(`Broadcast sent to ${result.recipientCount} recipient${result.recipientCount !== 1 ? 's' : ''}!`, 'success');

      // Reset form
      setSubject('');
      setBody('');
      setSegment('all');
      setCommitteeId('');
      setShowPreview(false);

      // Refresh history
      await fetchHistory();
    } catch (err: any) {
      toast(err.message || 'Failed to send broadcast', 'error');
    } finally {
      setSending(false);
    }
  };

  const canSend =
    subject.trim().length > 0 &&
    body.trim().length > 0 &&
    (segment !== 'committee' || committeeId.length > 0);

  // ── Auth loading ──

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  // ── Access denied ──

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <svg aria-hidden="true" className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">You need a board, president, or treasurer role to send broadcasts.</p>
        </div>
      </div>
    );
  }

  // ── Segment label for confirm dialog ──

  const segmentLabel =
    segment === 'committee'
      ? committees.find((c) => c.id === committeeId)?.name || 'committee'
      : SEGMENT_OPTIONS.find((o) => o.value === segment)?.label || segment;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Email Broadcasts</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Send email announcements to members. Recipients who have opted out of announcements will be excluded.
        </p>
      </div>

      {/* ── Compose Section ── */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-5">
        <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white">Compose Broadcast</h2>

        {/* Subject */}
        <div>
          <label htmlFor="broadcast-subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Subject
          </label>
          <input
            id="broadcast-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Upcoming Service Project — April 15"
            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-cranberry-500 focus:border-transparent transition"
          />
        </div>

        {/* Body */}
        <div>
          <label htmlFor="broadcast-body" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Message Body
          </label>
          <textarea
            id="broadcast-body"
            rows={8}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message here… Use **bold** for emphasis."
            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-cranberry-500 focus:border-transparent transition resize-y"
          />
          <p className="text-xs text-gray-400 mt-1">Supports **bold** text. Newlines are preserved.</p>
        </div>

        {/* Segment selector */}
        <div>
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Audience</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SEGMENT_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`relative flex flex-col items-center gap-1 rounded-xl border-2 p-3 cursor-pointer transition-all text-center ${
                  segment === opt.value
                    ? 'border-cranberry bg-cranberry-50 dark:bg-cranberry-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="segment"
                  value={opt.value}
                  checked={segment === opt.value}
                  onChange={() => setSegment(opt.value)}
                  className="sr-only"
                />
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{opt.label}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{opt.description}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Committee dropdown */}
        {segment === 'committee' && (
          <div>
            <label htmlFor="committee-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Select Committee
            </label>
            {committeesLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Spinner size="sm" /> Loading committees…
              </div>
            ) : (
              <select
                id="committee-select"
                value={committeeId}
                onChange={(e) => setCommitteeId(e.target.value)}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-cranberry-500 focus:border-transparent transition"
              >
                <option value="">Choose a committee…</option>
                {committees.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button
            variant="secondary"
            size="md"
            disabled={!canSend}
            onClick={() => setShowPreview(true)}
          >
            Preview
          </Button>
          <Button
            variant="primary"
            size="md"
            disabled={!canSend}
            loading={sending}
            onClick={() => setShowConfirm(true)}
          >
            Send Broadcast
          </Button>
        </div>
      </div>

      {/* ── Preview Modal ── */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowPreview(false)}>
          <div
            className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4 rounded-t-2xl">
              <h3 className="text-lg font-display font-bold text-gray-900 dark:text-white">Email Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</span>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">{subject}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Audience</span>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  <Badge variant={SEGMENT_BADGE_VARIANT[segment]}>{segmentLabel}</Badge>
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Simulated branded header */}
                <div className="bg-[#9B1B30] px-6 py-5 text-center">
                  <span className="text-white font-bold text-lg">Rotaract NYC</span>
                  <p className="text-[#EBC85B] text-xs mt-1 tracking-wider">Service Above Self</p>
                </div>
                {/* Body */}
                <div
                  className="bg-white px-6 py-6 text-sm text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: `<h2 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 16px">${subject.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h2><div>${formatBodyHtml(body)}</div>`,
                  }}
                />
                {/* Footer */}
                <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 text-center text-xs text-gray-400">
                  Rotaract Club of New York at the United Nations ·{' '}
                  <span className="text-cranberry underline">Manage notification preferences</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmation Dialog ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowConfirm(false)}>
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 mx-auto rounded-2xl bg-cranberry-50 dark:bg-cranberry-900/20 flex items-center justify-center">
              <svg aria-hidden="true" className="w-6 h-6 text-cranberry" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-display font-bold text-gray-900 dark:text-white">Send Broadcast?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Are you sure you want to send <strong>&quot;{subject}&quot;</strong> to <Badge variant={SEGMENT_BADGE_VARIANT[segment]}>{segmentLabel}</Badge>?
                This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="secondary" size="md" onClick={() => setShowConfirm(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="md" loading={sending} onClick={handleSend}>
                Yes, Send Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sent History Section ── */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-4">
        <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white">Sent History</h2>

        {historyLoading ? (
          <TableSkeleton />
        ) : broadcasts.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
            No broadcasts sent yet. Compose your first one above!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-left">
                  <th className="pb-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Subject</th>
                  <th className="pb-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Segment</th>
                  <th className="pb-3 pr-4 font-medium text-gray-500 dark:text-gray-400 text-right">Recipients</th>
                  <th className="pb-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Sent By</th>
                  <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {broadcasts.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                    <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white max-w-xs truncate">
                      {b.subject}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={SEGMENT_BADGE_VARIANT[b.segment] || 'gray'}>
                        {b.segment === 'committee' ? 'Committee' : SEGMENT_OPTIONS.find((o) => o.value === b.segment)?.label || b.segment}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-right text-gray-700 dark:text-gray-300 tabular-nums">
                      {b.recipientCount}
                    </td>
                    <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                      {b.sentByName}
                    </td>
                    <td className="py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {b.sentAt ? formatDate(b.sentAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
