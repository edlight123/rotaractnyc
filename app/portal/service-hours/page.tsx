'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { useServiceHours, usePortalEvents, apiPost, apiPatch, apiGet } from '@/hooks/useFirestore';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Tabs from '@/components/ui/Tabs';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ServiceHourLogger from '@/components/portal/ServiceHourLogger';
import type { ServiceHour, RotaractEvent } from '@/types';

export default function ServiceHoursPage() {
  const { member } = useAuth();
  const { toast } = useToast();
  const { data: hours, loading } = useServiceHours(member?.id || null);
  const { data: events } = usePortalEvents();
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('my-hours');
  const [pendingEntries, setPendingEntries] = useState<any[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);

  const isBoardOrAbove = member?.role === 'board' || member?.role === 'president' || member?.role === 'treasurer';

  const serviceHours = (hours || []) as ServiceHour[];
  const approvedHours = serviceHours.filter((h) => h.status === 'approved');
  const totalHours = approvedHours.reduce((sum, h) => sum + (h.hours || 0), 0);

  // Current year hours (July-June)
  const now = new Date();
  const yearStart = now.getMonth() >= 6 ? new Date(now.getFullYear(), 6, 1) : new Date(now.getFullYear() - 1, 6, 1);
  const thisYearHours = approvedHours
    .filter((h) => {
      const raw = h.createdAt as any;
      const d = raw?.toDate ? raw.toDate() : new Date(raw);
      return !isNaN(d.getTime()) && d >= yearStart;
    })
    .reduce((sum, h) => sum + (h.hours || 0), 0);

  const statusColors: Record<string, 'green' | 'gold' | 'red'> = {
    approved: 'green',
    pending: 'gold',
    rejected: 'red',
  };

  // Fetch pending entries for board review
  useEffect(() => {
    if (activeTab === 'review' && isBoardOrAbove) {
      setPendingLoading(true);
      apiGet('/api/portal/service-hours?filter=pending')
        .then((data) => setPendingEntries(Array.isArray(data) ? data : []))
        .catch(() => setPendingEntries([]))
        .finally(() => setPendingLoading(false));
    }
  }, [activeTab, isBoardOrAbove]);

  const handleReview = async (entryId: string, status: 'approved' | 'rejected') => {
    setReviewing(entryId);
    try {
      await apiPatch('/api/portal/service-hours', { entryId, status });
      setPendingEntries((prev) => prev.filter((e) => e.id !== entryId));
      toast(`Hours ${status}!`);
    } catch (err: any) {
      toast(err.message || 'Failed to update', 'error');
    } finally {
      setReviewing(null);
    }
  };

  const handleSubmit = async (data: { eventId: string; eventTitle: string; hours: number; notes: string }) => {
    if (!member) return;
    try {
      await apiPost('/api/portal/service-hours', {
        eventId: data.eventId || null,
        eventTitle: data.eventTitle,
        hours: data.hours,
        notes: data.notes,
      });
      toast('Service hours submitted for approval!');
      setShowForm(false);
    } catch (err: any) {
      toast(err.message || 'Failed to submit hours', 'error');
    }
  };

  const tabs = [
    { id: 'my-hours', label: 'My Hours' },
    ...(isBoardOrAbove ? [{ id: 'review', label: 'Review Pending' }] : []),
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 page-enter">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Service Hours</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Log and track your community service contributions.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? (
            'Cancel'
          ) : (
            <>
              <svg className="w-4 h-4 -ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Log Hours
            </>
          )}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-cranberry-50 dark:bg-cranberry-900/20 flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-cranberry" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <p className="text-2xl font-display font-bold text-gray-900 dark:text-white">{totalHours}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Hours</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-azure-50 dark:bg-azure-900/20 flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-azure" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
          </div>
          <p className="text-2xl font-display font-bold text-gray-900 dark:text-white">{thisYearHours}</p>
          <p className="text-xs text-gray-500 mt-0.5">This Year</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <p className="text-2xl font-display font-bold text-gray-900 dark:text-white">{approvedHours.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Events Served</p>
        </div>
      </div>

      {/* Log Form */}
      {showForm && (
        <ServiceHourLogger
          events={(events || []) as RotaractEvent[]}
          onSubmit={handleSubmit}
        />
      )}

      {isBoardOrAbove && <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />}

      {activeTab === 'review' && isBoardOrAbove ? (
        /* Board Review Tab */
        <div>
          <h3 className="font-display font-bold text-gray-900 dark:text-white mb-4">Pending Approvals</h3>
          {pendingLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : pendingEntries.length === 0 ? (
            <EmptyState icon={<svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} title="All caught up" description="No pending service hours to review." />
          ) : (
            <div className="space-y-3">
              {pendingEntries.map((entry) => (
                <div key={entry.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                        {entry.memberName || 'Member'} — {entry.eventTitle || 'Service Hours'}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">{entry.hours} hours · {entry.date || ''}</p>
                      {entry.notes && <p className="text-xs text-gray-400 mt-1">{entry.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button
                        size="sm"
                        variant="primary"
                        loading={reviewing === entry.id}
                        onClick={() => handleReview(entry.id, 'approved')}
                        className="flex-1 sm:flex-initial"
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={reviewing === entry.id}
                        onClick={() => handleReview(entry.id, 'rejected')}
                        className="flex-1 sm:flex-initial"
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* My Hours Tab */
        <div>
          <h3 className="font-display font-bold text-gray-900 dark:text-white mb-4">Recent Submissions</h3>
          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : serviceHours.length === 0 ? (
            <EmptyState icon={<svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} title="No service hours logged" description="Click 'Log Hours' to submit your first service contribution." />
          ) : (
            <div className="space-y-3">
              {serviceHours.map((entry) => (
                <div key={entry.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{entry.eventTitle || 'Service Hours'}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500">{entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : ''}</span>
                        <Badge variant={statusColors[entry.status] || 'gold'}>{entry.status}</Badge>
                      </div>
                      {entry.notes && <p className="text-xs text-gray-400 mt-1">{entry.notes}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-display font-bold text-cranberry">{entry.hours}</p>
                      <p className="text-xs text-gray-400">hours</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
