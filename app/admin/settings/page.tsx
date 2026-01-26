'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FaArrowLeft, FaCog, FaSignOutAlt } from 'react-icons/fa'
import { useAdminSession, adminSignOut } from '@/lib/admin/useAdminSession'
import { getFriendlyAdminApiError } from '@/lib/admin/apiError'
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
  const [seeding, setSeeding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [form, setForm] = useState<SiteSettings>(EMPTY)
  const [activeTab, setActiveTab] = useState<'general' | 'social' | 'meetings' | 'portal'>('general')

  const refresh = useCallback(async () => {
    setLoadingData(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/settings', { cache: 'no-store' })
      if (!res.ok) {
        setError(await getFriendlyAdminApiError(res, 'Unable to load settings.'))
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
      <div className="py-16 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  if (session.status !== 'authenticated') return null

  const save = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
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
        setError(await getFriendlyAdminApiError(res, 'Unable to save settings.'))
        return
      }
      await refresh()
      setSuccess('Settings saved successfully!')
      setTimeout(() => setSuccess(null), 3000)
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
        setError(await getFriendlyAdminApiError(res, 'Seed failed.'))
        return
      }
      await refresh()
    } catch {
      setError('Seed failed.')
    }
  }

  const seedPortal = async () => {
    setSeeding(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/admin/seed-portal', { method: 'POST' })
      if (!res.ok) {
        setError(await getFriendlyAdminApiError(res, 'Portal seed failed.'))
        return
      }
      const result = await res.json()
      const counts = result.createdOrUpdated
      setSuccess(
        'Portal data seeded! ' +
        `${counts.users} users, ${counts.portalEvents} events, ` +
        `${counts.announcements} announcements, ${counts.documents} docs`
      )
      setTimeout(() => setSuccess(null), 5000)
    } catch {
      setError('Portal seed failed.')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="h-16 flex items-center justify-between px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Link href="/admin/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="font-medium text-slate-900 dark:text-white">Settings</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={async () => {
              await adminSignOut()
              router.push('/')
            }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <FaSignOutAlt className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Content Scroll Area */}
      <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6 md:p-10">
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
          {/* Page Header */}
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Settings</h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg">Manage your club&apos;s profile and configuration</p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
              <span className="material-symbols-outlined">error</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg flex items-center gap-2">
              <span className="material-symbols-outlined">check_circle</span>
              <span>{success}</span>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 dark:border-slate-800 px-6">
              <nav className="flex gap-1 -mb-px">
                <button
                  onClick={() => setActiveTab('general')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'general'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">settings</span>
                    General
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('social')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'social'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">share</span>
                    Social Media
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('meetings')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'meetings'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">event</span>
                    Meetings
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('portal')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'portal'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">database</span>
                    Portal Data
                  </span>
                </button>
              </nav>
            </div>

            {loadingData ? (
              <div className="p-8 flex items-center justify-center">
                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  <span>Loading settings...</span>
                </div>
              </div>
            ) : (
              <>
                {/* General Tab */}
                {activeTab === 'general' && (
                  <div className="p-8 space-y-8">
                    <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-12">
                      <div className="md:w-1/3">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Contact Information</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                          Primary contact details for your club
                        </p>
                      </div>
                      <div className="md:w-2/3 space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            Contact Email
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="material-symbols-outlined text-slate-400 text-[20px]">mail</span>
                            </div>
                            <input
                              type="email"
                              value={form.contactEmail}
                              onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                              className="block w-full pl-10 rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm py-2.5 px-3"
                              placeholder="contact@rotaractnyc.org"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            Address
                          </label>
                          <div className="space-y-2">
                            {form.addressLines.map((line, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={line}
                                  onChange={(e) =>
                                    setForm((f) => ({
                                      ...f,
                                      addressLines: f.addressLines.map((x, i) => (i === idx ? e.target.value : x)),
                                    }))
                                  }
                                  className="block w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm py-2.5 px-3"
                                  placeholder={`Address line ${idx + 1}`}
                                />
                                {form.addressLines.length > 1 && (
                                  <button
                                    onClick={() =>
                                      setForm((f) => ({
                                        ...f,
                                        addressLines: f.addressLines.filter((_, i) => i !== idx),
                                      }))
                                    }
                                    className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              onClick={() => setForm((f) => ({ ...f, addressLines: [...f.addressLines, ''] }))}
                              className="text-sm font-medium text-primary hover:text-primary-hover flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[18px]">add</span>
                              Add line
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Social Media Tab */}
                {activeTab === 'social' && (
                  <div className="p-8 space-y-8">
                    <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-12">
                      <div className="md:w-1/3">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Social Presence</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                          Connect your social media profiles to increase engagement
                        </p>
                      </div>
                      <div className="md:w-2/3 space-y-5">
                        {/* Facebook */}
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            Facebook URL
                          </label>
                          <div className="flex rounded-lg shadow-sm">
                            <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 text-sm">
                              <span className="material-symbols-outlined text-[18px]">facebook</span>
                            </span>
                            <input
                              type="text"
                              value={form.facebookUrl}
                              onChange={(e) => setForm((f) => ({ ...f, facebookUrl: e.target.value }))}
                              className="flex-1 block w-full min-w-0 rounded-none rounded-r-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary focus:ring-primary sm:text-sm py-2.5 px-3"
                              placeholder="https://facebook.com/rotaractnyc"
                            />
                          </div>
                        </div>

                        {/* Instagram */}
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            Instagram URL
                          </label>
                          <div className="flex rounded-lg shadow-sm">
                            <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 text-sm">
                              <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                            </span>
                            <input
                              type="text"
                              value={form.instagramUrl}
                              onChange={(e) => setForm((f) => ({ ...f, instagramUrl: e.target.value }))}
                              className="flex-1 block w-full min-w-0 rounded-none rounded-r-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary focus:ring-primary sm:text-sm py-2.5 px-3"
                              placeholder="https://instagram.com/rotaractnyc"
                            />
                          </div>
                        </div>

                        {/* LinkedIn */}
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            LinkedIn URL
                          </label>
                          <div className="flex rounded-lg shadow-sm">
                            <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 text-sm">
                              <span className="material-symbols-outlined text-[18px]">work</span>
                            </span>
                            <input
                              type="text"
                              value={form.linkedinUrl}
                              onChange={(e) => setForm((f) => ({ ...f, linkedinUrl: e.target.value }))}
                              className="flex-1 block w-full min-w-0 rounded-none rounded-r-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary focus:ring-primary sm:text-sm py-2.5 px-3"
                              placeholder="https://linkedin.com/company/rotaractnyc"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Meetings Tab */}
                {activeTab === 'meetings' && (
                  <div className="p-8 space-y-8">
                    <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-12">
                      <div className="md:w-1/3">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Meeting Information</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                          Configure your regular meeting schedule
                        </p>
                      </div>
                      <div className="md:w-2/3 space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            Meeting Label
                          </label>
                          <input
                            type="text"
                            value={form.meetingLabel}
                            onChange={(e) => setForm((f) => ({ ...f, meetingLabel: e.target.value }))}
                            className="block w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm py-2.5 px-3"
                            placeholder="e.g., General Meetings"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            Meeting Time
                          </label>
                          <input
                            type="text"
                            value={form.meetingTime}
                            onChange={(e) => setForm((f) => ({ ...f, meetingTime: e.target.value }))}
                            className="block w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm py-2.5 px-3"
                            placeholder="e.g., Every Tuesday at 7:00 PM"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Portal Data Tab */}
                {activeTab === 'portal' && (
                  <div className="p-8 space-y-8">
                    {/* Unified Database Notice */}
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[20px] mt-0.5">check_circle</span>
                        <div className="space-y-2 text-sm text-emerald-700 dark:text-emerald-400">
                          <p className="font-medium">Admin and Portal now share the same database!</p>
                          <ul className="list-disc list-inside space-y-1 text-emerald-600 dark:text-emerald-500">
                            <li>All member data is stored in a single <code className="px-1 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 rounded text-xs">users</code> collection</li>
                            <li>Events, posts, and all other data are also unified</li>
                            <li>Changes made in admin automatically appear in portal</li>
                            <li>No sync required - it's real-time!</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-12">
                      <div className="md:w-1/3">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Seed Test Data</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                          Generate sample data for testing the member portal
                        </p>
                      </div>
                      <div className="md:w-2/3 space-y-6">
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                          <p className="text-sm text-primary">
                            Creates sample users, events, announcements, documents, posts, and transactions in Firestore.
                            Safe to run multiple times.
                          </p>
                        </div>

                        <button
                          onClick={seedPortal}
                          disabled={seeding}
                          className="w-full px-6 py-3 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {seeding ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                              Seeding...
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                              Seed Portal Data
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Footer */}
                <div className="bg-slate-50 dark:bg-slate-800/50 px-8 py-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                  <button
                    onClick={seed}
                    className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-primary transition-colors"
                  >
                    Reset to defaults
                  </button>
                  <div className="flex items-center gap-3">
                    <Link
                      href="/admin/dashboard"
                      className="px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      Cancel
                    </Link>
                    <button
                      onClick={save}
                      disabled={saving || !form.contactEmail.trim()}
                      className="px-5 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px]">save</span>
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Helper Links */}
          <div className="flex justify-center gap-6 text-sm text-slate-400">
            <Link href="/admin/dashboard" className="hover:text-primary transition-colors">Back to Dashboard</Link>
            <span className="text-slate-300">•</span>
            <a href="#" className="hover:text-primary transition-colors">Documentation</a>
          </div>
        </div>
      </div>
    </div>
  )
}
