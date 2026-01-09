'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type State =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; email: string | null }

export function useAdminSession() {
  const router = useRouter()
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' })
        if (!res.ok) {
          if (!cancelled) setState({ status: 'unauthenticated' })
          return
        }
        const json = (await res.json()) as { authenticated: true; email: string | null }
        if (!cancelled) setState({ status: 'authenticated', email: json.email })
      } catch {
        if (!cancelled) setState({ status: 'unauthenticated' })
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (state.status === 'unauthenticated') {
      router.push('/admin/login')
    }
  }, [state.status, router])

  return state
}

export async function adminSignOut() {
  await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {})
}
