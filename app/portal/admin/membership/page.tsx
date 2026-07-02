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
    </div>
  );
}
