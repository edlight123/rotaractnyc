'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FaArrowLeft, FaCog, FaSignOutAlt } from 'react-icons/fa'
import { useAdminSession, adminSignOut } from '@/lib/admin/useAdminSession'
import { useCallback, useEffect, useState } from 'react'

type SiteSettings = {
  contactEmail: string
  addressLines: string[]
  facebookUrl: string
  instagramUrl: string
  linkedinUrl: string
  meetingLabel: string
  meetingTime: string
}

const EMPTY: SiteSettings = {
  contactEmail: '',
  addressLines: [''],
  facebookUrl: '',
  instagramUrl: '',
  linkedinUrl: '',
  meetingLabel: '',
  meetingTime: '',
}

export default function AdminSettingsPage() {
  const router = useRouter()
  const session = useAdminSession()

  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<SiteSettings>(EMPTY)

  const refresh = useCallback(async () => {
    setLoadingData(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/settings', { cache: 'no-store' })
      if (!res.ok) {
        setError('Unable to load settings.')
        return
      }

      const json: unknown = await res.json()
      const settingsRaw =
        typeof json === 'object' && json
          ? (json as Record<string, unknown>).settings
          : null

      const obj = typeof settingsRaw === 'object' && settingsRaw ? (settingsRaw as Record<string, unknown>) : {}
      const addressLinesRaw = obj.addressLines
      const addressLines = Array.isArray(addressLinesRaw)
        ? addressLinesRaw.map((x) => String(x)).filter(Boolean)
        : []

      setForm({
        contactEmail: String(obj.contactEmail ?? ''),
        addressLines: addressLines.length ? addressLines : [''],
        facebookUrl: String(obj.facebookUrl ?? ''),
        instagramUrl: String(obj.instagramUrl ?? ''),
        linkedinUrl: String(obj.linkedinUrl ?? ''),
        meetingLabel: String(obj.meetingLabel ?? ''),
        meetingTime: String(obj.meetingTime ?? ''),
      })
    } catch {
      setError('Unable to load settings.')
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => {
    if (session.status === 'unauthenticated') router.push('/admin/login')
  }, [router, session.status])

  useEffect(() => {
    if (session.status === 'authenticated') refresh()
  }, [refresh, session.status])

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
      const cleaned: SiteSettings = {
        ...form,
        addressLines: form.addressLines.map((x) => x.trim()).filter(Boolean),
      }
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(cleaned),
      })
      if (!res.ok) {
        setError('Unable to save settings.')
        return
      }
      await refresh()
    } catch {
      setError('Unable to save settings.')
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
      await refresh()
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
                <FaCog /> Settings
              </h1>
              <p className="text-gray-600 mt-1">Edit site-wide settings</p>
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
            <h2 className="text-xl font-bold text-rotaract-darkpink">Site Settings</h2>
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

          {loadingData ? (
            <div className="text-gray-600">Loading…</div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Contact Email</label>
                <input
                  value={form.contactEmail}
                  onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Address Lines</label>
                <div className="mt-2 space-y-2">
                  {form.addressLines.map((line, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        value={line}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            addressLines: f.addressLines.map((x, i) => (i === idx ? e.target.value : x)),
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <button
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            addressLines: f.addressLines.filter((_, i) => i !== idx),
                          }))
                        }
                        disabled={form.addressLines.length <= 1}
                        className="px-3 py-2 text-sm bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setForm((f) => ({ ...f, addressLines: [...f.addressLines, ''] }))}
                    className="px-3 py-2 text-sm bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Add Line
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Facebook URL</label>
                  <input
                    value={form.facebookUrl}
                    onChange={(e) => setForm((f) => ({ ...f, facebookUrl: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">LinkedIn URL</label>
                  <input
                    value={form.linkedinUrl}
                    onChange={(e) => setForm((f) => ({ ...f, linkedinUrl: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Instagram URL</label>
                  <input
                    value={form.instagramUrl}
                    onChange={(e) => setForm((f) => ({ ...f, instagramUrl: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Meetings Label</label>
                  <input
                    value={form.meetingLabel}
                    onChange={(e) => setForm((f) => ({ ...f, meetingLabel: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Meetings Time</label>
                  <input
                    value={form.meetingTime}
                    onChange={(e) => setForm((f) => ({ ...f, meetingTime: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={save}
                  disabled={saving || !form.contactEmail.trim()}
                  className="px-4 py-2 bg-rotaract-pink text-white rounded-lg hover:bg-rotaract-darkpink disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Settings'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
