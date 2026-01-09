'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FaArrowLeft, FaCalendar, FaSignOutAlt } from 'react-icons/fa'
import { useAdminSession, adminSignOut } from '@/lib/admin/useAdminSession'
import { useCallback, useEffect, useMemo, useState } from 'react'

type EventRow = {
  id: string
  title: string
  date: string
  time?: string
  location?: string
  description: string
  category: 'upcoming' | 'past'
  order: number
}

export default function AdminEventsPage() {
  const router = useRouter()
  const session = useAdminSession()

  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<EventRow[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<EventRow, 'id'>>({
    title: '',
    date: '',
    time: '',
    location: '',
    description: '',
    category: 'upcoming',
    order: 1,
  })

  const refresh = useCallback(async () => {
    setLoadingData(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/events', { cache: 'no-store' })
      if (!res.ok) {
        setError('Unable to load events.')
        return
      }
      const json: unknown = await res.json()
      const rows =
        typeof json === 'object' &&
        json &&
        Array.isArray((json as { events?: unknown }).events)
          ? ((json as { events: unknown[] }).events as unknown[])
          : []

      setEvents(
        rows
          .map((e): EventRow => {
            const obj = typeof e === 'object' && e ? (e as Record<string, unknown>) : {}
            const category = obj.category === 'past' ? 'past' : 'upcoming'
            const order = Number(obj.order)
            return {
              id: String(obj.id ?? ''),
              title: String(obj.title ?? ''),
              date: String(obj.date ?? ''),
              time: String(obj.time ?? ''),
              location: String(obj.location ?? ''),
              description: String(obj.description ?? ''),
              category,
              order: Number.isFinite(order) ? order : 1,
            }
          })
          .filter((e) => e.id)
      )
    } catch {
      setError('Unable to load events.')
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

  const sorted = useMemo(() => {
    return [...events].sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category)
      return a.order - b.order
    })
  }, [events])

  if (session.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rotaract-pink" />
      </div>
    )
  }

  if (session.status !== 'authenticated') return null

  const startEdit = (row: EventRow) => {
    setEditingId(row.id)
    setForm({
      title: row.title,
      date: row.date,
      time: row.time || '',
      location: row.location || '',
      description: row.description,
      category: row.category,
      order: row.order,
    })
  }

  const resetForm = () => {
    setEditingId(null)
    setForm({
      title: '',
      date: '',
      time: '',
      location: '',
      description: '',
      category: 'upcoming',
      order: 1,
    })
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const isEdit = Boolean(editingId)
      const res = await fetch('/api/admin/events', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...(isEdit ? { id: editingId } : {}),
          ...form,
          order: Number(form.order) || 1,
        }),
      })

      if (!res.ok) {
        setError('Unable to save event.')
        return
      }

      resetForm()
      await refresh()
    } catch {
      setError('Unable to save event.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this event?')) return
    setError(null)
    try {
      const res = await fetch(`/api/admin/events?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        setError('Unable to delete event.')
        return
      }
      await refresh()
    } catch {
      setError('Unable to delete event.')
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
                <FaCalendar /> Events
              </h1>
              <p className="text-gray-600 mt-1">Create, edit, and publish events</p>
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
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div className="md:w-1/2">
              <div className="flex items-center justify-between gap-4 mb-4">
                <h2 className="text-xl font-bold text-rotaract-darkpink">
                  {editingId ? 'Edit Event' : 'Add Event'}
                </h2>
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

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => {
                        const value: EventRow['category'] =
                          e.target.value === 'past' ? 'past' : 'upcoming'
                        setForm((f) => ({ ...f, category: value }))
                      }}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="past">Past</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Order</label>
                    <input
                      type="number"
                      value={form.order}
                      onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Date (text)</label>
                  <input
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Every 2nd Thursday"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Time</label>
                    <input
                      value={form.time}
                      onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="7:00 PM - 9:00 PM"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <input
                      value={form.location}
                      onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Manhattan, NY"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={4}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={save}
                    disabled={saving || !form.title || !form.date || !form.description}
                    className="px-4 py-2 bg-rotaract-pink text-white rounded-lg hover:bg-rotaract-darkpink disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Event'}
                  </button>
                  {editingId ? (
                    <button
                      onClick={resetForm}
                      className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="md:w-1/2">
              <h2 className="text-xl font-bold text-rotaract-darkpink mb-4">All Events</h2>

              {loadingData ? (
                <div className="text-gray-600">Loading…</div>
              ) : sorted.length === 0 ? (
                <div className="text-gray-600">No events yet.</div>
              ) : (
                <div className="space-y-3">
                  {sorted.map((e) => (
                    <div
                      key={e.id}
                      className="border border-gray-100 rounded-lg p-4 bg-white shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm text-gray-500">{e.category} · order {e.order}</div>
                          <div className="text-lg font-semibold text-rotaract-darkpink">{e.title}</div>
                          <div className="text-sm text-gray-600">{e.date}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEdit(e)}
                            className="px-3 py-2 text-sm bg-white border border-rotaract-pink/30 text-rotaract-darkpink rounded-lg hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => remove(e.id)}
                            className="px-3 py-2 text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 text-gray-700 text-sm">{e.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
