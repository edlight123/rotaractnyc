// Global keyboard shortcuts
'use client'

import { useEffect } from 'react'

export default function GlobalKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Search shortcut (Cmd/Ctrl + K)
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        // Trigger search modal
        const searchButton = document.querySelector('[aria-label="Search site"]') as HTMLButtonElement
        if (searchButton) {
          searchButton.click()
        }
      }

      // Dark mode toggle (Cmd/Ctrl + D)
      if ((event.metaKey || event.ctrlKey) && event.key === 'd') {
        event.preventDefault()
        const darkModeButton = document.querySelector('[aria-label*="mode"]') as HTMLButtonElement
        if (darkModeButton) {
          darkModeButton.click()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return null
}