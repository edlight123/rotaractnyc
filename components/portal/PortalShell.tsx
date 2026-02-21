'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth';
import { useDues } from '@/hooks/useDues';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import Avatar from '@/components/ui/Avatar';
import DarkModeToggle from '@/components/ui/DarkModeToggle';
import DuesBanner from '@/components/portal/DuesBanner';
import Spinner from '@/components/ui/Spinner';
import { cn } from '@/lib/utils/cn';

/* ── Nav structure with grouped sections ── */
const navSections = [
  {
    title: null, // ungrouped — primary
    items: [
      {
        label: 'Dashboard',
        href: '/portal',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>,
      },
      {
        label: 'Events',
        href: '/portal/events',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>,
      },
      {
        label: 'Directory',
        href: '/portal/directory',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>,
      },
      {
        label: 'Messages',
        href: '/portal/messages',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>,
      },
      {
        label: 'Committees',
        href: '/portal/committees',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>,
      },
    ],
  },
  {
    title: 'Membership',
    items: [
      {
        label: 'Service Hours',
        href: '/portal/service-hours',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      },
      {
        label: 'Dues & Billing',
        href: '/portal/dues',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>,
      },
      {
        label: 'My Profile',
        href: '/portal/profile',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
      },
    ],
  },
  {
    title: 'Resources',
    items: [
      {
        label: 'Articles',
        href: '/portal/articles',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5" /></svg>,
      },
      {
        label: 'Documents',
        href: '/portal/documents',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>,
      },
      {
        label: 'Finance',
        href: '/portal/finance',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
        roles: ['treasurer', 'president'],
      },
    ],
  },
];

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { member, signOut, loading } = useAuth();
  const { status: duesStatus } = useDues();

  /* Pull-to-refresh on mobile: reloads the current page data */
  const { bind: pullBind, isRefreshing: isPullRefreshing, pullDistance, indicatorStyle } = usePullToRefresh({
    onRefresh: async () => {
      router.refresh();          // Next.js soft-refresh for server components
      await new Promise((r) => setTimeout(r, 600)); // brief delay for visual feedback
    },
  });

  const isActive = (href: string) => href === '/portal' ? pathname === '/portal' : pathname.startsWith(href);

  /* Close sidebar on Escape key */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSignOutConfirm) { setShowSignOutConfirm(false); return; }
        if (sidebarOpen) setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen, showSignOutConfirm]);

  const handleSignOut = useCallback(() => {
    setShowSignOutConfirm(true);
  }, []);

  const confirmSignOut = useCallback(() => {
    setShowSignOutConfirm(false);
    signOut();
  }, [signOut]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-200 border-t-cranberry dark:border-gray-800 dark:border-t-cranberry" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full bg-cranberry/10" />
            </div>
          </div>
          <p className="text-sm text-gray-400 font-medium">Loading portal…</p>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-cranberry-50 dark:bg-cranberry-900/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-cranberry" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
          </div>
          <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2">Not authenticated</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">Please sign in to access the member portal.</p>
          <Link href="/portal/login" className="btn-md btn-primary">Sign In</Link>
        </div>
      </div>
    );
  }

  if (member.onboardingComplete === false && pathname !== '/portal/onboarding') {
    router.push('/portal/onboarding');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-cranberry" />
      </div>
    );
  }

  if (member.status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gold-100 dark:bg-gold-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gold-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2">Account Pending Approval</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Your account is being reviewed by our team. You&apos;ll receive access once approved.</p>
          <button onClick={signOut} className="btn-sm btn-ghost">Sign Out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#0c0c0f]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ═══ Sidebar ═══ */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-[272px] bg-white dark:bg-gray-900 border-r border-gray-200/80 dark:border-gray-800/80 transform transition-transform duration-300 ease-out lg:translate-x-0 flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo header */}
        <div className="h-20 flex items-center justify-between pl-10 pr-4 border-b border-gray-100 dark:border-gray-800/60 shrink-0">
          <Link href="/portal" className="flex items-center ml-auto" onClick={() => setSidebarOpen(false)}>
            <Image
              src="/rotaract-logo.png"
              alt="Rotaract NYC"
              width={320}
              height={80}
              className="h-14 w-auto dark:brightness-0 dark:invert"
            />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation menu"
            className="lg:hidden ml-2 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 scrollbar-thin">
          {navSections.map((section, si) => {
            const visibleItems = section.items.filter((item) => {
              if (!('roles' in item) || !(item as any).roles) return true;
              return member && (item as any).roles.includes(member.role);
            });
            if (visibleItems.length === 0) return null;

            return (
              <div key={si} className={cn(si > 0 && 'mt-5')}>
                {section.title && (
                  <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400/80 dark:text-gray-500/80">
                    {section.title}
                  </p>
                )}
                <div className="space-y-0.5">
                  {visibleItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150',
                        isActive(item.href)
                          ? 'bg-cranberry-50 text-cranberry-700 dark:bg-cranberry-900/20 dark:text-cranberry-400 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800/60'
                      )}
                    >
                      <span className={cn(
                        'shrink-0 transition-colors',
                        isActive(item.href)
                          ? 'text-cranberry dark:text-cranberry-400'
                          : 'text-gray-400 dark:text-gray-500'
                      )}>
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Sidebar footer — user card + actions */}
        <div className="shrink-0 border-t border-gray-100 dark:border-gray-800/60 p-3 space-y-1">
          {/* User profile card */}
          <Link
            href="/portal/profile"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors group"
          >
            <Avatar src={member.photoURL} alt={member.displayName} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-cranberry dark:group-hover:text-cranberry-400 transition-colors leading-tight truncate">
                {member.firstName || member.displayName?.split(' ')[0]}
              </p>
              <p className="text-[11px] text-gray-400 capitalize leading-tight">{member.role}</p>
            </div>
          </Link>

          {/* Bottom actions row */}
          <div className="flex items-center gap-1 px-1 pt-0.5">
            <DarkModeToggle />
            <Link
              href="/"
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] text-gray-500 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800/60 transition-colors font-medium"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Website
            </Link>
            <div className="relative">
              <button
                onClick={handleSignOut}
                className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                title="Sign out"
                aria-label="Sign out"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
              </button>
              {showSignOutConfirm && (
                <div className="absolute left-0 bottom-full mb-2 w-56 rounded-xl border border-gray-200 bg-white shadow-xl dark:bg-gray-900 dark:border-gray-700 p-4 animate-scale-in origin-bottom-left z-50">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">Sign out of the portal?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={confirmSignOut}
                      className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                    >
                      Sign Out
                    </button>
                    <button
                      onClick={() => setShowSignOutConfirm(false)}
                      className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* ═══ Main content area ═══ */}
      <div className="lg:ml-[272px]">
        {/* Mobile hamburger — floating top-left, only when sidebar closed */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-30 p-2.5 rounded-xl bg-white dark:bg-gray-900 shadow-md border border-gray-200/80 dark:border-gray-800 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors"
          aria-label="Open navigation menu"
          aria-expanded={sidebarOpen}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
        </button>

        {/* Page content */}
        <main {...pullBind()} className="p-4 pt-16 lg:pt-8 lg:p-8 pb-safe" style={{ touchAction: 'pan-x' }}>
          {/* Pull-to-refresh indicator */}
          <div style={indicatorStyle} className="lg:hidden">
            {(pullDistance > 0 || isPullRefreshing) && (
              <Spinner className="w-5 h-5 text-cranberry" />
            )}
          </div>
          {duesStatus === 'UNPAID' && <div className="mb-6"><DuesBanner status={duesStatus} memberType={member?.memberType} /></div>}
          {children}
        </main>
      </div>
    </div>
  );
}
