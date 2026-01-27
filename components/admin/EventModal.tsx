'use client'

import { useState, useEffect } from 'react'

type RecurrencePattern = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom'
type WeekDay = 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA'

type RecurrenceConfig = {
  pattern: RecurrencePattern
  interval: number // e.g., every 2 weeks
  endDate?: string // YYYY-MM-DD when recurrence ends
  occurrences?: number // OR number of occurrences
  weekDays?: WeekDay[] // For weekly: which days
  monthDay?: number // For monthly: which day of month (1-31)
  monthWeek?: number // For monthly: which week (1-4, -1 for last)
  monthWeekDay?: WeekDay // For monthly: which day of that week
}

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
  // Recurring event fields
  isRecurring: boolean
  recurrence: RecurrenceConfig
}

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (form: EventFormData) => Promise<void>
  editingEvent?: (EventFormData & { id: string }) | null
  saving?: boolean
}

const defaultRecurrence: RecurrenceConfig = {
  pattern: 'none',
  interval: 1,
  weekDays: [],
}

const WEEKDAYS: { value: WeekDay; label: string; short: string }[] = [
  { value: 'SU', label: 'Sunday', short: 'S' },
  { value: 'MO', label: 'Monday', short: 'M' },
  { value: 'TU', label: 'Tuesday', short: 'T' },
  { value: 'WE', label: 'Wednesday', short: 'W' },
  { value: 'TH', label: 'Thursday', short: 'T' },
  { value: 'FR', label: 'Friday', short: 'F' },
  { value: 'SA', label: 'Saturday', short: 'S' },
]

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
    isRecurring: false,
    recurrence: { ...defaultRecurrence },
  })
  
  const [recurrenceEndType, setRecurrenceEndType] = useState<'never' | 'date' | 'occurrences'>('never')

  useEffect(() => {
    if (editingEvent) {
      const recurrence = editingEvent.recurrence || { ...defaultRecurrence }
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
        isRecurring: editingEvent.isRecurring || false,
        recurrence,
      })
      // Set recurrence end type
      if (recurrence.endDate) {
        setRecurrenceEndType('date')
      } else if (recurrence.occurrences) {
        setRecurrenceEndType('occurrences')
      } else {
        setRecurrenceEndType('never')
      }
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
        isRecurring: false,
        recurrence: { ...defaultRecurrence },
      })
      setRecurrenceEndType('never')
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

  const getRecurrenceSummary = (recurrence: RecurrenceConfig, startDate?: string): string => {
    if (recurrence.pattern === 'none') return 'This event does not repeat.'

    const dayNames: Record<WeekDay, string> = {
      SU: 'Sunday',
      MO: 'Monday',
      TU: 'Tuesday',
      WE: 'Wednesday',
      TH: 'Thursday',
      FR: 'Friday',
      SA: 'Saturday',
    }

    let summary = ''

    switch (recurrence.pattern) {
      case 'daily':
        summary = 'Repeats daily'
        break
      case 'weekly':
        if (recurrence.weekDays && recurrence.weekDays.length > 0) {
          const days = recurrence.weekDays.map((d) => dayNames[d]).join(', ')
          summary = `Repeats weekly on ${days}`
        } else {
          summary = 'Repeats weekly'
        }
        break
      case 'biweekly':
        if (recurrence.weekDays && recurrence.weekDays.length > 0) {
          const days = recurrence.weekDays.map((d) => dayNames[d]).join(', ')
          summary = `Repeats every 2 weeks on ${days}`
        } else {
          summary = 'Repeats every 2 weeks'
        }
        break
      case 'monthly':
        if (recurrence.monthWeek && recurrence.monthWeekDay) {
          const weekNum =
            recurrence.monthWeek === -1
              ? 'last'
              : recurrence.monthWeek === 1
              ? 'first'
              : recurrence.monthWeek === 2
              ? 'second'
              : recurrence.monthWeek === 3
              ? 'third'
              : 'fourth'
          summary = `Repeats monthly on the ${weekNum} ${dayNames[recurrence.monthWeekDay]}`
        } else if (recurrence.monthDay) {
          summary = `Repeats monthly on day ${recurrence.monthDay}`
        } else {
          summary = 'Repeats monthly'
        }
        break
      case 'custom':
        if (recurrence.weekDays && recurrence.weekDays.length > 0) {
          const days = recurrence.weekDays.map((d) => dayNames[d]).join(', ')
          summary = `Repeats every ${recurrence.interval} week(s) on ${days}`
        } else {
          summary = `Repeats every ${recurrence.interval} week(s)`
        }
        break
    }

    // Add end info
    if (recurrence.endDate) {
      summary += ` until ${formatDisplayDateFromStartDate(recurrence.endDate)}`
    } else if (recurrence.occurrences) {
      summary += `, ${recurrence.occurrences} time(s)`
    }

    return summary
  }

  const handleSave = async () => {
    await onSave(form)
  }

  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content max-w-2xl w-full">
          <div className="modal-header">
            <h2 className="text-xl font-bold text-text-primary dark:text-text-primary-dark">
              {editingEvent ? 'Edit Event' : 'Create New Event'}
            </h2>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary dark:hover:text-text-primary-dark transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        
          <div className="modal-body space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
                Title *
              </label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="input"
                placeholder="Event name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as 'upcoming' | 'past' }))}
                  className="input"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="past">Past</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'published' | 'draft' | 'cancelled' }))}
                  className="input"
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
                Visibility *
              </label>
              <select
                value={form.visibility}
                onChange={(e) => setForm((f) => ({ ...f, visibility: e.target.value as 'public' | 'member' | 'board' }))}
                className="input"
              >
                <option value="public">Public - Visible to everyone</option>
                <option value="member">Member - Visible to logged-in members</option>
                <option value="board">Board - Visible to board members only</option>
              </select>
            </div>

            {!hasCalendarDate ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
                    Date (text) *
                  </label>
                  <input
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="input"
                    placeholder="Every 2nd Thursday"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
                      Time (text)
                    </label>
                    <input
                      value={form.time}
                      onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                      className="input"
                      placeholder="7:00 PM - 9:00 PM"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
                      Location
                    </label>
                    <input
                      value={form.location}
                      onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                      className="input"
                      placeholder="Manhattan, NY"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
                  Location
                </label>
                <input
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  className="input"
                  placeholder="Manhattan, NY"
                />
              </div>
            )}

            <div className="card p-4 bg-gray-50 dark:bg-zinc-900">
              <div className="text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-3">
                📅 Calendar Integration (optional)
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
                    Start date
                  </label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
                    Start time
                  </label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
                    End time
                  </label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
                    Timezone
                  </label>
                  <select
                    value={form.timezone}
                    onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                    className="input"
                  >
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Recurring Event Section */}
            <div className="card p-4 bg-gray-50 dark:bg-zinc-900">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
                  🔄 Recurring Event
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isRecurring}
                    onChange={(e) => {
                      const isRecurring = e.target.checked
                      setForm((f) => ({
                        ...f,
                        isRecurring,
                        recurrence: isRecurring ? { ...f.recurrence, pattern: 'weekly' } : { ...defaultRecurrence },
                      }))
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                </label>
              </div>

              {form.isRecurring && (
                <div className="space-y-4">
                  {/* Recurrence Pattern */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
                      Repeats
                    </label>
                    <select
                      value={form.recurrence.pattern}
                      onChange={(e) => {
                        const pattern = e.target.value as RecurrencePattern
                        setForm((f) => ({
                          ...f,
                          recurrence: {
                            ...f.recurrence,
                            pattern,
                            interval: 1,
                            weekDays: pattern === 'weekly' || pattern === 'biweekly' ? [] : undefined,
                          },
                        }))
                      }}
                      className="input"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Every 2 weeks</option>
                      <option value="monthly">Monthly</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  {/* Custom interval */}
                  {form.recurrence.pattern === 'custom' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
                          Every
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={form.recurrence.interval}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              recurrence: { ...f.recurrence, interval: Math.max(1, parseInt(e.target.value) || 1) },
                            }))
                          }
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
                          Period
                        </label>
                        <select
                          value={form.recurrence.interval > 1 ? 'weeks' : 'week'}
                          disabled
                          className="input bg-gray-100 dark:bg-zinc-800"
                        >
                          <option value="week">week(s)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Weekly day selection */}
                  {(form.recurrence.pattern === 'weekly' || form.recurrence.pattern === 'biweekly' || form.recurrence.pattern === 'custom') && (
                    <div>
                      <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-2">
                        On these days
                      </label>
                      <div className="flex gap-1">
                        {WEEKDAYS.map((day) => (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => {
                              const currentDays = form.recurrence.weekDays || []
                              const newDays = currentDays.includes(day.value)
                                ? currentDays.filter((d) => d !== day.value)
                                : [...currentDays, day.value]
                              setForm((f) => ({
                                ...f,
                                recurrence: { ...f.recurrence, weekDays: newDays },
                              }))
                            }}
                            className={`w-9 h-9 rounded-full text-xs font-semibold transition-colors ${
                              (form.recurrence.weekDays || []).includes(day.value)
                                ? 'bg-primary text-white'
                                : 'bg-gray-200 dark:bg-zinc-700 text-text-secondary dark:text-text-secondary-dark hover:bg-gray-300 dark:hover:bg-zinc-600'
                            }`}
                            title={day.label}
                          >
                            {day.short}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Monthly options */}
                  {form.recurrence.pattern === 'monthly' && (
                    <div>
                      <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
                        Day of month
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={form.recurrence.monthWeek ? 'week' : 'day'}
                          onChange={(e) => {
                            if (e.target.value === 'day') {
                              setForm((f) => ({
                                ...f,
                                recurrence: {
                                  ...f.recurrence,
                                  monthDay: 1,
                                  monthWeek: undefined,
                                  monthWeekDay: undefined,
                                },
                              }))
                            } else {
                              setForm((f) => ({
                                ...f,
                                recurrence: {
                                  ...f.recurrence,
                                  monthDay: undefined,
                                  monthWeek: 1,
                                  monthWeekDay: 'MO',
                                },
                              }))
                            }
                          }}
                          className="input w-auto"
                        >
                          <option value="day">Day of month</option>
                          <option value="week">Week of month</option>
                        </select>

                        {form.recurrence.monthWeek ? (
                          <>
                            <select
                              value={form.recurrence.monthWeek}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  recurrence: { ...f.recurrence, monthWeek: parseInt(e.target.value) },
                                }))
                              }
                              className="input w-auto"
                            >
                              <option value={1}>First</option>
                              <option value={2}>Second</option>
                              <option value={3}>Third</option>
                              <option value={4}>Fourth</option>
                              <option value={-1}>Last</option>
                            </select>
                            <select
                              value={form.recurrence.monthWeekDay}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  recurrence: { ...f.recurrence, monthWeekDay: e.target.value as WeekDay },
                                }))
                              }
                              className="input w-auto"
                            >
                              {WEEKDAYS.map((day) => (
                                <option key={day.value} value={day.value}>
                                  {day.label}
                                </option>
                              ))}
                            </select>
                          </>
                        ) : (
                          <input
                            type="number"
                            min={1}
                            max={31}
                            value={form.recurrence.monthDay || 1}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                recurrence: {
                                  ...f.recurrence,
                                  monthDay: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)),
                                },
                              }))
                            }
                            className="input w-20"
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* End recurrence */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-2">
                      Ends
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="recurrenceEnd"
                          checked={recurrenceEndType === 'never'}
                          onChange={() => {
                            setRecurrenceEndType('never')
                            setForm((f) => ({
                              ...f,
                              recurrence: { ...f.recurrence, endDate: undefined, occurrences: undefined },
                            }))
                          }}
                          className="w-4 h-4 text-primary"
                        />
                        <span className="text-sm text-text-secondary dark:text-text-secondary-dark">Never</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="recurrenceEnd"
                          checked={recurrenceEndType === 'date'}
                          onChange={() => {
                            setRecurrenceEndType('date')
                            setForm((f) => ({
                              ...f,
                              recurrence: { ...f.recurrence, occurrences: undefined },
                            }))
                          }}
                          className="w-4 h-4 text-primary"
                        />
                        <span className="text-sm text-text-secondary dark:text-text-secondary-dark">On date</span>
                        {recurrenceEndType === 'date' && (
                          <input
                            type="date"
                            value={form.recurrence.endDate || ''}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                recurrence: { ...f.recurrence, endDate: e.target.value },
                              }))
                            }
                            className="input w-auto ml-2"
                          />
                        )}
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="recurrenceEnd"
                          checked={recurrenceEndType === 'occurrences'}
                          onChange={() => {
                            setRecurrenceEndType('occurrences')
                            setForm((f) => ({
                              ...f,
                              recurrence: { ...f.recurrence, endDate: undefined, occurrences: 10 },
                            }))
                          }}
                          className="w-4 h-4 text-primary"
                        />
                        <span className="text-sm text-text-secondary dark:text-text-secondary-dark">After</span>
                        {recurrenceEndType === 'occurrences' && (
                          <>
                            <input
                              type="number"
                              min={1}
                              max={365}
                              value={form.recurrence.occurrences || 10}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  recurrence: {
                                    ...f.recurrence,
                                    occurrences: Math.max(1, parseInt(e.target.value) || 1),
                                  },
                                }))
                              }
                              className="input w-20 ml-2"
                            />
                            <span className="text-sm text-text-secondary dark:text-text-secondary-dark">occurrences</span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Recurrence summary */}
                  <div className="p-3 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-sm text-primary dark:text-primary font-medium">
                      <span className="material-symbols-outlined text-sm align-middle mr-1">info</span>
                      {getRecurrenceSummary(form.recurrence, form.startDate)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
                Description *
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={4}
                className="input"
                placeholder="Event description..."
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              onClick={onClose}
              className="btn-outline"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.title || (!form.date && !form.startDate) || !form.description}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : editingEvent ? 'Save Changes' : 'Create Event'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
