'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/auth';
import { useToast } from '@/components/ui/Toast';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import NotificationPreferences from '@/components/portal/NotificationPreferences';

export default function SettingsPage() {
  const { user, member, signOut } = useAuth();
  const { toast } = useToast();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      toast('Signed out successfully.', 'success');
    } catch {
      toast('Failed to sign out.', 'error');
      setSigningOut(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 page-enter">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage your account preferences and security.
        </p>
      </div>

      {/* ── Account Info ── */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Account</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-4">
            <Avatar
              src={member?.photoURL || user?.photoURL || undefined}
              alt={member?.displayName || user?.displayName || '?'}
              size="lg"
            />
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white truncate">
                {member?.displayName || user?.displayName || 'Member'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {member?.email || user?.email}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Role
              </span>
              <p className="mt-0.5 text-sm text-gray-900 dark:text-white capitalize">
                {member?.role || 'Member'}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </span>
              <p className="mt-0.5 text-sm text-gray-900 dark:text-white capitalize">
                {member?.status || 'Active'}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Member Since
              </span>
              <p className="mt-0.5 text-sm text-gray-900 dark:text-white">
                {member?.joinedAt
                  ? new Date(member.joinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                  : '—'}
              </p>
            </div>
            {member?.status === 'alumni' && (
              <div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Alumni Since
                </span>
                <p className="mt-0.5 text-sm text-gray-900 dark:text-white">
                  {member.alumniSince
                    ? new Date(member.alumniSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    : '—'}
                </p>
              </div>
            )}
            <div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Auth Provider
              </span>
              <p className="mt-0.5 text-sm text-gray-900 dark:text-white">
                Google
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Profile ── */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Profile</h2>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Edit your name, bio, photo, and other information visible to other members.
          </p>
          <Link href="/portal/profile">
            <Button variant="secondary" size="sm">
              Edit Profile
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Notifications ── */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h2>
        </div>
        <div className="px-6 py-5">
          <NotificationPreferences />
        </div>
      </section>

      {/* ── Danger Zone ── */}
      <section className="rounded-xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="px-6 py-4 border-b border-red-100 dark:border-red-900/50">
          <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">Sign Out</h2>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Sign out of the member portal. You can sign back in anytime with your Google account.
          </p>
          <Button
            variant="danger"
            size="sm"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? 'Signing Out…' : 'Sign Out'}
          </Button>
        </div>
      </section>
    </div>
  );
}
