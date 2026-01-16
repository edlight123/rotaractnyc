'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { canManageFinances } from '@/lib/portal/roles';

export default function MobileHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, userData, signOut } = useAuth();
  const pathname = usePathname();

  const navItems = [
    { href: '/portal', label: 'Community Hub', icon: 'home' },
    { href: '/portal/events', label: 'Events', icon: 'calendar_today' },
    { href: '/portal/directory', label: 'Directory', icon: 'groups' },
    { href: '/portal/announcements', label: 'Announcements', icon: 'campaign' },
    { href: '/portal/docs', label: 'Resources', icon: 'folder_open' },
  ];

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
    <>
      <header className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Link href="/portal" className="flex items-center">
            <Image
              src="/Rotaract%20Logo%20(1).png"
              alt="Rotaract NYC Member Portal"
              width={140}
              height={36}
              className="h-9 w-auto"
              priority
            />
          </Link>
        </div>
        <button 
          className="p-2 text-gray-500"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
      </header>

      {/* Mobile Menu Drawer */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMenuOpen(false)}
          />
          
          {/* Menu */}
          <div className="fixed top-0 right-0 bottom-0 w-72 bg-white dark:bg-gray-800 z-50 md:hidden shadow-xl overflow-y-auto">
            <div className="p-4">
              {/* Close button */}
              <button 
                className="p-2 text-gray-500 hover:text-gray-700 mb-4"
                onClick={() => setMenuOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>

              {/* User Info */}
              <div className="flex items-center gap-3 p-3 mb-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="size-12 rounded-full border-2 border-gray-200 dark:border-gray-600"
                  />
                ) : (
                  <div className="size-12 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
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

              {/* Nav Links */}
              <nav className="flex flex-col gap-2 mb-4">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        isActive
                          ? 'bg-[#17b0cf]/10 text-[#17b0cf]'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className={`material-symbols-${isActive ? 'filled' : 'outlined'} text-[22px]`}>
                        {item.icon}
                      </span>
                      <span className={`text-sm ${isActive ? 'font-bold' : 'font-medium'}`}>
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </nav>

              {/* Sign Out */}
              <button 
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-3 w-full text-gray-500 hover:text-red-500 transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 border-t border-gray-200 dark:border-gray-700 pt-4"
              >
                <span className="material-symbols-outlined text-[22px]">logout</span>
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
