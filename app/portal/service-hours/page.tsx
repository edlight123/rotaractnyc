'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { useServiceHours, usePortalEvents, apiPost } from '@/hooks/useFirestore';
import { useToast } from '@/components/ui/Toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import StatCard from '@/components/ui/StatCard';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import type { ServiceHour, RotaractEvent } from '@/types';

export default function ServiceHoursPage() {
  const { member } = useAuth();
  const { toast } = useToast();
  const { data: hours, loading } = useServiceHours(member?.id || null);
  const { data: events } = usePortalEvents();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ eventId: '', hours: '', notes: '' });

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

  const serviceEvents = ((events || []) as RotaractEvent[]).filter((e) => e.type === 'service' || e.type === 'free');

  const statusColors: Record<string, 'green' | 'gold' | 'red'> = {
    approved: 'green',
    pending: 'gold',
    rejected: 'red',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.hours || !member) return;
    setSubmitting(true);
    try {
      await apiPost('/api/portal/service-hours', {
        eventId: form.eventId || null,
        eventTitle: serviceEvents.find((ev) => ev.id === form.eventId)?.title || 'Other',
        hours: parseFloat(form.hours),
        notes: form.notes,
      });
      toast('Service hours submitted for approval!');
      setForm({ eventId: '', hours: '', notes: '' });
      setShowForm(false);
    } catch (err: any) {
      toast(err.message || 'Failed to submit hours', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Service Hours</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Log and track your community service contributions.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Log Hours'}</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Hours" value={totalHours} />
        <StatCard label="This Year" value={thisYearHours} />
        <StatCard label="Events Served" value={approvedHours.length} />
      </div>

      {/* Log Form */}
      {showForm && (
        <Card padding="md">
          <h3 className="font-display font-bold text-gray-900 dark:text-white mb-4">Log Service Hours</h3>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Event</label>
                <select
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cranberry-500/20 focus:border-cranberry-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                  value={form.eventId}
                  onChange={(e) => setForm({ ...form, eventId: e.target.value })}
                >
                  <option value="">Select an event (optional)</option>
                  {serviceEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.title}</option>
                  ))}
                </select>
              </div>
              <Input label="Hours" type="number" min="0.5" step="0.5" required value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} placeholder="e.g., 3" />
            </div>
            <Textarea label="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Describe your service..." rows={3} />
            <Button type="submit" loading={submitting}>Submit Hours</Button>
          </form>
        </Card>
      )}

      {/* Recent Hours */}
      <div>
        <h3 className="font-display font-bold text-gray-900 dark:text-white mb-4">Recent Submissions</h3>
        {loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : serviceHours.length === 0 ? (
          <EmptyState icon="⏱️" title="No service hours logged" description="Click 'Log Hours' to submit your first service contribution." />
        ) : (
          <div className="space-y-3">
            {serviceHours.map((entry) => (
              <Card key={entry.id} padding="md">
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
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
