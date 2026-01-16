'use client';

import { useAuth } from '@/lib/firebase/auth';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { canManageFinances } from '@/lib/portal/roles';

export default function PortalSidebar() {
  const { user, userData, signOut } = useAuth();
  const pathname = usePathname();

  const navItems = [
    { href: '/portal', label: 'Community Hub', icon: 'home' },
    { href: '/portal/events', label: 'Events', icon: 'calendar_today' },
    { href: '/portal/directory', label: 'Directory', icon: 'groups' },
    { href: '/portal/announcements', label: 'Announcements', icon: 'campaign' },
    { href: '/portal/docs', label: 'Resources', icon: 'folder_open' },
  ];

  // Add Finance tab if user has treasurer+ role
  if (canManageFinances(userData?.role)) {
    navItems.push({ href: '/portal/finance', label: 'Finance', icon: 'account_balance' });
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/portal/login';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <aside className="hidden md:flex flex-col sticky top-8 h-[calc(100vh-4rem)]">
      <div className="flex flex-col h-full justify-between bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col gap-8">
          {/* Brand */}
          <Link href="/portal" className="flex items-center gap-3 px-2">
            <Image
              src="/Rotaract%20Logo%20(1).png"
              alt="Rotaract NYC Member Portal"
              width={160}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </Link>

          {/* Nav Links */}
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-[#17b0cf]/10 text-[#17b0cf]'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <span className={`material-symbols-${isActive ? 'filled' : 'outlined'} text-[22px] ${isActive ? '' : 'group-hover:text-[#17b0cf]'} transition-colors`}>
                    {item.icon}
                  </span>
                  <span className={`text-sm ${isActive ? 'font-bold' : 'font-medium'}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer / User Info & Logout */}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
          {/* User Info */}
          <div className="flex items-center gap-3 px-2 mb-4">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="size-10 rounded-full border-2 border-gray-200 dark:border-gray-700"
              />
            ) : (
              <div className="size-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-gray-500">person</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {userData?.name || user?.displayName || 'Member'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {userData?.role || 'Member'}
              </p>
            </div>
          </div>
          
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-2 w-full text-gray-400 hover:text-coral transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
