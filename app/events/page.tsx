'use client'

import Link from 'next/link'
import { DEFAULT_EVENTS, type EventCategory, type SiteEvent } from '@/lib/content/events'
import { getGoogleCalendarUrl } from '@/lib/calendar/eventCalendar'
import { useEffect, useMemo, useState } from 'react'

type EventsResponseRow = Record<string, unknown>

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function toYmdLocal(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function formatMonthShort(date: Date) {
  return date.toLocaleString('en-US', { month: 'short' }).toUpperCase()
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

function parseYmdLocal(ymd: string) {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

function includesText(haystack: string, needle: string) {
  if (!needle) return true
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

function normalizeEventText(event: SiteEvent) {
  return [event.title, event.location ?? '', event.description].join(' ').trim()
}

export default function EventsPage() {
  const [events, setEvents] = useState<SiteEvent[]>(DEFAULT_EVENTS)
  const [query, setQuery] = useState('')
  const [showUpcoming, setShowUpcoming] = useState(true)
  const [showPast, setShowPast] = useState(true)
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()))

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const res = await fetch('/api/public/events')
        if (!res.ok) return
        const json: unknown = await res.json()
        const rows =
          typeof json === 'object' &&
          json &&
          Array.isArray((json as { events?: unknown }).events)
            ? ((json as { events: unknown[] }).events as unknown[])
            : []

        if (!cancelled && rows.length > 0) {
          setEvents(
            rows
              .map((e): SiteEvent => {
                const obj: EventsResponseRow = typeof e === 'object' && e ? (e as EventsResponseRow) : {}
                const order = Number(obj.order)
                const category: EventCategory = obj.category === 'past' ? 'past' : 'upcoming'
                return {
                  id: String(obj.id ?? ''),
                  category,
                  title: String(obj.title ?? ''),
                  date: String(obj.date ?? ''),
                  time: obj.time ? String(obj.time) : '',
                  startDate: obj.startDate ? String(obj.startDate) : '',
                  startTime: obj.startTime ? String(obj.startTime) : '',
                  endTime: obj.endTime ? String(obj.endTime) : '',
                  timezone: obj.timezone ? String(obj.timezone) : 'America/New_York',
                  location: obj.location ? String(obj.location) : '',
                  description: String(obj.description ?? ''),
                  order: Number.isFinite(order) ? order : 1,
                }
              })
              .filter((e) => e.id)
          )
        }
      } catch {
        // ignore and keep defaults
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [])

  const counts = useMemo(() => {
    const upcoming = events.filter((e) => e.category === 'upcoming').length
    const past = events.filter((e) => e.category === 'past').length
    return { upcoming, past }
  }, [events])

  const filteredEvents = useMemo(() => {
    const visibleCategories = new Set<EventCategory>([
      ...(showUpcoming ? (['upcoming'] as const) : []),
      ...(showPast ? (['past'] as const) : []),
    ])

    return events
      .filter((e) => visibleCategories.has(e.category))
      .filter((e) => includesText(normalizeEventText(e), query))
      .sort((a, b) => {
        // Prefer category grouping (upcoming first), then explicit order.
        const catA = a.category === 'upcoming' ? 0 : 1
        const catB = b.category === 'upcoming' ? 0 : 1
        if (catA !== catB) return catA - catB
        return a.order - b.order
      })
  }, [events, query, showPast, showUpcoming])

  const eventsByYmd = useMemo(() => {
    const map = new Map<string, SiteEvent[]>()
    for (const e of events) {
      if (!e.startDate) continue
      const key = e.startDate
      const arr = map.get(key) ?? []
      arr.push(e)
      map.set(key, arr)
    }
    return map
  }, [events])

  const monthLabel = useMemo(() => {
    return calendarMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  }, [calendarMonth])

  const calendarCells = useMemo(() => {
    const first = startOfMonth(calendarMonth)
    const firstDow = first.getDay() // 0=Sun
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
    const prevMonthDays = new Date(first.getFullYear(), first.getMonth(), 0).getDate()

    const cells: Array<{ day: number; inMonth: boolean; ymd: string | null }> = []

    // Fill leading days from previous month
    for (let i = 0; i < firstDow; i++) {
      const day = prevMonthDays - (firstDow - 1 - i)
      cells.push({ day, inMonth: false, ymd: null })
    }

    // Month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dt = new Date(first.getFullYear(), first.getMonth(), day)
      cells.push({ day, inMonth: true, ymd: toYmdLocal(dt) })
    }

    // Trailing filler to complete weeks (up to 6 rows)
    const totalCells = Math.ceil(cells.length / 7) * 7
    const trailing = totalCells - cells.length
    for (let i = 0; i < trailing; i++) {
      cells.push({ day: i + 1, inMonth: false, ymd: null })
    }

    return cells
  }, [calendarMonth])

  return (
    <div className="min-h-screen bg-background-light text-text-main dark:bg-background-dark dark:text-slate-100">
      <main className="mx-auto w-full max-w-[1200px] px-4 pb-20 pt-24 md:px-8">
        {/* Page Heading */}
        <section className="pt-8 pb-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white md:text-5xl">
                Events &amp; Gatherings
              </h1>
              <p className="mt-3 text-lg leading-relaxed text-text-muted">
                Join us to serve the community, build professional networks, and make lifelong
                friendships in the heart of New York City.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg border border-transparent bg-surface-light px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:border-primary/30 dark:bg-surface-dark dark:text-slate-200"
              >
                <span className="material-symbols-outlined text-[20px]">filter_list</span>
                Filters
              </button>
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg border border-transparent bg-surface-light px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:border-primary/30 dark:bg-surface-dark dark:text-slate-200"
              >
                <span className="material-symbols-outlined text-[20px]">calendar_view_month</span>
                Month View
              </button>
            </div>
          </div>
        </section>

        {/* Main Content Layout */}
        <div className="flex w-full flex-col gap-8 lg:flex-row">
          {/* Sidebar */}
          <aside className="w-full flex-shrink-0 lg:w-80">
            <div className="space-y-6 lg:sticky lg:top-24">
              {/* Search */}
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <span className="material-symbols-outlined text-[20px]">search</span>
                </span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-surface-light py-3 pl-10 pr-4 text-sm shadow-sm outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-surface-dark"
                  placeholder="Search events..."
                  type="text"
                />
              </div>

              {/* Categories */}
              <div>
                <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Categories
                </h3>
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-center gap-3">
                    <div className="relative flex h-5 w-5 items-center justify-center">
                      <input
                        checked={showUpcoming}
                        onChange={(e) => setShowUpcoming(e.target.checked)}
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded border-2 border-slate-300 transition-colors checked:border-primary checked:bg-primary dark:border-slate-600"
                        type="checkbox"
                      />
                      <span className="material-symbols-outlined pointer-events-none absolute text-[14px] text-white opacity-0 peer-checked:opacity-100">
                        check
                      </span>
                    </div>
                    <span className="text-sm font-medium text-slate-700 transition-colors dark:text-slate-200">
                      Upcoming
                    </span>
                    <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                      {counts.upcoming}
                    </span>
                  </label>

                  <label className="flex cursor-pointer items-center gap-3">
                    <div className="relative flex h-5 w-5 items-center justify-center">
                      <input
                        checked={showPast}
                        onChange={(e) => setShowPast(e.target.checked)}
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded border-2 border-slate-300 transition-colors checked:border-primary checked:bg-primary dark:border-slate-600"
                        type="checkbox"
                      />
                      <span className="material-symbols-outlined pointer-events-none absolute text-[14px] text-white opacity-0 peer-checked:opacity-100">
                        check
                      </span>
                    </div>
                    <span className="text-sm font-medium text-slate-700 transition-colors dark:text-slate-200">
                      Past
                    </span>
                    <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                      {counts.past}
                    </span>
                  </label>
                </div>
              </div>

              {/* Calendar */}
              <div>
                <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Calendar
                </h3>
                <div className="overflow-visible rounded-2xl border border-slate-200 bg-surface-light shadow-soft dark:border-slate-700 dark:bg-surface-dark dark:shadow-none">
                  <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-700">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{monthLabel}</h4>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCalendarMonth((d) => addMonths(d, -1))}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                        aria-label="Previous month"
                      >
                        <span className="material-symbols-outlined">chevron_left</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalendarMonth((d) => addMonths(d, 1))}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                        aria-label="Next month"
                      >
                        <span className="material-symbols-outlined">chevron_right</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="mb-3 grid grid-cols-7">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                        <div
                          key={d}
                          className="py-1 text-center text-[11px] font-bold uppercase tracking-widest text-slate-400"
                        >
                          {d}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-x-2 gap-y-3">
                      {calendarCells.map((cell, idx) => {
                        const todayYmd = toYmdLocal(new Date())
                        const isToday = cell.ymd ? cell.ymd === todayYmd : false
                        const hasEvent = cell.ymd ? (eventsByYmd.get(cell.ymd)?.length ?? 0) > 0 : false

                        return (
                          <div
                            key={idx}
                            className={
                              'flex aspect-square flex-col items-center justify-start rounded-xl pt-2 text-sm transition-colors ' +
                              (cell.inMonth
                                ? 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700'
                                : 'text-slate-400 opacity-40')
                            }
                          >
                            <div
                              className={
                                'flex h-7 w-7 items-center justify-center rounded-full ' +
                                (isToday ? 'bg-primary text-white' : '')
                              }
                            >
                              {cell.day}
                            </div>
                            {cell.inMonth ? (
                              <div
                                className={
                                  'mt-2 h-1.5 w-1.5 rounded-full ' +
                                  (hasEvent ? 'bg-primary' : 'bg-transparent')
                                }
                              />
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Events Grid */}
          <section className="min-w-0 flex-1">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Public Events
                </h2>
                <p className="mt-1 text-sm text-text-muted">
                  Showing {filteredEvents.length} event{filteredEvents.length === 1 ? '' : 's'}
                </p>
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <span className="text-sm font-medium text-slate-500">Sort by:</span>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-surface-light px-3 py-2 text-sm font-bold text-slate-900 dark:border-slate-700 dark:bg-surface-dark dark:text-white">
                  Upcoming
                  <span className="material-symbols-outlined text-[18px]">expand_more</span>
                </div>
              </div>
            </div>

            <div className="columns-1 gap-6 space-y-6 md:columns-2 xl:columns-3">
              {filteredEvents.map((event) => {
                const dt = event.startDate ? parseYmdLocal(event.startDate) : null
                const badgeMonth = dt ? formatMonthShort(dt) : null
                const badgeDay = dt ? pad2(dt.getDate()) : null
                const googleUrl = event.startDate
                  ? getGoogleCalendarUrl({
                      id: event.id,
                      title: event.title,
                      description: event.description,
                      location: event.location,
                      startDate: event.startDate,
                      startTime: event.startTime,
                      endTime: event.endTime,
                      timezone: event.timezone,
                    })
                  : null

                return (
                  <article
                    key={event.id}
                    className="break-inside-avoid overflow-hidden rounded-2xl border border-slate-200 bg-surface-light shadow-soft transition-shadow hover:shadow-soft-hover dark:border-slate-700 dark:bg-surface-dark"
                  >
                    <div className="relative border-b border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/20">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span
                            className={
                              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold shadow-sm ' +
                              (event.category === 'upcoming'
                                ? 'bg-primary text-white'
                                : 'bg-slate-600 text-white')
                            }
                          >
                            {event.category === 'upcoming' ? 'UPCOMING' : 'PAST'}
                          </span>
                          <h3 className="mt-3 text-lg font-bold leading-tight text-slate-900 dark:text-white">
                            {event.title}
                          </h3>
                        </div>

                        <div className="min-w-[70px] rounded-xl border border-slate-200 bg-white/90 p-2 text-center shadow-sm dark:border-slate-700 dark:bg-surface-dark">
                          {badgeMonth && badgeDay ? (
                            <>
                              <span className="block text-xs font-bold uppercase tracking-wider text-primary">
                                {badgeMonth}
                              </span>
                              <span className="mt-0.5 block text-2xl font-black leading-none text-slate-900 dark:text-white">
                                {badgeDay}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Date
                              </span>
                              <span className="mt-1 block text-xs font-bold text-slate-900 dark:text-white">
                                {event.date}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 space-y-2 text-sm text-text-muted">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-primary">
                            calendar_month
                          </span>
                          <span>{event.date}</span>
                        </div>
                        {event.time ? (
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">schedule</span>
                            <span>{event.time}</span>
                          </div>
                        ) : null}
                        {event.location ? (
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px] text-primary">
                              location_on
                            </span>
                            <span>{event.location}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="p-5">
                      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                        {event.description}
                      </p>

                      {event.startDate ? (
                        <div className="mt-5 flex flex-wrap items-center gap-2">
                          {googleUrl ? (
                            <a
                              href={googleUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center rounded-lg bg-primary/10 px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/15"
                            >
                              Add to Google Calendar
                            </a>
                          ) : null}

                          <a
                            href={`/api/public/events/ics?id=${encodeURIComponent(event.id)}`}
                            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-surface-light px-4 py-2 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-surface-dark dark:text-slate-100 dark:hover:bg-slate-700"
                          >
                            Download .ics
                          </a>
                        </div>
                      ) : null}
                    </div>
                  </article>
                )
              })}
            </div>

            <div className="mt-12 flex justify-center">
              <Link
                href="/events/meetings"
                className="inline-flex items-center justify-center rounded-full border-2 border-primary bg-transparent px-8 py-3 font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
              >
                View Meeting Schedule
              </Link>
            </div>

            <div className="mt-10 flex justify-center">
              <a
                href="/newsletter-sign-up"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-surface-light px-8 py-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-surface-dark dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Stay Updated — Newsletter
              </a>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
