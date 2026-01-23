'use client'

import { usePathname } from 'next/navigation'
import { useAdminSession } from '@/lib/admin/useAdminSession'
import { AuthProvider } from '@/lib/firebase/auth'
import { useEffect } from 'react'
import AdminNav from './_components/AdminNav'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const session = useAdminSession()
  const isLoginPage = pathname === '/admin/login'
  const isRootPage = pathname === '/admin'

  // Don't show layout on login or root page
  if (isLoginPage || isRootPage) {
    return children
  }

  return (
    <AuthProvider>
      <AdminShell>{children}</AdminShell>
    </AuthProvider>
  )
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const session = useAdminSession()

  useEffect(() => {
    if (session.status === 'unauthenticated') {
      window.location.href = '/admin/login'
    }
  }, [session.status])

  if (session.status === 'loading') {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark font-display flex items-center justify-center antialiased text-[#141414] dark:text-white">
        <p className="text-sm text-gray-600 dark:text-gray-300">Loading…</p>
      </div>
    )
  }

  if (session.status !== 'authenticated') {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark font-display flex items-center justify-center antialiased text-[#141414] dark:text-white px-6">
        <div className="w-full max-w-lg rounded-2xl border border-gray-200 dark:border-[#2a2a2a] bg-white/80 dark:bg-[#1e1e1e]/80 backdrop-blur p-6">
          <h1 className="text-xl font-bold">Sign in required</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Please sign in to access the admin panel.
          </p>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => (window.location.href = '/admin/login')}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold"
            >
              Go to login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display antialiased text-[#141414] dark:text-white">
      <AdminNav />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
