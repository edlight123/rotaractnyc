'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { apiGet, apiPost } from '@/hooks/useFirestore';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';

// ─── Types ─────────────────────────────────────────────────────────────────

interface ActivityLog {
  id: string;
  action: string;
  metadata: { sent?: number; skipped?: number; errors?: number; events?: number };
  createdAt: string;
}

type ReminderType = 'dues' | 'events' | 'welcome';

const ADMIN_ROLES = ['board', 'president', 'treasurer'];

const REMINDER_CONFIG: Record<ReminderType, { label: string; action: string; description: string; color: 'cranberry' | 'azure' | 'gold' }> = {
  dues: {
    label: 'Dues Reminders',
    action: 'dues_reminder_cron',
    description: 'Sends reminders to active members with unpaid dues (max once per 7 days per member).',
    color: 'cranberry',
  },
  events: {
    label: 'Event Reminders',
    action: 'event_reminder_cron',
    description: 'Sends reminders to RSVP\'d members for events in the next 3 days.',
    color: 'azure',
  },
  welcome: {
    label: 'Welcome Sequence',
    action: 'welcome_sequence_cron',
    description: 'Sends onboarding emails to new members (profile reminder, dues nudge, check-in).',
    color: 'gold',
  },
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

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function actionToType(action: string): ReminderType | null {
  if (action === 'dues_reminder_cron') return 'dues';
  if (action === 'event_reminder_cron') return 'events';
  if (action === 'welcome_sequence_cron') return 'welcome';
  return null;
}

function actionLabel(action: string): string {
  const type = actionToType(action);
  return type ? REMINDER_CONFIG[type].label : action;
}

// ─── Skeleton components ───────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
      </div>
      <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded mb-4" />
      <div className="flex items-center justify-between">
        <div className="h-4 w-40 bg-gray-100 dark:bg-gray-800 rounded" />
        <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3">
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-36 bg-gray-100 dark:bg-gray-800 rounded" />
          <div className="h-4 w-12 bg-gray-100 dark:bg-gray-800 rounded" />
          <div className="h-4 w-12 bg-gray-100 dark:bg-gray-800 rounded" />
          <div className="h-4 w-12 bg-gray-100 dark:bg-gray-800 rounded" />
        </div>
      ))}
    </div>
  );
}

// ─── Page component ────────────────────────────────────────────────────────

export default function AdminRemindersPage() {
  const { member, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggeringType, setTriggeringType] = useState<ReminderType | null>(null);

  const hasAccess = member && ADMIN_ROLES.includes(member.role);

  const fetchLogs = useCallback(async () => {
    try {
      const data = await apiGet<{ logs: ActivityLog[] }>('/api/portal/admin/reminders');
      setLogs(data.logs);
    } catch (err) {
      console.error('Failed to fetch reminder logs:', err);
      toast('Failed to load reminder logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!hasAccess) {
      setLoading(false);
      return;
    }
    fetchLogs();
  }, [hasAccess, fetchLogs]);

  const handleTrigger = async (type: ReminderType) => {
    setTriggeringType(type);
    try {
      await apiPost('/api/portal/admin/reminders', { type });
      toast(`${REMINDER_CONFIG[type].label} triggered successfully!`, 'success');
      // Re-fetch logs to show the new entry
      await fetchLogs();
    } catch (err: any) {
      toast(err.message || 'Failed to trigger reminder', 'error');
    } finally {
      setTriggeringType(null);
    }
  };

  // Auth loading
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  // Access denied
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
          <p className="text-gray-500 dark:text-gray-400 text-sm">You need a board, president, or treasurer role to manage reminders.</p>
        </div>
      </div>
    );
  }

  // Derive last-run info per type
  const lastRuns: Record<ReminderType, ActivityLog | undefined> = {
    dues: logs.find((l) => l.action === 'dues_reminder_cron'),
    events: logs.find((l) => l.action === 'event_reminder_cron'),
    welcome: logs.find((l) => l.action === 'welcome_sequence_cron'),
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Automated Reminders</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          View status and manually trigger automated email reminders.
        </p>
      </div>

      {/* Reminder cards */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.entries(REMINDER_CONFIG) as [ReminderType, typeof REMINDER_CONFIG[ReminderType]][]).map(([type, config]) => {
            const lastRun = lastRuns[type];
            const isTriggering = triggeringType === type;

            return (
              <div
                key={type}
                className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 flex flex-col"
              >
                {/* Title + status */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{config.label}</h3>
                  <Badge variant="green">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    Enabled
                  </Badge>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 flex-1 leading-relaxed">
                  {config.description}
                </p>

                {/* Last run info */}
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                  {lastRun ? (
                    <span>
                      Last run: <span className="text-gray-600 dark:text-gray-300 font-medium">{timeAgo(lastRun.createdAt)}</span>
                      {' · '}
                      {lastRun.metadata.sent ?? 0} sent
                      {(lastRun.metadata.errors ?? 0) > 0 && (
                        <span className="text-red-500"> · {lastRun.metadata.errors} errors</span>
                      )}
                    </span>
                  ) : (
                    <span className="italic">No runs recorded</span>
                  )}
                </div>

                {/* Action */}
                <Button
                  variant="secondary"
                  size="sm"
                  loading={isTriggering}
                  disabled={triggeringType !== null}
                  onClick={() => handleTrigger(type)}
                  className="w-full"
                >
                  {isTriggering ? 'Running…' : 'Run Now'}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Activity log table */}
      <div>
        <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white mb-4">Recent Activity</h2>

        {loading ? (
          <TableSkeleton />
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            <svg aria-hidden="true" className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium">No activity logs yet</p>
            <p className="text-sm mt-1">Cron runs will appear here once triggered.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Type</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Date</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Sent</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Skipped</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {logs.map((log) => {
                  const type = actionToType(log.action);
                  const badgeVariant = type ? REMINDER_CONFIG[type].color : 'gray';

                  return (
                    <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <Badge variant={badgeVariant}>{actionLabel(log.action)}</Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {log.metadata.sent ?? 0}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-gray-500 dark:text-gray-400">
                          {log.metadata.skipped ?? 0}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {(log.metadata.errors ?? 0) > 0 ? (
                          <span className="font-semibold text-red-600 dark:text-red-400">
                            {log.metadata.errors}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
