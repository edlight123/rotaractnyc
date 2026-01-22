'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FaCalendar, FaSignOutAlt, FaTable, FaTh, FaCalendarAlt, FaSearch, FaPlus, FaEdit, FaTrash, FaMapMarkerAlt, FaClock, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import { useAdminSession, adminSignOut } from '@/lib/admin/useAdminSession'
import { getFriendlyAdminApiError } from '@/lib/admin/apiError'
import { useCallback, useEffect, useMemo, useState } from 'react'
import EventModal from '@/components/admin/EventModal'

type EventRow = {
  id: string
  title: string
  date: string
  time?: string
  startDate?: string
  startTime?: string
  endTime?: string
  timezone?: string
  location?: string
  description: string
  category: 'upcoming' | 'past'
  order: number
  status?: 'published' | 'draft' | 'cancelled'
  attendees?: number
  imageUrl?: string
  visibility?: 'public' | 'member' | 'board'
}

type ViewMode = 'table' | 'grid' | 'calendar'

export default function AdminEventsPage() {
  const router = useRouter()
  const session = useAdminSession()

  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<EventRow[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [showEventModal, setShowEventModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [editingEvent, setEditingEvent] = useState<(EventRow & { id: string }) | null>(null)

  const formatDisplayDateFromStartDate = (isoDate: string) => {
    const parts = isoDate.split('-').map((p) => Number(p))
    if (parts.length !== 3) return ''
    const [year, month, day] = parts
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return ''
    const dt = new Date(Date.UTC(year, month - 1, day))
    if (Number.isNaN(dt.getTime())) return ''
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(dt)
  }

  const formatDisplayTimeFromCalendar = (startTime?: string, endTime?: string) => {
    const to12h = (t: string) => {
      const [hhRaw, mmRaw] = t.split(':')
      const hh = Number(hhRaw)
      const mm = Number(mmRaw)
      if (!Number.isFinite(hh) || !Number.isFinite(mm)) return ''
      const hour12 = ((hh + 11) % 12) + 1
      const ampm = hh >= 12 ? 'PM' : 'AM'
      const mmPadded = String(mm).padStart(2, '0')
      return `${hour12}:${mmPadded} ${ampm}`
    }

    if (!startTime) return ''
    const start = to12h(startTime)
    if (!start) return ''
    if (!endTime) return start
    const end = to12h(endTime)
    return end ? `${start} - ${end}` : start
  }

  const refresh = useCallback(async () => {
    setLoadingData(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/events', { cache: 'no-store' })
      if (!res.ok) {
        setError(await getFriendlyAdminApiError(res, 'Unable to load events.'))
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
            const status = obj.status === 'draft' ? 'draft' : obj.status === 'cancelled' ? 'cancelled' : 'published'
            const visibility = obj.visibility === 'public' ? 'public' : obj.visibility === 'board' ? 'board' : 'member'
            return {
              id: String(obj.id ?? ''),
              title: String(obj.title ?? ''),
              date: String(obj.date ?? ''),
              time: String(obj.time ?? ''),
              startDate: obj.startDate ? String(obj.startDate) : '',
              startTime: obj.startTime ? String(obj.startTime) : '',
              endTime: obj.endTime ? String(obj.endTime) : '',
              timezone: obj.timezone ? String(obj.timezone) : 'America/New_York',
              location: String(obj.location ?? ''),
              description: String(obj.description ?? ''),
              category,
              order: Number.isFinite(order) ? order : 1,
              status,
              attendees: Number(obj.attendees ?? 0),
              imageUrl: String(obj.imageUrl ?? ''),
              visibility,
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
    let filtered = [...events]
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(e => 
        e.title.toLowerCase().includes(query) ||
        e.description.toLowerCase().includes(query) ||
        e.location?.toLowerCase().includes(query)
      )
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(e => e.status === filterStatus)
    }
    
    // Apply category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(e => e.category === filterCategory)
    }
    
    return filtered.sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category)
      return a.order - b.order
    })
  }, [events, searchQuery, filterStatus, filterCategory])

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
    setEditingEvent({
      ...row,
      id: row.id,
      time: row.time || '',
      startDate: row.startDate || '',
      startTime: row.startTime || '',
      endTime: row.endTime || '',
      timezone: row.timezone || 'America/New_York',
      location: row.location || '',
      status: row.status || 'published',
      attendees: row.attendees || 0,
      imageUrl: row.imageUrl || '',
      visibility: row.visibility || 'member',
    })
    setShowEventModal(true)
  }

  const resetForm = () => {
    setEditingId(null)
    setEditingEvent(null)
    setShowEventModal(false)
  }

  const save = async (form: Omit<EventRow, 'id'>) => {
    setSaving(true)
    setError(null)
    try {
      const isEdit = Boolean(editingId)

      const generatedDate =
        !form.date && form.startDate ? formatDisplayDateFromStartDate(form.startDate) : ''
      const generatedTime =
        !form.time && form.startTime
          ? formatDisplayTimeFromCalendar(form.startTime, form.endTime)
          : ''

      const res = await fetch('/api/admin/events', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...(isEdit ? { id: editingId } : {}),
          ...form,
          date: form.date || generatedDate,
          time: form.time || generatedTime,
          order: Number(form.order) || 1,
        }),
      })

      if (!res.ok) {
        setError(await getFriendlyAdminApiError(res, 'Unable to save event.'))
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
        setError(await getFriendlyAdminApiError(res, 'Unable to delete event.'))
        return
      }
      await refresh()
    } catch {
      setError('Unable to delete event.')
    }
  }

  const getStatusBadge = (status?: string) => {
    const statusMap = {
      published: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-400', dot: 'bg-green-500', label: 'Published' },
      draft: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-800 dark:text-amber-400', dot: 'bg-amber-500', label: 'Draft' },
      cancelled: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-400', dot: 'bg-red-500', label: 'Cancelled' },
    }
    const s = statusMap[status as keyof typeof statusMap] || statusMap.published
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
        <span className={`size-1.5 rounded-full ${s.dot}`} />
        {s.label}
      </span>
    )
  }

  return (
    <>
      <main className="flex-1 w-full px-4 md:px-8 py-6 max-w-[1440px] mx-auto">
        {/* Page Heading */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
              Events Management
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Manage, track, and organize all club events from a single view.
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/events/new')}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-rotaract-pink hover:bg-rotaract-darkpink text-white px-5 py-2.5 text-sm font-bold shadow-sm hover:shadow-md transition-all"
          >
            <FaPlus className="text-lg" />
            Create New Event
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Main Content Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Toolbar / Controls */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
            {/* Search */}
            <div className="relative w-full md:w-96">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <FaSearch />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full rounded-lg border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-600 text-slate-900 dark:text-white focus:border-rotaract-pink focus:ring-rotaract-pink pl-10 sm:text-sm"
                placeholder="Search events by name, location..."
              />
            </div>

            {/* Filters & View Toggle */}
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 items-center flex-wrap">
              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="cancelled">Cancelled</option>
              </select>

              {/* Category Filter */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600"
              >
                <option value="all">All Categories</option>
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
              </select>

              {/* View Toggle */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'table'
                      ? 'bg-white dark:bg-slate-700 text-rotaract-pink shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                  title="Table View"
                >
                  <FaTable />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-slate-700 text-rotaract-pink shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                  title="Grid View"
                >
                  <FaTh />
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'calendar'
                      ? 'bg-white dark:bg-slate-700 text-rotaract-pink shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                  title="Calendar View"
                >
                  <FaCalendarAlt />
                </button>
              </div>
            </div>
          </div>

          {/* Content Area */}
          {loadingData ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rotaract-pink" />
            </div>
          ) : (
            <>
              {/* Table View */}
              {viewMode === 'table' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-6 py-3 font-semibold tracking-wider">Event Name</th>
                        <th className="px-6 py-3 font-semibold tracking-wider">Date & Time</th>
                        <th className="px-6 py-3 font-semibold tracking-wider">Location</th>
                        <th className="px-6 py-3 font-semibold tracking-wider">Status</th>
                        <th className="px-6 py-3 font-semibold tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {sorted.map((event) => (
                        <tr
                          key={event.id}
                          className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                            {event.title}
                            <div className="text-xs text-slate-500 font-normal mt-0.5">
                              {event.category}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-slate-900 dark:text-white font-medium">
                                {event.date}
                              </span>
                              {event.time && (
                                <span className="text-xs text-slate-500">{event.time}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {event.location && (
                              <div className="flex items-center gap-1.5">
                                <FaMapMarkerAlt className="text-slate-400" />
                                {event.location}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(event.status)}
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  startEdit(event)
                                  setShowEventModal(true)
                                }}
                                className="text-slate-400 hover:text-rotaract-pink p-1 rounded transition-colors"
                                title="Edit"
                              >
                                <FaEdit />
                              </button>
                              <button
                                onClick={() => remove(event.id)}
                                className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                                title="Delete"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {sorted.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                      No events found. Create your first event!
                    </div>
                  )}
                </div>
              )}

              {/* Grid View */}
              {viewMode === 'grid' && (
                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {sorted.map((event) => (
                      <article
                        key={event.id}
                        className="group flex flex-col rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-1"
                      >
                        <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-rotaract-pink to-rotaract-darkpink">
                          {event.imageUrl ? (
                            <div
                              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                              style={{ backgroundImage: `url(${event.imageUrl})` }}
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-white/20">
                              <FaCalendar className="text-6xl" />
                            </div>
                          )}
                          <div className="absolute top-3 left-3 flex gap-2">
                            {getStatusBadge(event.status)}
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 backdrop-blur-sm">
                              {event.category}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col flex-1 p-5">
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 line-clamp-2">
                            {event.title}
                          </h3>
                          <div className="flex flex-col gap-2.5 mb-4">
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
                              <FaClock className="text-rotaract-pink" />
                              <span className="line-clamp-1">{event.date} {event.time && `• ${event.time}`}</span>
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
                                <FaMapMarkerAlt className="text-rotaract-pink" />
                                <span className="truncate">{event.location}</span>
                              </div>
                            )}
                          </div>
                          <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                startEdit(event)
                                setShowEventModal(true)
                              }}
                              className="p-1.5 text-slate-500 hover:text-rotaract-pink hover:bg-rotaract-pink/10 rounded-md transition-colors"
                              title="Edit"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => remove(event.id)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                              title="Delete"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                  {sorted.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                      No events found. Create your first event!
                    </div>
                  )}
                </div>
              )}

              {/* Calendar View */}
              {viewMode === 'calendar' && (
                <div className="p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <FaChevronLeft />
                      </button>
                      <h2 className="text-xl font-bold dark:text-white">
                        {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </h2>
                      <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <FaChevronRight />
                      </button>
                    </div>
                    <button
                      onClick={() => setSelectedDate(new Date())}
                      className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      Today
                    </button>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div
                          key={day}
                          className="py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                        >
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7">
                      {Array.from({ length: 35 }, (_, i) => {
                        return (
                          <div
                            key={i}
                            className="min-h-[100px] border-b border-r border-slate-100 dark:border-slate-800/50 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                          >
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                              {i + 1}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="mt-6 text-center text-slate-500 text-sm">
                    📅 Calendar view with event integration coming soon!
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Event Modal */}
      <EventModal
        isOpen={showEventModal}
        onClose={resetForm}
        onSave={save}
        editingEvent={editingEvent as any}
        saving={saving}
      />
    </>
  )
}
