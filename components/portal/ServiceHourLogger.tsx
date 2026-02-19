'use client';

import { useState, useMemo } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import type { RotaractEvent } from '@/types';

interface ServiceHourLoggerProps {
  events: RotaractEvent[];
  onSubmit: (data: { eventId: string; eventTitle: string; hours: number; notes: string }) => Promise<void>;
}

/** Calculate event duration in hours from time + endTime (e.g. "10:00 AM" / "2:30 PM") or date/endDate */
function calcEventDurationHours(event: RotaractEvent): number | null {
  // Try time strings first (e.g. "10:00 AM", "14:00", "2:30 PM")
  if (event.time && event.endTime) {
    const parse = (t: string): number | null => {
      // Handle "HH:MM AM/PM"
      const ampm = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (ampm) {
        let h = parseInt(ampm[1], 10);
        const m = parseInt(ampm[2], 10);
        const period = ampm[3].toUpperCase();
        if (period === 'PM' && h !== 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
        return h + m / 60;
      }
      // Handle "HH:MM" (24h)
      const mil = t.match(/^(\d{1,2}):(\d{2})$/);
      if (mil) return parseInt(mil[1], 10) + parseInt(mil[2], 10) / 60;
      return null;
    };
    const start = parse(event.time);
    const end = parse(event.endTime);
    if (start !== null && end !== null && end > start) {
      return Math.round((end - start) * 2) / 2; // round to nearest 0.5
    }
  }
  // Fallback: use date and endDate ISO strings
  if (event.date && event.endDate) {
    const d1 = new Date(event.date).getTime();
    const d2 = new Date(event.endDate).getTime();
    if (d2 > d1) {
      const hrs = (d2 - d1) / (1000 * 60 * 60);
      if (hrs <= 24) return Math.round(hrs * 2) / 2;
    }
  }
  return null;
}

export default function ServiceHourLogger({ events, onSubmit }: ServiceHourLoggerProps) {
  const [form, setForm] = useState({ eventId: '', hours: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const serviceEvents = events.filter((e) => e.type === 'service' || e.type === 'free');

  // Compute expected duration for selected event
  const selectedEvent = useMemo(
    () => serviceEvents.find((ev) => ev.id === form.eventId) ?? null,
    [serviceEvents, form.eventId],
  );
  const expectedHours = useMemo(
    () => (selectedEvent ? calcEventDurationHours(selectedEvent) : null),
    [selectedEvent],
  );

  // Show warning if logged hours exceed event duration
  const enteredHours = parseFloat(form.hours);
  const exceedsEvent = expectedHours !== null && !isNaN(enteredHours) && enteredHours > expectedHours;

  const handleEventChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const eventId = e.target.value;
    const ev = serviceEvents.find((ev) => ev.id === eventId);
    const duration = ev ? calcEventDurationHours(ev) : null;
    setForm({
      ...form,
      eventId,
      // Pre-fill hours from event duration
      hours: duration !== null ? String(duration) : form.hours,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.hours) return;
    setSubmitting(true);
    try {
      await onSubmit({
        eventId: form.eventId || '',
        eventTitle: serviceEvents.find((ev) => ev.id === form.eventId)?.title || 'Other',
        hours: parseFloat(form.hours),
        notes: form.notes,
      });
      setForm({ eventId: '', hours: '', notes: '' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card padding="md">
      <h3 className="font-display font-bold text-gray-900 dark:text-white mb-4">Log Service Hours</h3>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            label="Event"
            options={serviceEvents.map((ev) => ({ value: ev.id, label: ev.title }))}
            placeholder="Select an event (optional)"
            value={form.eventId}
            onChange={handleEventChange}
          />
          <div>
            <Input
              label="Hours"
              type="number"
              min="0.5"
              step="0.5"
              required
              value={form.hours}
              onChange={(e) => setForm({ ...form, hours: e.target.value })}
              placeholder="e.g., 3"
              error={exceedsEvent ? undefined : undefined}
            />
            {expectedHours !== null && (
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Event duration: {expectedHours}h
              </p>
            )}
          </div>
        </div>

        {exceedsEvent && (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>
              The hours you entered ({enteredHours}h) exceed the event duration ({expectedHours}h). Please explain in the notes below.
            </span>
          </div>
        )}

        <Textarea
          label={exceedsEvent ? 'Notes (required — please explain extra hours)' : 'Notes (optional)'}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder={exceedsEvent ? 'Please explain why you logged more hours than the event duration...' : 'Describe your service...'}
          rows={3}
          required={exceedsEvent}
        />
        <Button type="submit" loading={submitting} disabled={exceedsEvent && !form.notes.trim()}>
          Submit Hours
        </Button>
      </form>
    </Card>
  );
}
