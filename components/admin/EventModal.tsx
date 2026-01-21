'use client'

import { useState, useEffect } from 'react'

type EventFormData = {
  title: string
  date: string
  time: string
  startDate: string
  startTime: string
  endTime: string
  timezone: string
  location: string
  description: string
  category: 'upcoming' | 'past'
  order: number
  status: 'published' | 'draft' | 'cancelled'
  attendees: number
  imageUrl: string
  visibility: 'public' | 'member' | 'board'
}

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (form: EventFormData) => Promise<void>
  editingEvent?: EventFormData & { id: string } | null
  saving?: boolean
}

export default function EventModal({ isOpen, onClose, onSave, editingEvent, saving = false }: EventModalProps) {
  const [form, setForm] = useState<EventFormData>({
    title: '',
    date: '',
    time: '',
    startDate: '',
    startTime: '',
    endTime: '',
    timezone: 'America/New_York',
    location: '',
    description: '',
    category: 'upcoming',
    order: 1,
    status: 'published',
    attendees: 0,
    imageUrl: '',
    visibility: 'member',
  })

  useEffect(() => {
    if (editingEvent) {
      setForm({
        title: editingEvent.title,
        date: editingEvent.date,
        time: editingEvent.time || '',
        startDate: editingEvent.startDate || '',
        startTime: editingEvent.startTime || '',
        endTime: editingEvent.endTime || '',
        timezone: editingEvent.timezone || 'America/New_York',
        location: editingEvent.location || '',
        description: editingEvent.description,
        category: editingEvent.category,
        order: editingEvent.order,
        status: editingEvent.status || 'published',
        attendees: editingEvent.attendees || 0,
        imageUrl: editingEvent.imageUrl || '',
        visibility: editingEvent.visibility || 'member',
      })
    } else {
      setForm({
        title: '',
        date: '',
        time: '',
        startDate: '',
        startTime: '',
        endTime: '',
        timezone: 'America/New_York',
        location: '',
        description: '',
        category: 'upcoming',
        order: 1,
        status: 'published',
        attendees: 0,
        imageUrl: '',
        visibility: 'member',
      })
    }
  }, [editingEvent, isOpen])

  const hasCalendarDate = Boolean(form.startDate)

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

  const handleSave = async () => {
    await onSave(form)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-rotaract-darkpink dark:text-white">
            {editingEvent ? 'Edit Event' : 'Create New Event'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title *
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rotaract-pink"
              placeholder="Event name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as 'upcoming' | 'past' }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'published' | 'draft' | 'cancelled' }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Visibility *
            </label>
            <select
              value={form.visibility}
              onChange={(e) => setForm((f) => ({ ...f, visibility: e.target.value as 'public' | 'member' | 'board' }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="public">Public - Visible to everyone</option>
              <option value="member">Member - Visible to logged-in members</option>
              <option value="board">Board - Visible to board members only</option>
            </select>
          </div>

          {!hasCalendarDate ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date (text) *
                </label>
                <input
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  placeholder="Every 2nd Thursday"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Time (text)
                  </label>
                  <input
                    value={form.time}
                    onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    placeholder="7:00 PM - 9:00 PM"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Location
                  </label>
                  <input
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    placeholder="Manhattan, NY"
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Location
              </label>
              <input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                placeholder="Manhattan, NY"
              />
            </div>
          )}

          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/50">
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
              📅 Calendar Integration (optional)
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start date
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start time
                </label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description *
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              placeholder="Event description..."
            />
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={handleSave}
              disabled={saving || !form.title || (!form.date && !form.startDate) || !form.description}
              className="flex-1 px-4 py-2.5 bg-rotaract-pink text-white rounded-lg hover:bg-rotaract-darkpink disabled:opacity-50 disabled:cursor-not-allowed font-bold transition-colors"
            >
              {saving ? 'Saving…' : editingEvent ? 'Save Changes' : 'Create Event'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
