'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaArrowLeft, FaFileAlt, FaSignOutAlt } from 'react-icons/fa'
import { useAdminSession, adminSignOut } from '@/lib/admin/useAdminSession'

type CmsPageSlug = 'faq' | 'mission' | 'membership' | 'sisterclubs'

type CmsPageState = {
  slug: CmsPageSlug
  heroTitle: string
  heroSubtitle: string
  dataText: string
}

const SLUGS: { slug: CmsPageSlug; label: string }[] = [
  { slug: 'faq', label: 'FAQ' },
  { slug: 'mission', label: 'Mission/About' },
  { slug: 'membership', label: 'Membership' },
  { slug: 'sisterclubs', label: 'Sister Clubs' },
]

function safePrettyJson(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2)
  } catch {
    return '{}' 
  }
}

export default function AdminPagesPage() {
  const router = useRouter()
  const session = useAdminSession()

  const [selected, setSelected] = useState<CmsPageSlug>('faq')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<CmsPageState>({
    slug: 'faq',
    heroTitle: '',
    heroSubtitle: '',
    dataText: '{\n  "faqs": []\n}',
  })

  const load = useCallback(async (slug: CmsPageSlug) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/pages?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' })
      if (!res.ok) {
        setError('Unable to load page content.')
        return
      }
      const json: unknown = await res.json()
      const page =
        typeof json === 'object' &&
        json &&
        typeof (json as { page?: unknown }).page === 'object' &&
        (json as { page?: unknown }).page
          ? ((json as { page: unknown }).page as Record<string, unknown>)
          : null

      if (!page) {
        setError('Invalid response.')
        return
      }

      setState({
        slug,
        heroTitle: String(page.heroTitle ?? ''),
        heroSubtitle: String(page.heroSubtitle ?? ''),
        dataText: safePrettyJson(page.data),
      })
    } catch {
      setError('Unable to load page content.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session.status === 'unauthenticated') router.push('/admin/login')
  }, [router, session.status])

  useEffect(() => {
    if (session.status === 'authenticated') load(selected)
  }, [load, selected, session.status])

  const canSave = useMemo(() => state.heroTitle.trim().length > 0, [state.heroTitle])

  if (session.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rotaract-pink" />
      </div>
    )
  }

  if (session.status !== 'authenticated') return null

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      let parsed: unknown = {}
      try {
        parsed = JSON.parse(state.dataText || '{}')
      } catch {
        setError('Invalid JSON in Data field.')
        return
      }

      const res = await fetch('/api/admin/pages', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          slug: state.slug,
          heroTitle: state.heroTitle,
          heroSubtitle: state.heroSubtitle,
          data: parsed,
        }),
      })

      if (!res.ok) {
        setError('Unable to save page content.')
        return
      }

      await load(state.slug)
    } catch {
      setError('Unable to save page content.')
    } finally {
      setSaving(false)
    }
  }

  const seed = async () => {
    setError(null)
    try {
      const res = await fetch('/api/admin/seed', { method: 'POST' })
      if (!res.ok) {
        setError('Seed failed. Check Firebase Admin credentials.')
        return
      }
      await load(selected)
    } catch {
      setError('Seed failed. Check Firebase Admin credentials.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-rotaract-darkpink flex items-center gap-2">
                <FaFileAlt /> Pages
              </h1>
              <p className="text-gray-600 mt-1">Edit static page content (Firestore)</p>
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
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Page</label>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value as CmsPageSlug)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                {SLUGS.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={seed}
              className="px-3 py-2 text-sm bg-white border border-rotaract-pink/30 text-rotaract-darkpink rounded-lg hover:bg-gray-50"
            >
              Seed Defaults
            </button>
          </div>

          {error ? (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="text-gray-600">Loading…</div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Hero Title</label>
                <input
                  value={state.heroTitle}
                  onChange={(e) => setState((s) => ({ ...s, heroTitle: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Hero Subtitle</label>
                <input
                  value={state.heroSubtitle}
                  onChange={(e) => setState((s) => ({ ...s, heroSubtitle: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Data (JSON)</label>
                <textarea
                  value={state.dataText}
                  onChange={(e) => setState((s) => ({ ...s, dataText: e.target.value }))}
                  rows={16}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                />
                <p className="mt-2 text-sm text-gray-600">
                  For FAQ, set {`{"faqs": [{"question": "...", "answer": "..."}]}`}.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={save}
                  disabled={saving || !canSave}
                  className="px-4 py-2 bg-rotaract-pink text-white rounded-lg hover:bg-rotaract-darkpink disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
