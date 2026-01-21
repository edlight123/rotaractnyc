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
        { name: 'Sister-Clubs', href: '/sisterclubs' },
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
    {
      name: 'Contact',
      href: '/contact-us',
      submenu: [
        { name: 'Follow Us', href: '/follow-us' },
        { name: 'Newsletter Sign Up', href: '/newsletter-sign-up' },
        { name: 'Contact Us', href: '/contact-us' },
      ],
    },
  ]

  return (
    <nav className="fixed inset-x-0 top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-[var(--nav-height)]">
          {/* Logo */}
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

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center space-x-8">
            {menuItems.map((item) => (
              <div key={item.name} className="relative group">
                <Link
                  href={item.href}
                  className={
                    'font-medium transition-colors py-2 ' +
                    (isMenuItemActive(item)
                      ? 'text-rotaract-pink'
                      : 'text-gray-800 hover:text-rotaract-pink')
                  }
                >
                  {item.name}
                </Link>
                {item.submenu && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-100 shadow-xl rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 overflow-hidden">
                    {item.submenu.map((subitem) => {
                      const subIsActive = isActiveHref(subitem.href)

                      return (
                      <Link
                        key={subitem.name}
                        href={subitem.href}
                        className={
                          'block px-4 py-3 transition-colors ' +
                          (subIsActive
                            ? 'bg-rotaract-pink/10 text-rotaract-darkpink'
                            : 'text-gray-700 hover:bg-rotaract-pink/10 hover:text-rotaract-darkpink')
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
              href="/portal/login"
              className="px-6 py-2 bg-rotaract-pink hover:bg-rotaract-darkpink text-white font-semibold rounded-lg transition-colors shadow-sm"
            >
              Member Login
            </Link>
          </div>

          {/* Mobile Menu Button & Dark Mode */}
          <div className="lg:hidden flex items-center gap-2">
            <DarkModeToggle />
            <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden text-rotaract-darkpink text-2xl p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
          >
            <span className="material-symbols-outlined text-3xl">
              {isOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>

        {/* Mobile Menu */}
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
                        ? 'text-rotaract-pink'
                        : 'text-gray-800 hover:text-rotaract-pink')
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
                              ? 'text-rotaract-pink'
                              : 'text-gray-600 hover:text-rotaract-pink')
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
              <Link
                href="/portal/login"
                className="block mt-4 px-6 py-2 bg-rotaract-pink text-white font-semibold rounded-lg text-center"
                onClick={() => setIsOpen(false)}
              >
                Member Login
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  )
}

export default Navbar
