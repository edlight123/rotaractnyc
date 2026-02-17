'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import DarkModeToggle from '@/components/ui/DarkModeToggle';
import SearchModal from '@/components/SearchModal';
import { cn } from '@/lib/utils/cn';

const navigation = [
  {
    label: 'About',
    href: '/about',
    children: [
      { label: 'Our Mission', href: '/about' },
      { label: 'Leadership', href: '/leadership' },
      { label: 'Membership', href: '/membership' },
      { label: 'FAQ', href: '/faq' },
    ],
  },
  {
    label: 'Events',
    href: '/events',
  },
  {
    label: 'News',
    href: '/news',
  },
  {
    label: 'Gallery',
    href: '/gallery',
  },
  {
    label: 'Contact',
    href: '/contact',
  },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setOpenDropdown(null);
  }, [pathname]);

  // Cmd+K / Ctrl+K to open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/95 dark:bg-gray-950/95 backdrop-blur-md shadow-sm border-b border-gray-200/50 dark:border-gray-800/50'
          : 'bg-transparent'
      )}
    >
      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-cranberry focus:text-white focus:rounded-xl focus:text-sm focus:font-semibold"
      >
        Skip to content
      </a>

      <nav className="container-page flex items-center justify-between h-[72px]" aria-label="Main navigation">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 bg-cranberry rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <div className="hidden sm:block">
            <p className={cn(
              'font-display font-bold text-sm leading-tight transition-colors',
              scrolled ? 'text-gray-900 dark:text-white' : 'text-white'
            )}>
              Rotaract NYC
            </p>
            <p className={cn(
              'text-[10px] font-medium leading-tight transition-colors',
              scrolled ? 'text-gray-500 dark:text-gray-400' : 'text-white/70'
            )}>
              at the United Nations
            </p>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-1">
          {navigation.map((item) => (
            <div
              key={item.label}
              className="relative"
              onMouseEnter={() => item.children && setOpenDropdown(item.label)}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <Link
                href={item.href}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? scrolled
                      ? 'text-cranberry bg-cranberry-50 dark:bg-cranberry-900/20'
                      : 'text-white bg-white/20'
                    : scrolled
                    ? 'text-gray-700 hover:text-cranberry hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800'
                    : 'text-white/90 hover:text-white hover:bg-white/10'
                )}
              >
                {item.label}
                {item.children && (
                  <svg className="w-3.5 h-3.5 ml-1 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </Link>

              {/* Dropdown */}
              {item.children && openDropdown === item.label && (
                <div className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 py-2 animate-slide-down">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={cn(
                        'block px-4 py-2.5 text-sm transition-colors',
                        isActive(child.href)
                          ? 'text-cranberry bg-cranberry-50 dark:bg-cranberry-900/20'
                          : 'text-gray-700 hover:text-cranberry hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800'
                      )}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            className={cn(
              'p-2 rounded-lg transition-colors',
              scrolled
                ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            )}
            aria-label="Search"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <DarkModeToggle />
          <Link
            href="/portal/login"
            className={cn(
              'hidden sm:inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-colors',
              scrolled
                ? 'text-gray-700 hover:text-cranberry hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800'
                : 'text-white/90 hover:text-white hover:bg-white/10'
            )}
          >
            Member Login
          </Link>
          <Link
            href="/membership"
            className="hidden sm:inline-flex btn-sm btn-gold"
          >
            Join Us
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            className={cn(
              'lg:hidden p-2 rounded-lg transition-colors',
              scrolled
                ? 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                : 'text-white hover:bg-white/10'
            )}
          >
            {mobileOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div id="mobile-nav" className="lg:hidden bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 animate-slide-down">
          <div className="container-page py-4 space-y-1">
            {navigation.map((item) => (
              <div key={item.label}>
                <Link
                  href={item.href}
                  className={cn(
                    'block px-4 py-3 rounded-lg text-base font-medium transition-colors',
                    isActive(item.href)
                      ? 'text-cranberry bg-cranberry-50 dark:bg-cranberry-900/20'
                      : 'text-gray-700 hover:text-cranberry hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                  )}
                >
                  {item.label}
                </Link>
                {item.children && (
                  <div className="ml-4 space-y-1">
                    {item.children.filter(c => c.href !== item.href).map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block px-4 py-2 rounded-lg text-sm text-gray-500 hover:text-cranberry hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
              <Link href="/portal/login" className="block px-4 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-300">
                Member Login
              </Link>
              <Link href="/membership" className="block text-center btn-md btn-gold">
                Join Rotaract NYC
              </Link>
            </div>
          </div>
        </div>
      )}

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
