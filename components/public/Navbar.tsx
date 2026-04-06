'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import DarkModeToggle from '@/components/ui/DarkModeToggle';
import { cn } from '@/lib/utils/cn';

const SearchModal = dynamic(() => import('@/components/SearchModal'), { ssr: false });

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
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const dropdownTriggerRef = useRef<HTMLButtonElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);

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

  /* ── Mobile menu focus trap ── */
  useEffect(() => {
    if (!mobileOpen) return;
    const menu = mobileMenuRef.current;
    if (!menu) return;
    const focusables = menu.querySelectorAll<HTMLElement>('a, button, [tabindex]:not([tabindex="-1"])');
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    const trapFocus = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMobileOpen(false); hamburgerRef.current?.focus(); return; }
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    menu.addEventListener('keydown', trapFocus);
    first?.focus();
    return () => menu.removeEventListener('keydown', trapFocus);
  }, [mobileOpen]);

  /* ── Desktop dropdown keyboard navigation ── */
  const handleDropdownKeyDown = useCallback((e: React.KeyboardEvent, item: typeof navigation[0]) => {
    if (!item.children) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      setOpenDropdown(item.label);
      // Focus first menu item after render
      requestAnimationFrame(() => {
        const firstItem = dropdownMenuRef.current?.querySelector<HTMLElement>('a');
        firstItem?.focus();
      });
    }
  }, []);

  const handleMenuItemKeyDown = useCallback((e: React.KeyboardEvent) => {
    const menu = dropdownMenuRef.current;
    if (!menu) return;
    const items = Array.from(menu.querySelectorAll<HTMLElement>('a'));
    const idx = items.indexOf(e.currentTarget as HTMLElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(idx + 1) % items.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(idx - 1 + items.length) % items.length]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpenDropdown(null);
      dropdownTriggerRef.current?.focus();
    }
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
        <Link href="/" className="flex items-center group">
          <Image
            src="/rotaract-logo.png"
            alt="Rotaract NYC at the United Nations"
            width={240}
            height={60}
            className={cn(
              'h-12 w-auto transition-all',
              scrolled ? 'brightness-0 dark:brightness-0 dark:invert' : 'brightness-0 invert'
            )}
            priority
          />
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
              {item.children ? (
                <button
                  ref={dropdownTriggerRef}
                  type="button"
                  aria-haspopup="true"
                  aria-expanded={openDropdown === item.label}
                  onKeyDown={(e) => handleDropdownKeyDown(e, item)}
                  onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center',
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
                  <svg className="w-3.5 h-3.5 ml-1" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              ) : (
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
                </Link>
              )}

              {/* Dropdown */}
              {item.children && openDropdown === item.label && (
                <div
                  ref={dropdownMenuRef}
                  role="menu"
                  aria-label={`${item.label} submenu`}
                  className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 py-2 animate-slide-down"
                >
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      role="menuitem"
                      tabIndex={-1}
                      onKeyDown={handleMenuItemKeyDown}
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
            <svg className="w-5 h-5" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            ref={hamburgerRef}
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
              <svg className="w-6 h-6" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div
          id="mobile-nav"
          ref={mobileMenuRef}
          role="navigation"
          aria-label="Mobile navigation"
          className="lg:hidden bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 animate-slide-down"
        >
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
