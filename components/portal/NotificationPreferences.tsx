'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { apiGet, apiPatch } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/useToast';

// ── Types ───────────────────────────────────────────────────────────────────

interface NotificationPreferences {
  duesReminders: boolean;
  eventReminders: boolean;
  welcomeSequence: boolean;
  announcements: boolean;
  weeklyDigest: boolean;
}

interface PreferenceItem {
  key: keyof NotificationPreferences;
  label: string;
  description: string;
}

const PREFERENCE_ITEMS: PreferenceItem[] = [
  {
    key: 'duesReminders',
    label: 'Dues Reminders',
    description: 'Get reminded when your dues are unpaid',
  },
  {
    key: 'eventReminders',
    label: 'Event Reminders',
    description: "Get notified about upcoming events you've RSVP'd to",
  },
  {
    key: 'welcomeSequence',
    label: 'Welcome Emails',
    description: 'Receive onboarding tips after joining',
  },
  {
    key: 'announcements',
    label: 'Announcements',
    description: 'Get notified about club announcements',
  },
  {
    key: 'weeklyDigest',
    label: 'Weekly Digest',
    description: 'Receive a weekly summary of club activity',
  },
];

// ── Toggle Switch ───────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full
        border-2 border-transparent transition-colors duration-200 ease-in-out
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
        dark:focus-visible:ring-offset-gray-900
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg
          ring-0 transition-transform duration-200 ease-in-out
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  );
}

// ── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between py-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-3 w-56 bg-gray-100 dark:bg-gray-800 rounded" />
      </div>
      <div className="h-6 w-11 bg-gray-200 dark:bg-gray-700 rounded-full" />
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function NotificationPreferences() {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUpdates = useRef<Partial<NotificationPreferences>>({});

  // Fetch preferences on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchPreferences() {
      try {
        const data = await apiGet<{ preferences: NotificationPreferences }>(
          '/api/portal/notifications',
        );
        if (!cancelled) {
          setPreferences(data.preferences);
        }
      } catch (err) {
        if (!cancelled) {
          toast('Failed to load notification preferences', 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPreferences();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  // Debounced save
  const flushUpdates = useCallback(async () => {
    const updates = { ...pendingUpdates.current };
    pendingUpdates.current = {};

    if (Object.keys(updates).length === 0) return;

    setSaving(true);
    try {
      const data = await apiPatch<{ preferences: NotificationPreferences }>(
        '/api/portal/notifications',
        updates,
      );
      setPreferences(data.preferences);
      toast('Preferences saved', 'success');
    } catch {
      toast('Failed to save preferences', 'error');
    } finally {
      setSaving(false);
    }
  }, [toast]);

  const handleToggle = useCallback(
    (key: keyof NotificationPreferences, value: boolean) => {
      // Optimistic update
      setPreferences((prev) => (prev ? { ...prev, [key]: value } : prev));

      // Batch the update
      pendingUpdates.current[key] = value;

      // Debounce 500ms
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        flushUpdates();
      }, 500);
    },
    [flushUpdates],
  );

  // Flush pending updates on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        // Fire synchronously before unmount – best-effort
        const updates = { ...pendingUpdates.current };
        if (Object.keys(updates).length > 0) {
          navigator.sendBeacon?.(
            '/api/portal/notifications',
            new Blob([JSON.stringify(updates)], { type: 'application/json' }),
          );
        }
      }
    };
  }, []);

  // ── Render ──

  if (loading) {
    return (
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    );
  }

  if (!preferences) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
        Unable to load notification preferences. Please try again later.
      </p>
    );
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {PREFERENCE_ITEMS.map((item) => (
        <div
          key={item.key}
          className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
        >
          <div className="pr-4">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {item.label}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {item.description}
            </p>
          </div>
          <Toggle
            checked={preferences[item.key]}
            onChange={(val) => handleToggle(item.key, val)}
            disabled={saving}
          />
        </div>
      ))}

      {saving && (
        <p className="text-xs text-gray-400 dark:text-gray-500 pt-3 text-right">
          Saving…
        </p>
      )}
    </div>
  );
}
