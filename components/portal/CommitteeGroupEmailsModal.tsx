'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';

interface CommitteeGroupRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  groupEmail: string | null;
  proposedGroupEmail: string | null;
}

interface GroupsStatus {
  configured: boolean;
  connected: boolean;
  domain: string | null;
  error?: string;
  committees: CommitteeGroupRow[];
}

/**
 * Board-only setup panel for committee group emails. Shows the Workspace
 * groups connection status and lets an admin create a Google Group per
 * committee. Creating groups does NOT add any members — distribution lists are
 * provisioned empty and ready to use.
 */
export default function CommitteeGroupEmailsModal({
  open,
  onClose,
  onProvisioned,
}: {
  open: boolean;
  onClose: () => void;
  onProvisioned?: () => void;
}) {
  const { toast } = useToast();
  const [status, setStatus] = useState<GroupsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/portal/committees/groups', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load group status');
      setStatus((await res.json()) as GroupsStatus);
    } catch {
      toast('Could not load group email status.', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleCreate() {
    setWorking(true);
    try {
      const res = await fetch('/api/portal/committees/groups', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create groups');
      const { created, existed, failed } = data.summary;
      toast(
        `Groups ready: ${created} created, ${existed} already existed${failed ? `, ${failed} failed` : ''}.`,
        failed ? 'error' : 'success',
      );
      await load();
      onProvisioned?.();
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setWorking(false);
    }
  }

  const [syncing, setSyncing] = useState(false);
  const [syncSummary, setSyncSummary] = useState<string | null>(null);

  async function handleSyncMembers() {
    setSyncing(true);
    setSyncSummary(null);
    try {
      const res = await fetch('/api/portal/committees/groups/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync members');
      const { added, removed, unchanged, failed } = data.summary;
      const detailErrors = (data.results || [])
        .flatMap((r: any) => (r.errors || []).map((e: string) => `${r.name}: ${e}`))
        .slice(0, 4);
      setSyncSummary(
        `Added ${added}, removed ${removed}, ${unchanged} already in sync` +
          (failed ? ` — ${failed} committee(s) had errors: ${detailErrors.join('; ')}` : '.'),
      );
      toast(
        failed ? 'Member sync finished with some errors.' : 'Group members synced with committee rosters.',
        failed ? 'error' : 'success',
      );
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setSyncing(false);
    }
  }

  const provisionedCount = status?.committees.filter((c) => c.groupEmail).length ?? 0;
  const totalActive = status?.committees.filter((c) => c.status === 'active').length ?? 0;

  return (
    <Modal open={open} onClose={onClose} title="Committee group emails">
      <div className="p-1 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner className="w-8 h-8 text-cranberry" />
          </div>
        ) : !status ? (
          <p className="text-sm text-gray-500">Unable to load status.</p>
        ) : !status.configured ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4 text-sm text-amber-800 dark:text-amber-300">
            <p className="font-medium">Workspace groups aren&rsquo;t configured yet</p>
            <p className="mt-1">
              Set the Google Workspace environment variables on the server to enable
              committee group emails.
            </p>
          </div>
        ) : !status.connected ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4 text-sm text-amber-800 dark:text-amber-300">
            <p className="font-medium">Group permissions need authorizing</p>
            <p className="mt-1">
              The service account isn&rsquo;t authorized for the group scopes yet. In the
              Google Admin console &rarr; Security &rarr; API Controls &rarr; Domain-wide
              Delegation, add these scopes to the existing client:
            </p>
            <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-white/70 dark:bg-black/20 p-2 text-xs">
              https://www.googleapis.com/auth/admin.directory.group{'\n'}
              https://www.googleapis.com/auth/admin.directory.group.member
            </pre>
            {status.error && (
              <p className="mt-2 text-xs text-amber-700/80 dark:text-amber-400/80">
                Details: {status.error}
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Connected to <strong>{status.domain}</strong>.{' '}
                {provisionedCount} of {totalActive} active committees have a group email.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 max-h-72 overflow-y-auto">
              {status.committees.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {c.name}
                      {c.status !== 'active' && (
                        <span className="ml-2 text-xs text-gray-400">(inactive)</span>
                      )}
                    </p>
                    <p className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate">
                      {c.groupEmail || c.proposedGroupEmail}
                    </p>
                  </div>
                  {c.groupEmail ? (
                    <span className="shrink-0 inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                      Ready
                    </span>
                  ) : (
                    <span className="shrink-0 inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-500">
                      Not created
                    </span>
                  )}
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-400">
              &ldquo;Sync members&rdquo; makes each group mirror its committee roster —
              roster members are added silently (no invitation email), chairs become group
              managers, and portal members who left the committee are removed. Addresses
              added by hand in Google Admin are never touched.
            </p>

            {syncSummary && (
              <div className="rounded-xl border border-azure-200 dark:border-azure-800 bg-azure-50 dark:bg-azure-900/20 px-4 py-2.5 text-xs text-azure-800 dark:text-azure-300">
                {syncSummary}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
              {provisionedCount > 0 && (
                <Button type="button" variant="secondary" loading={syncing} onClick={handleSyncMembers}>
                  Sync members
                </Button>
              )}
              <Button type="button" variant="primary" loading={working} onClick={handleCreate}>
                {provisionedCount === totalActive && totalActive > 0
                  ? 'Re-sync groups'
                  : 'Create group emails'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
