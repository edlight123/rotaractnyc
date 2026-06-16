'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth';
import AccountShell from '@/components/account/AccountShell';

interface Subscriptions {
  newsletter: boolean;
  volunteer: boolean;
  eventReminders: boolean;
}

interface Profile {
  email: string;
  emailVerified: boolean;
  accountType: 'supporter' | 'member';
  displayName: string;
  firstName: string;
  lastName: string;
  phone: string;
  photoURL: string;
  subscriptions: Subscriptions;
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/account/login?redirect=/account/profile');
      return;
    }
    let cancelled = false;
    (async () => {
      setFetching(true);
      setError(null);
      try {
        const res = await fetch('/api/account/profile', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load profile');
        const json = await res.json();
        if (!cancelled) setProfile(json.profile as Profile);
      } catch {
        if (!cancelled) setError('We couldn’t load your profile. Please try again.');
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading, router]);

  function setField<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((p) => (p ? { ...p, [key]: value } : p));
    setSaved(false);
  }

  function setSub<K extends keyof Subscriptions>(key: K, value: boolean) {
    setProfile((p) =>
      p ? { ...p, subscriptions: { ...p.subscriptions, [key]: value } } : p,
    );
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: profile.displayName,
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone,
          subscriptions: profile.subscriptions,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSaved(true);
    } catch {
      setError('We couldn’t save your changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AccountShell title="My profile" subtitle="Manage your details and email preferences.">
      {fetching ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-cranberry" />
        </div>
      ) : !profile ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || 'Profile unavailable.'}
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-8">
          {/* Account email (read-only) */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
            <div className="text-sm text-gray-500 dark:text-gray-400">Account email</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white">{profile.email}</span>
              {profile.emailVerified ? (
                <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                  Unverified
                </span>
              )}
            </div>
          </div>

          {/* Details */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              Your details
            </legend>
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Display name
              </label>
              <input
                id="displayName"
                type="text"
                value={profile.displayName}
                onChange={(e) => setField('displayName', e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:border-cranberry focus:ring-cranberry"
                maxLength={100}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  First name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={profile.firstName}
                  onChange={(e) => setField('firstName', e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:border-cranberry focus:ring-cranberry"
                  maxLength={60}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Last name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={profile.lastName}
                  onChange={(e) => setField('lastName', e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:border-cranberry focus:ring-cranberry"
                  maxLength={60}
                />
              </div>
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Phone <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="phone"
                type="tel"
                value={profile.phone}
                onChange={(e) => setField('phone', e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:border-cranberry focus:ring-cranberry"
                maxLength={30}
              />
            </div>
          </fieldset>

          {/* Email preferences */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              Email preferences
            </legend>
            {([
              ['newsletter', 'Newsletter', 'Club news, impact stories, and highlights.'],
              ['volunteer', 'Volunteer opportunities', 'Hands-on service projects and callouts.'],
              ['eventReminders', 'Event reminders', 'Reminders for events you’re attending.'],
            ] as const).map(([key, label, desc]) => (
              <label
                key={key}
                className="flex items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={profile.subscriptions[key]}
                  onChange={(e) => setSub(key, e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-cranberry focus:ring-cranberry"
                />
                <span>
                  <span className="block text-sm font-medium text-gray-900 dark:text-white">{label}</span>
                  <span className="block text-sm text-gray-500 dark:text-gray-400">{desc}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="btn-md btn-primary disabled:opacity-60">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {saved && <span className="text-sm font-medium text-green-600">Saved ✓</span>}
          </div>
        </form>
      )}
    </AccountShell>
  );
}
