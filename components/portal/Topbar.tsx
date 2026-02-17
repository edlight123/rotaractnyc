'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/firebase/auth';
import Avatar from '@/components/ui/Avatar';
import DarkModeToggle from '@/components/ui/DarkModeToggle';
import Dropdown from '@/components/ui/Dropdown';

interface TopbarProps {
  onMenuToggle: () => void;
}

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const { member, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 lg:px-6">
      <div className="flex items-center justify-between h-full">
        {/* Left: hamburger + back link */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-cranberry dark:text-gray-400 dark:hover:text-cranberry-400 transition-colors hidden sm:inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Site
          </Link>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          <DarkModeToggle />

          {member && (
            <Dropdown
              trigger={
                <div className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                  <Avatar src={member.photoURL} alt={member.displayName || member.email || ''} size="sm" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
                    {member.firstName || member.displayName?.split(' ')[0]}
                  </span>
                </div>
              }
              items={[
                { id: 'profile', label: 'Profile', onClick: () => (window.location.href = '/portal/profile') },
                { id: 'site', label: 'View Public Site', onClick: () => (window.location.href = '/') },
                { id: 'signout', label: 'Sign Out', danger: true, onClick: () => signOut() },
              ]}
            />
          )}
        </div>
      </div>
    </header>
  );
}
