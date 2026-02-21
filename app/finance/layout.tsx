'use client';

import { useAuth, AuthProvider } from '@/lib/firebase/auth';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Spinner from '@/components/ui/Spinner';
import { useEffect } from 'react';

const navItems = [
  { label: 'Dashboard', href: '/finance', icon: '📊' },
  { label: 'Activities', href: '/finance/activities', icon: '🎯' },
  { label: 'Expenses', href: '/finance/expenses', icon: '💰' },
  { label: 'Approvals', href: '/finance/approvals', icon: '✓' },
  { label: 'Reports', href: '/finance/reports', icon: '📈' },
];

function FinanceLayoutInner({ children }: { children: React.ReactNode }) {
  const { member, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isTreasurer = member?.role === 'treasurer' || member?.role === 'president';

  useEffect(() => {
    if (!loading && (!member || !isTreasurer)) {
      router.push('/portal');
    }
  }, [member, loading, isTreasurer, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!member || !isTreasurer) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <div className="container-page py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/portal"
                className="text-sm text-gray-500 hover:text-cranberry transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Portal
              </Link>
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
              <h1 className="text-xl font-display font-bold text-gray-900 dark:text-white">
                Finance Portal
              </h1>
              {member.role === 'president' && (
                <span className="text-xs bg-cranberry text-white px-2 py-1 rounded-full font-medium">
                  President
                </span>
              )}
              {member.role === 'treasurer' && (
                <span className="text-xs bg-gold text-gray-900 px-2 py-1 rounded-full font-medium">
                  Treasurer
                </span>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex gap-1 mt-4 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-cranberry text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="container-page py-8">{children}</div>
    </div>
  );
}

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <FinanceLayoutInner>{children}</FinanceLayoutInner>
    </AuthProvider>
  );
}
