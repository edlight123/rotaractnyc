'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { DarkModeToggle } from './DarkModeToggle'
import SearchButton from './SearchButton'

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const isActiveHref = (href: string) => pathname === href
  const isMenuItemActive = (item: { href: string; submenu?: { href: string }[] }) =>
    isActiveHref(item.href) || (item.submenu?.some((s) => isActiveHref(s.href)) ?? false)

  const menuItems = [
    { name: 'Home', href: '/' },
    {
      name: 'About',
      href: '/mission',
      submenu: [
        { name: 'Mission', href: '/mission' },
        { name: 'Membership', href: '/membership-requirements' },
        { name: 'Board Members', href: '/leadership' },
        { name: 'Frequently Asked Questions', href: '/frequently-asked-questions' },
        { name: 'Sister-Clubs', href: '/about/sister-clubs' },
      ],
    },
    {
      name: 'Events',
      href: '/events',
      submenu: [
        { name: 'Upcoming Events', href: '/events' },
        { name: 'General Meetings', href: '/meetings' },
      ],
    },
    { name: 'News', href: '/rcun-news' },
    { name: 'Contact', href: '/contact' },
  ]

  return (
    <nav className="nav-container fixed inset-x-0 top-0">
      <div className="container-main">
        <div className="flex justify-between items-center h-[var(--nav-height)]">
          <Link href="/" className="flex items-center">
            <Image
              src="/Rotaract%20Logo%20(1).png"
              alt="Rotaract Logo"
              width={180}
              height={48}
              className="h-10 w-auto"
              priority
            />
          </Link>

          <div className="hidden lg:flex items-center space-x-8">
            {menuItems.map((item) => (
              <div key={item.name} className="relative group">
                <Link
                  href={item.href}
                  className={
                    'font-medium transition-colors py-2 ' +
                    (isMenuItemActive(item)
                      ? 'text-primary dark:text-primary-400'
                      : 'text-text-primary dark:text-text-primary-dark hover:text-primary dark:hover:text-primary-400')
                  }
                >
                  {item.name}
                </Link>
                {item.submenu && (
                  <div className="dropdown-menu top-full left-0 mt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
                    {item.submenu.map((subitem) => {
                      const subIsActive = isActiveHref(subitem.href)
                      return (
                        <Link
                          key={subitem.name}
                          href={subitem.href}
                          className={
                            'block px-4 py-3 transition-colors ' +
                            (subIsActive
                              ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                              : 'text-text-secondary dark:text-text-secondary-dark hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-700 dark:hover:text-primary-300')
                          }
                        >
                          {subitem.name}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
            <SearchButton />
            <DarkModeToggle />
            <Link
              href="/membership-requirements"
              className="px-4 py-2 rounded-lg border border-primary/30 text-primary font-semibold hover:bg-primary/5 transition-colors"
            >
              Join Us
            </Link>
            <Link
              href="/portal/login"
              className="btn-primary"
            >
              Member Login
            </Link>
          </div>

          <div className="lg:hidden flex items-center gap-2">
            <DarkModeToggle />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-primary dark:text-primary-400 text-2xl p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
            >
              <span className="material-symbols-outlined text-3xl">
                {isOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden pb-4"
            >
              {menuItems.map((item) => (
                <div key={item.name} className="py-2">
                  <Link
                    href={item.href}
                    className={
                      'block font-medium py-2 ' +
                      (isMenuItemActive(item)
                        ? 'text-primary dark:text-primary-400'
                        : 'text-text-primary dark:text-text-primary-dark hover:text-primary dark:hover:text-primary-400')
                    }
                    onClick={() => setIsOpen(false)}
                  >
                    {item.name}
                  </Link>
                  {item.submenu && (
                    <div className="pl-4 space-y-2">
                      {item.submenu.map((subitem) => {
                        const subIsActive = isActiveHref(subitem.href)
                        return (
                          <Link
                            key={subitem.name}
                            href={subitem.href}
                            className={
                              'block py-1 ' +
                              (subIsActive
                                ? 'text-primary dark:text-primary-400'
                                : 'text-text-muted dark:text-text-muted-dark hover:text-primary dark:hover:text-primary-400')
                            }
                            onClick={() => setIsOpen(false)}
                          >
                            {subitem.name}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
              <div className="flex flex-col gap-2 mt-4">
                <Link
                  href="/membership-requirements"
                  className="w-full text-center px-4 py-3 rounded-lg border border-primary/30 text-primary font-semibold hover:bg-primary/5 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  Join Us
                </Link>
                <Link
                  href="/portal/login"
                  className="btn-primary w-full text-center"
                  onClick={() => setIsOpen(false)}
                >
                  Member Login
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  )
}

export default Navbar
