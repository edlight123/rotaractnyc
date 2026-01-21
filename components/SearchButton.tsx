'use client'

import { useState } from 'react'
import SearchModal from './SearchModal'

export default function SearchButton() {
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsSearchOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
        aria-label="Search site"
      >
        <span className="material-symbols-outlined text-lg">search</span>
        <span className="hidden sm:block text-sm">Search</span>
        <kbd className="hidden md:inline-block px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded border">⌘K</kbd>
      </button>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  )
}