'use client';

import { useAuth } from '@/lib/firebase/auth';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { 
  FiHome, 
  FiUsers, 
  FiCalendar, 
  FiBell, 
  FiFileText, 
  FiDollarSign,
  FiMenu,
  FiX,
  FiLogOut
} from 'react-icons/fi';
import { canManageFinances } from '@/lib/portal/roles';

export default function PortalNav() {
  const { user, userData, signOut } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: '/portal', label: 'Dashboard', icon: FiHome },
    { href: '/portal/directory', label: 'Directory', icon: FiUsers },
    { href: '/portal/events', label: 'Events', icon: FiCalendar },
    { href: '/portal/announcements', label: 'Announcements', icon: FiBell },
    { href: '/portal/docs', label: 'Documents', icon: FiFileText },
  ];

  // Add Finance tab if user has treasurer+ role
  if (canManageFinances(userData?.role)) {
    navItems.push({ href: '/portal/finance', label: 'Finance', icon: FiDollarSign });
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
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/portal" className="flex items-center">
              <span className="text-xl font-bold text-blue-600">RCNYC Portal</span>
            </Link>
            
            {/* Desktop navigation */}
            <div className="hidden md:ml-10 md:flex md:space-x-8">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-2 px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="text-lg" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* User menu */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3">
              {user?.photoURL && (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="h-8 w-8 rounded-full"
                />
              )}
              <div className="text-sm">
                <div className="font-medium text-gray-900">{userData?.name || user?.displayName}</div>
                <div className="text-gray-500 text-xs">{userData?.role || 'Member'}</div>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                title="Sign out"
              >
                <FiLogOut className="text-lg" />
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            >
              {mobileMenuOpen ? <FiX className="text-2xl" /> : <FiMenu className="text-2xl" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200">
          <div className="pt-2 pb-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2 text-base font-medium ${
                    isActive
                      ? 'bg-blue-50 border-l-4 border-blue-500 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="text-xl" />
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="border-t border-gray-200 pt-4 pb-3">
            <div className="flex items-center px-4 gap-3">
              {user?.photoURL && (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="h-10 w-10 rounded-full"
                />
              )}
              <div>
                <div className="text-base font-medium text-gray-800">{userData?.name || user?.displayName}</div>
                <div className="text-sm text-gray-500">{user?.email}</div>
              </div>
            </div>
            <div className="mt-3 px-4">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-4 py-2 text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md"
              >
                <FiLogOut />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
