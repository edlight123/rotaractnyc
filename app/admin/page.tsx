'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAdminSession } from '@/lib/admin/useAdminSession'

export default function AdminPage() {
  const session = useAdminSession()
  const router = useRouter()

  useEffect(() => {
    if (session.status === 'unauthenticated') {
      router.push('/admin/login')
    } else if (session.status === 'authenticated') {
      router.push('/admin/dashboard')
    }
  }, [session.status, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rotaract-pink mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  )
}
