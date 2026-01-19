'use client';

import { useAuth } from '@/lib/firebase/auth';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { canManageFinances, isAdmin, canManagePosts } from '@/lib/portal/roles';
import NewPostModal from './NewPostModal';

export default function PortalNav() {
  const { user, userData, signOut } = useAuth();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const showAdminLink = isAdmin(userData?.role);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const canCreatePosts = canManagePosts(userData?.role);

  const navItems = [
    { href: '/portal/announcements', label: 'Feed' },
    { href: '/portal/events', label: 'Calendar' },
    { href: '/portal/directory', label: 'Directory' },
    { href: '/portal/docs', label: 'Resources' },
  ];

  // Add Finance tab if user has treasurer+ role
  if (canManageFinances(userData?.role)) {
    navItems.push({ href: '/portal/finance', label: 'Finance' });
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
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-[#141414]/95 backdrop-blur-md border-b border-[#e5e5e5] dark:border-[#333]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link href="/portal">
              <div className="flex items-center">
                <Image
                  src="/Rotaract%20Logo%20(1).png"
                  alt="Rotaract NYC Member Portal"
                  width={140}
                  height={36}
                  className="h-9 w-auto"
                  priority
                />
              </div>
            </Link>
          </div>

          {/* Search Bar (Centered) */}
          <div className="flex-1 max-w-md hidden md:flex">
            <label className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <span className="material-symbols-outlined text-[20px]">search</span>
              </div>
              <input 
                className="block w-full pl-10 pr-3 py-2 border-none rounded-lg leading-5 bg-[#f2f2f2] dark:bg-[#2a2a2a] text-sm text-primary dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rotaract-blue/50 transition-shadow"
                placeholder="Search announcements, members, or events..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </label>
          </div>

          {/* Navigation & Profile */}
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href === '/portal/announcements' && pathname === '/portal');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-sm font-medium transition-colors py-5 ${
                      isActive
                        ? 'font-bold text-primary dark:text-white border-b-2 border-primary dark:border-white'
                        : 'text-gray-500 dark:text-gray-400 hover:text-rotaract-blue'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-3 pl-6 border-l border-gray-200 dark:border-gray-800">
              {canCreatePosts && (
                <button
                  onClick={() => setShowNewPostModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#003a70] hover:bg-[#003a70]/90 text-white text-sm font-bold transition-all shadow-lg shadow-[#003a70]/20"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  <span className="hidden sm:inline">New Post</span>
                </button>
              )}
              
              {showAdminLink ? (
                <Link
                  href="/admin"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-sm font-medium text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              ) : null}

              <button
                onClick={() => setShowNotifications((v) => !v)}
                className="relative p-1 text-gray-500 hover:text-primary dark:hover:text-white transition-colors"
                aria-label="Notifications"
              >
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#141414]"></span>
              </button>

              {showNotifications ? (
                <div className="absolute right-4 top-16 w-72 bg-white dark:bg-[#1e1e1e] rounded-lg shadow-lg border border-gray-200 dark:border-[#2a2a2a] p-3">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">No notifications yet.</p>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="mt-3 w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#2a2a2a] text-sm font-semibold"
                  >
                    Close
                  </button>
                </div>
              ) : null}
              
              <div className="relative group">
                <div 
                  className="w-9 h-9 rounded-full bg-cover bg-center border border-gray-200 dark:border-gray-700 cursor-pointer"
                  style={user?.photoURL ? { backgroundImage: `url(${user.photoURL})` } : {}}
                >
                  {!user?.photoURL && (
                    <div className="w-full h-full rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500">
                      <span className="material-symbols-outlined text-[18px]">person</span>
                    </div>
                  )}
                </div>
                
                {/* Dropdown menu */}
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1e1e1e] rounded-lg shadow-lg border border-gray-200 dark:border-[#2a2a2a] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="p-3 border-b border-gray-100 dark:border-[#2a2a2a]">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{userData?.name || user?.displayName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{userData?.role || 'Member'}</p>
                  </div>

                  <Link
                    href="/portal/settings"
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">settings</span>
                    Settings
                  </Link>

                  {isAdmin(userData?.role) ? (
                    <Link
                      href="/admin"
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                      Admin
                    </Link>
                  ) : null}

                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* New Post Modal */}
      <NewPostModal isOpen={showNewPostModal} onClose={() => setShowNewPostModal(false)} />
    </header>
  );
}
