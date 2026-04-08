'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import type { ImpactStat } from '@/types';

const ADMIN_ROLES = ['board', 'president'];

const emptyStat: ImpactStat = { value: '', label: '' };

export default function SiteSettingsPage() {
  const { member, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [stats, setStats] = useState<ImpactStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const hasAccess = member && ADMIN_ROLES.includes(member.role);

  // ─── Fetch current stats ───

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings/impact-stats');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setStats(data.impactStats || []);
    } catch {
      toast('Failed to load impact stats.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (hasAccess) fetchStats();
  }, [hasAccess, fetchStats]);

  // ─── Update a single stat field ───

  const updateStat = (index: number, field: keyof ImpactStat, value: string) => {
    setStats((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  // ─── Add / remove stat ───

  const addStat = () => {
    setStats((prev) => [...prev, { ...emptyStat }]);
  };

  const removeStat = (index: number) => {
    setStats((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── Move stat up/down ───

  const moveStat = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= stats.length) return;
    setStats((prev) => {
      const copy = [...prev];
      [copy[index], copy[newIndex]] = [copy[newIndex], copy[index]];
      return copy;
    });
  };

  // ─── Save ───

  const handleSave = async () => {
    // Validate
    const hasEmpty = stats.some((s) => !s.value.trim() || !s.label.trim());
    if (hasEmpty) {
      toast('Every stat must have both a value and a label.', 'error');
      return;
    }
    if (stats.length === 0) {
      toast('Add at least one stat.', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/settings/impact-stats', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ impactStats: stats }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      toast('Impact stats updated! Changes will appear on the site within a few minutes.', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to save impact stats.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Auth guard ───

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Only board members and the president can manage site settings.
          </p>
        </div>
      </div>
    );
  }

  // ─── Render ───

  return (
    <div className="max-w-3xl mx-auto space-y-8 page-enter">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
          Site Settings
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage content displayed on the public website.
        </p>
      </div>

      {/* Impact Stats Section */}
      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Impact Statistics</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Displayed on the homepage and about page.
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={addStat} disabled={loading}>
            + Add Stat
          </Button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse flex gap-4">
                  <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-lg flex-1" />
                  <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-lg flex-1" />
                  <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-lg w-24" />
                </div>
              ))}
            </div>
          ) : stats.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 mb-4">No stats configured yet.</p>
              <Button size="sm" onClick={addStat}>
                Add Your First Stat
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50"
                >
                  {/* Reorder */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveStat(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label="Move up"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStat(index, 'down')}
                      disabled={index === stats.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label="Move down"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* Value */}
                  <div className="flex-1">
                    <label className="sr-only" htmlFor={`stat-value-${index}`}>
                      Stat value
                    </label>
                    <input
                      id={`stat-value-${index}`}
                      type="text"
                      value={stat.value}
                      onChange={(e) => updateStat(index, 'value', e.target.value)}
                      placeholder="5,000+"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-cranberry focus:border-transparent"
                    />
                  </div>

                  {/* Label */}
                  <div className="flex-1">
                    <label className="sr-only" htmlFor={`stat-label-${index}`}>
                      Stat label
                    </label>
                    <input
                      id={`stat-label-${index}`}
                      type="text"
                      value={stat.label}
                      onChange={(e) => updateStat(index, 'label', e.target.value)}
                      placeholder="Service Hours"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-cranberry focus:border-transparent"
                    />
                  </div>

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => removeStat(index)}
                    className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                    aria-label={`Remove ${stat.label || 'stat'}`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Preview */}
          {stats.length > 0 && !loading && (
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Preview
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {stats.map((stat, i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 text-center"
                  >
                    <p className="text-2xl font-display font-bold text-cranberry">
                      {stat.value || '—'}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 font-medium">
                      {stat.label || 'Label'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save button */}
          {stats.length > 0 && !loading && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Changes may take up to 5 minutes to appear on the public site (ISR cache).
              </p>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
