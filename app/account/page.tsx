'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/firebase/auth';

/**
 * Supporter dashboard.
 *
 * Phase 0 scaffold: greets the signed-in user, distinguishes supporter vs.
 * member, and stubs the surfaces (tickets, donations, RSVPs, profile) that are
 * fleshed out in later phases. Members get a shortcut into the member portal.
 */
export default function AccountHubPage() {
  const { user, account, member, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-cranberry" />
      </div>
    );
  }

  // Not signed in — point to the supporter sign-in (Google + email/password +
  // magic link). Note: middleware normally redirects here before this renders.
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-2">
            Your account
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
            Sign in to manage your tickets, RSVPs, and donations.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/account/login" className="btn-md btn-primary">
              Sign In
            </Link>
            <Link href="/account/signup" className="btn-md btn-secondary">
              Create account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const fullName = account?.displayName || user.displayName || user.email || 'there';
  const firstName = fullName.split(' ')[0];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Image
            src="/rotaract-logo.png"
            alt="Rotaract NYC"
            width={160}
            height={40}
            className="h-9 w-auto"
            priority
          />
          <button
            onClick={() => signOut()}
            className="text-sm font-medium text-gray-500 hover:text-cranberry transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
          Welcome, {firstName}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {member
            ? 'You have full member access.'
            : 'This is your Rotaract NYC supporter account.'}
        </p>

        {member && (
          <div className="mt-6 rounded-2xl border border-cranberry-100 dark:border-cranberry-900/30 bg-cranberry-50/50 dark:bg-cranberry-900/10 p-5">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              You&rsquo;re a verified member. Access the directory, committees, dues, and
              internal tools in the member portal.
            </p>
            <Link href="/portal" className="btn-md btn-primary mt-3 inline-flex">
              Go to Member Portal
            </Link>
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <HubCard
            href="/account/tickets"
            title="My tickets"
            desc="Tickets, QR codes, and receipts from events you've registered for."
          />
          <HubCard
            href="/account/donations"
            title="Donation history"
            desc="Your past donations and giving summary."
          />
          <HubCard
            href="/account/profile"
            title="Profile & preferences"
            desc="Update your details and email subscriptions."
          />
          <HubCard
            href="/events"
            title="Browse events"
            desc="Find upcoming events and RSVP or buy tickets."
          />
        </div>

        {!member && (
          <div className="mt-8 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Interested in joining?
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Rotaract NYC members get committees, the club directory, service-hour
              tracking, and more.
            </p>
            <Link href="/membership" className="btn-md btn-secondary mt-3 inline-flex">
              Learn about membership
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

function HubCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-colors hover:border-cranberry/50 hover:bg-cranberry-50/30 dark:hover:bg-cranberry-900/10"
    >
      <div className="flex items-start justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
        <span className="text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-cranberry">
          →
        </span>
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{desc}</p>
    </Link>
  );
}
