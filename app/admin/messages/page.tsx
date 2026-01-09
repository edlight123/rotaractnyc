'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FaArrowLeft, FaEnvelope, FaSignOutAlt } from 'react-icons/fa'
import { useAdminSession, adminSignOut } from '@/lib/admin/useAdminSession'
import { useEffect, useState } from 'react'

type MessageRow = {
  id: string
  name: string
  email: string
  subject: string
  message: string
}

export default function AdminMessagesPage() {
  const router = useRouter()
  const session = useAdminSession()

  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageRow[]>([])

  useEffect(() => {
    if (session.status === 'unauthenticated') router.push('/admin/login')
  }, [router, session.status])

  async function refresh() {
    setLoadingData(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/messages', { cache: 'no-store' })
      if (!res.ok) {
        setError('Unable to load messages.')
        return
      }
      const json: unknown = await res.json()
      const rows =
        typeof json === 'object' &&
        json &&
        Array.isArray((json as { messages?: unknown }).messages)
          ? ((json as { messages: unknown[] }).messages as unknown[])
          : []

      setMessages(
        rows
          .map((m): MessageRow => {
            const obj = typeof m === 'object' && m ? (m as Record<string, unknown>) : {}
            return {
              id: String(obj.id ?? ''),
              name: String(obj.name ?? ''),
              email: String(obj.email ?? ''),
              subject: String(obj.subject ?? ''),
              message: String(obj.message ?? ''),
            }
          })
          .filter((m) => m.id)
      )
    } catch {
      setError('Unable to load messages.')
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => {
    if (session.status === 'authenticated') refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status])

  const remove = async (id: string) => {
    if (!confirm('Delete this message?')) return
    setError(null)
    try {
      const res = await fetch(`/api/admin/messages?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        setError('Unable to delete message.')
        return
      }
      await refresh()
    } catch {
      setError('Unable to delete message.')
    }
  }

  if (session.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rotaract-pink" />
      </div>
    )
  }

  if (session.status !== 'authenticated') return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-rotaract-darkpink flex items-center gap-2">
                <FaEnvelope /> Messages
              </h1>
              <p className="text-gray-600 mt-1">View contact form messages</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-rotaract-pink/30 text-rotaract-darkpink rounded-lg transition-colors"
              >
                <FaArrowLeft /> Dashboard
              </Link>
              <button
                onClick={async () => {
                  await adminSignOut()
                  router.push('/')
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <FaSignOutAlt /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          {error ? (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          ) : null}

          {loadingData ? (
            <div className="text-gray-600">Loading…</div>
          ) : messages.length === 0 ? (
            <div className="text-gray-600">No messages yet.</div>
          ) : (
            <div className="space-y-4">
              {messages.map((m) => (
                <div key={m.id} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-rotaract-darkpink">{m.subject}</div>
                      <div className="text-sm text-gray-600">{m.name} · {m.email}</div>
                    </div>
                    <button
                      onClick={() => remove(m.id)}
                      className="px-3 py-2 text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                  <p className="mt-2 text-gray-700 whitespace-pre-wrap">{m.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
