'use client';

/**
 * Membership workspace — the Membership Chair's home base (also open to board+).
 *
 * One place for the whole membership pipeline:
 *   1. Pending applications → approve / reject
 *   2. Onboarding pipeline — recent joiners and how complete their profile is
 *   3. Headline membership stats
 *
 * Access: board / treasurer / president, or a member titled
 * "Director of Membership" / "Membership Chair" (see lib/permissions.ts).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth';
import { useToast } from '@/components/ui/Toast';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import { apiPatch } from '@/hooks/useFirestore';
import { canManageMembership } from '@/lib/permissions';
import { formatDate } from '@/lib/utils/format';
import { SectionHeader } from '@/components/portal/PageHeader';

interface MemberRow {
  id: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  photoURL?: string;
  status?: string;
  role?: string;
  joinedAt?: string;
  createdAt?: string;
  bio?: string;
  linkedIn?: string;
  committee?: string;
  onboardingComplete?: boolean;
  orgEmail?: string;
  personalEmail?: string;
  isRoleAccount?: boolean;
}

interface ProvisionResult {
  orgEmail: string;
  temporaryPassword: string;
  emailed: boolean;
  paused: boolean;
}

const nameOf = (m: MemberRow) =>
  m.displayName || `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email || 'Member';

/** Same fields the dashboard profile widget nudges about. */
function profileCompletion(m: MemberRow): number {
  const checks = [!!m.photoURL, !!m.bio, !!m.linkedIn, !!m.committee];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export default function MembershipAdminPage() {
  const { member, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [provisioningId, setProvisioningId] = useState<string | null>(null);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const [provisionResults, setProvisionResults] = useState<Record<string, ProvisionResult>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [provisionAllRunning, setProvisionAllRunning] = useState(false);
  const [provisionAllProgress, setProvisionAllProgress] = useState<{ done: number; total: number } | null>(null);

  const allowed = canManageMembership(member);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/portal/members?scope=membership');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMembers(data.members || data || []);
    } catch {
      toast('Failed to load members', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!member) return;
    if (!allowed) {
      router.replace('/portal');
      return;
    }
    load();
  }, [authLoading, member, allowed, router, load]);

  const pending = useMemo(() => members.filter((m) => m.status === 'pending'), [members]);
  const active = useMemo(() => members.filter((m) => m.status === 'active'), [members]);

  const recentJoiners = useMemo(() => {
    const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000; // last 60 days
    return active
      .filter((m) => {
        const t = new Date(m.joinedAt || m.createdAt || 0).getTime();
        return t > cutoff;
      })
      .sort((a, b) => new Date(b.joinedAt || b.createdAt || 0).getTime() - new Date(a.joinedAt || a.createdAt || 0).getTime());
  }, [active]);

  const newThisMonth = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return active.filter((m) => new Date(m.joinedAt || m.createdAt || 0).getTime() >= monthStart).length;
  }, [active]);

  const incompleteProfiles = useMemo(
    () => active.filter((m) => profileCompletion(m) < 100).length,
    [active],
  );

  // Active people (never role/org accounts) who don't yet have an @rotaractnyc.org
  // address. Members already provisioned this session are dropped once done.
  const needsOrgEmail = useMemo(
    () => active.filter((m) => !m.isRoleAccount && !m.orgEmail && !provisionResults[m.id]),
    [active, provisionResults],
  );

  // Active people (never role/org accounts) who already have an @rotaractnyc.org
  // address — candidates for suspension.
  const hasOrgEmail = useMemo(
    () => active.filter((m) => !m.isRoleAccount && !!m.orgEmail),
    [active],
  );

  const setStatus = async (m: MemberRow, status: 'active' | 'rejected') => {
    setActingId(m.id);
    try {
      await apiPatch('/api/portal/members', { memberId: m.id, status });
      toast(status === 'active' ? `${nameOf(m)} approved` : `${nameOf(m)} rejected`);
      await load();
    } catch (err: any) {
      toast(err.message || 'Failed to update member', 'error');
    } finally {
      setActingId(null);
    }
  };

  const copy = useCallback(
    async (key: string, value: string) => {
      try {
        await navigator.clipboard.writeText(value);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
      } catch {
        toast('Copy failed — select and copy manually', 'error');
      }
    },
    [toast],
  );

  /** Provision one member. Returns the result on success, null on failure. */
  const provisionOne = useCallback(
    async (m: MemberRow): Promise<ProvisionResult | null> => {
      try {
        const res = await fetch(`/api/portal/members/${m.id}/provision`, { method: 'POST' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast(data.error || `Failed to provision ${nameOf(m)}`, 'error');
          return null;
        }
        const result: ProvisionResult = {
          orgEmail: data.orgEmail,
          temporaryPassword: data.temporaryPassword,
          emailed: !!data.emailed,
          paused: !!data.paused,
        };
        setProvisionResults((prev) => ({ ...prev, [m.id]: result }));
        return result;
      } catch {
        toast(`Failed to provision ${nameOf(m)}`, 'error');
        return null;
      }
    },
    [toast],
  );

  const provision = async (m: MemberRow) => {
    setProvisioningId(m.id);
    try {
      await provisionOne(m);
    } finally {
      setProvisioningId(null);
    }
  };

  const suspend = async (m: MemberRow) => {
    if (!m.orgEmail) return;
    if (
      !confirm(
        `Suspend ${m.orgEmail}? Reversible in Google Admin; clears their profile org email.`,
      )
    )
      return;
    setSuspendingId(m.id);
    try {
      const res = await fetch(`/api/portal/members/${m.id}/deprovision`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || `Failed to suspend ${nameOf(m)}`, 'error');
        return;
      }
      toast(`Suspended ${data.suspendedEmail}`);
      await load();
    } catch {
      toast(`Failed to suspend ${nameOf(m)}`, 'error');
    } finally {
      setSuspendingId(null);
    }
  };

  const provisionAll = async () => {
    const queue = needsOrgEmail;
    if (queue.length === 0) return;
    setProvisionAllRunning(true);
    setProvisionAllProgress({ done: 0, total: queue.length });
    let ok = 0;
    for (let i = 0; i < queue.length; i++) {
      const result = await provisionOne(queue[i]);
      if (result) ok++;
      setProvisionAllProgress({ done: i + 1, total: queue.length });
    }
    setProvisionAllRunning(false);
    setProvisionAllProgress(null);
    toast(`Provisioned ${ok} of ${queue.length} member${queue.length === 1 ? '' : 's'}`);
  };

  if (authLoading || (allowed && loading)) {
    return <div className="flex justify-center py-24"><Spinner className="w-8 h-8 text-cranberry" /></div>;
  }
  if (!allowed) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Membership</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Applications, onboarding progress, and membership health — the Membership Chair&apos;s workspace.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active members', value: active.length },
          { label: 'Pending approval', value: pending.length, highlight: pending.length > 0 },
          { label: 'New this month', value: newThisMonth },
          { label: 'Incomplete profiles', value: incompleteProfiles },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <p className={`text-2xl font-display font-bold ${s.highlight ? 'text-cranberry' : 'text-gray-900 dark:text-white'}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pending approvals */}
      <section>
        <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white mb-3">
          Pending Applications {pending.length > 0 && <Badge variant="red" className="ml-1">{pending.length}</Badge>}
        </h2>
        {pending.length === 0 ? (
          <div className="text-center py-8 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
            <p className="text-sm text-gray-400">No pending applications — all caught up! 🎉</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map((m) => (
              <div key={m.id} className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3">
                <Avatar src={m.photoURL} alt={nameOf(m)} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{nameOf(m)}</p>
                  <p className="text-xs text-gray-400 truncate">{m.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" onClick={() => setStatus(m, 'active')} loading={actingId === m.id}>Approve</Button>
                  <Button size="sm" variant="ghost" onClick={() => setStatus(m, 'rejected')} disabled={actingId === m.id}>
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Onboarding pipeline */}
      <section>
        <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white mb-1">Onboarding Pipeline</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Members who joined in the last 60 days and how complete their profile is.
        </p>
        {recentJoiners.length === 0 ? (
          <div className="text-center py-8 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
            <p className="text-sm text-gray-400">No new members in the last 60 days.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentJoiners.map((m) => {
              const pct = profileCompletion(m);
              return (
                <div key={m.id} className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3">
                  <Avatar src={m.photoURL} alt={nameOf(m)} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{nameOf(m)}</p>
                    <p className="text-xs text-gray-400">
                      Joined {m.joinedAt || m.createdAt ? formatDate(m.joinedAt || m.createdAt!, { month: 'short' }) : '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {m.onboardingComplete && <Badge variant="green">Onboarded</Badge>}
                    <div className="w-24">
                      <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                        <span>Profile</span>
                        <span className={pct === 100 ? 'text-emerald-500 font-semibold' : ''}>{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-500' : 'bg-cranberry'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Org email accounts */}
      <section>
        <SectionHeader
          title="Org email accounts"
          count={needsOrgEmail.length}
          action={
            needsOrgEmail.length > 0 ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={provisionAll}
                loading={provisionAllRunning}
                disabled={provisioningId !== null}
              >
                {provisionAllRunning && provisionAllProgress
                  ? `Provisioning ${provisionAllProgress.done}/${provisionAllProgress.total}…`
                  : `Provision all (${needsOrgEmail.length})`}
              </Button>
            ) : undefined
          }
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Active members without an @rotaractnyc.org address. Emails are paused, so the temporary
          password shown here is the primary way to hand off credentials.
        </p>

        {needsOrgEmail.length === 0 && Object.keys(provisionResults).length === 0 ? (
          <div className="text-center py-8 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
            <p className="text-sm text-gray-400">Every active member has an org email 🎉</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
            {/* Members still needing an org email */}
            {needsOrgEmail.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar src={m.photoURL} alt={nameOf(m)} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{nameOf(m)}</p>
                  <p className="text-xs text-gray-500 truncate">{m.personalEmail || m.email || 'No email on file'}</p>
                </div>
                <div className="shrink-0">
                  <Button
                    size="sm"
                    onClick={() => provision(m)}
                    loading={provisioningId === m.id}
                    disabled={provisionAllRunning || (provisioningId !== null && provisioningId !== m.id)}
                  >
                    Provision
                  </Button>
                </div>
              </div>
            ))}

            {/* Freshly provisioned this session — credentials to hand off */}
            {active
              .filter((m) => provisionResults[m.id])
              .map((m) => {
                const r = provisionResults[m.id];
                const emailKey = `email-${m.id}`;
                const pwKey = `pw-${m.id}`;
                return (
                  <div key={m.id} className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={m.photoURL} alt={nameOf(m)} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{nameOf(m)}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {r.paused
                            ? 'Emails paused — share manually'
                            : r.emailed
                              ? 'Emailed to personal address'
                              : 'Provisioned'}
                        </p>
                      </div>
                      <Badge variant="green" className="shrink-0">Provisioned</Badge>
                    </div>
                    <div className="mt-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500 w-20 shrink-0">Email</span>
                        <code className="flex-1 min-w-0 truncate text-sm text-gray-900 dark:text-gray-100">{r.orgEmail}</code>
                        <Button size="sm" variant="ghost" onClick={() => copy(emailKey, r.orgEmail)}>
                          {copiedKey === emailKey ? 'Copied' : 'Copy'}
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500 w-20 shrink-0">Password</span>
                        <code className="flex-1 min-w-0 truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{r.temporaryPassword}</code>
                        <Button size="sm" onClick={() => copy(pwKey, r.temporaryPassword)}>
                          {copiedKey === pwKey ? 'Copied' : 'Copy'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* Provisioned accounts — active members who already have an org email */}
        {hasOrgEmail.length > 0 && (
          <div className="mt-6">
            <SectionHeader title="Provisioned accounts" count={hasOrgEmail.length} />
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Active members with an @rotaractnyc.org address. Suspending is reversible in Google Admin.
            </p>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
              {hasOrgEmail.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar src={m.photoURL} alt={nameOf(m)} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{nameOf(m)}</p>
                    <code className="text-xs text-gray-500 truncate block">{m.orgEmail}</code>
                  </div>
                  <div className="shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => suspend(m)}
                      loading={suspendingId === m.id}
                      disabled={suspendingId !== null && suspendingId !== m.id}
                    >
                      Suspend
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
