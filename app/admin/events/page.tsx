'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FaCalendar, FaSignOutAlt, FaTable, FaTh, FaCalendarAlt, FaSearch, FaPlus, FaEdit, FaTrash, FaMapMarkerAlt, FaClock, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import { useAdminSession, adminSignOut } from '@/lib/admin/useAdminSession'
import { getFriendlyAdminApiError } from '@/lib/admin/apiError'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  doc,
  getDoc,
  Timestamp
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getFirebaseClientApp } from '@/lib/firebase/client';

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
  startAt?: any
}

type FilterType = 'all' | 'member' | 'public' | 'board'

export default function AdminEventsPage() {
  const router = useRouter()
  const session = useAdminSession()

  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<EventRow[]>([])
  const [filteredEvents, setFilteredEvents] = useState<EventRow[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [attendeeCounts, setAttendeeCounts] = useState<Map<string, number>>(new Map())

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
      const app = getFirebaseClientApp();
      if (!app) {
        setError('Firebase not initialized')
        return;
      }

      const db = getFirestore(app);
      
      // Load upcoming events from Firestore
      const eventsRef = collection(db, 'portalEvents');
      
      // Query for member-visible events
      const memberQuery = query(
        eventsRef,
        where('visibility', '==', 'member'),
        where('startAt', '>=', Timestamp.now()),
        orderBy('startAt', 'asc')
      );
      
      // Query for public events
      const publicQuery = query(
        eventsRef,
        where('visibility', '==', 'public'),
        where('startAt', '>=', Timestamp.now()),
        orderBy('startAt', 'asc')
      );
      
      // Query for board events
      const boardQuery = query(
        eventsRef,
        where('visibility', '==', 'board'),
        where('startAt', '>=', Timestamp.now()),
        orderBy('startAt', 'asc')
      );
      
      const [memberSnapshot, publicSnapshot, boardSnapshot] = await Promise.all([
        getDocs(memberQuery),
        getDocs(publicQuery),
        getDocs(boardQuery)
      ]);
      
      const memberEvents = memberSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EventRow[];
      
      const publicEvents = publicSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EventRow[];
      
      const boardEvents = boardSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EventRow[];
      
      // Combine and sort by startAt
      const allEvents = [...memberEvents, ...publicEvents, ...boardEvents].sort((a, b) => {
        const aTime = a.startAt instanceof Timestamp ? a.startAt.toMillis() : 0;
        const bTime = b.startAt instanceof Timestamp ? b.startAt.toMillis() : 0;
        return aTime - bTime;
      });
      
      setEvents(allEvents);

      // Load attendee counts
      const countsMap = new Map<string, number>();
      
      for (const event of allEvents) {
        // Get total "going" count
        const rsvpsQuery = query(
          collection(db, 'portalEvents', event.id, 'rsvps'),
          where('status', '==', 'going')
        );
        const rsvpsSnapshot = await getDocs(rsvpsQuery);
        countsMap.set(event.id, rsvpsSnapshot.size);
      }
      
      setAttendeeCounts(countsMap);
    } catch (err) {
      console.error('Error loading events:', err);
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

  useEffect(() => {
    applyFilter();
  }, [events, activeFilter, searchQuery]);

  const applyFilter = () => {
    let filtered = events;
    
    // Apply visibility filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(e => e.visibility === activeFilter);
    }
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(e => 
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.location?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredEvents(filtered);
  };

  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return { month: '', day: 0, time: '', dateTime: '' };
    
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date();
    return {
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      day: date.getDate(),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      dateTime: `${date.toLocaleDateString('en-US', { month: 'short' })} ${date.getDate()} • ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    };
  };

  if (session.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rotaract-pink" />
      </div>
    )
  }

  if (session.status !== 'authenticated') return null

  const startEdit = (row: EventRow) => {
    router.push(`/admin/events/${row.id}`)
  }

  const resetForm = () => {
    setEditingId(null)
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
    <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Heading */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-[#161217] dark:text-white mb-1 tracking-tight">
            Events Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage, track, and organize all club events.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Quick Stats Cards */}
          <div className="flex min-w-[150px] flex-col gap-0.5 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50">
            <div className="flex items-center gap-1.5 text-primary">
              <FaCalendar className="text-base" />
              <p className="text-xs font-semibold uppercase tracking-wide">Total Events</p>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <p className="text-2xl font-display font-bold text-[#161217] dark:text-white">{events.length}</p>
              <p className="text-[#07884c] text-xs font-medium">active</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/50">
        <div className="flex bg-white dark:bg-gray-700/50 p-0.5 rounded-md w-full sm:w-auto">
          <button 
            onClick={() => setActiveFilter('all')}
            className={`flex-1 sm:flex-none px-5 py-1.5 rounded-md text-sm font-semibold transition-all ${
              activeFilter === 'all' 
                ? 'bg-white dark:bg-gray-600 shadow-sm text-primary' 
                : 'text-gray-500 hover:text-primary'
            }`}
          >
            All Events
          </button>
          <button 
            onClick={() => setActiveFilter('member')}
            className={`flex-1 sm:flex-none px-5 py-1.5 rounded-md text-sm font-semibold transition-all ${
              activeFilter === 'member' 
                ? 'bg-primary text-white shadow-sm' 
                : 'text-gray-600 dark:text-gray-400 hover:text-primary'
            }`}
          >
            Member-Only
          </button>
          <button 
            onClick={() => setActiveFilter('public')}
            className={`flex-1 sm:flex-none px-5 py-1.5 rounded-md text-sm font-semibold transition-all ${
              activeFilter === 'public' 
                ? 'bg-primary text-white shadow-sm' 
                : 'text-gray-600 dark:text-gray-400 hover:text-primary'
            }`}
          >
            Public
          </button>
          <button 
            onClick={() => setActiveFilter('board')}
            className={`flex-1 sm:flex-none px-5 py-1.5 rounded-md text-sm font-semibold transition-all ${
              activeFilter === 'board' 
                ? 'bg-primary text-white shadow-sm' 
                : 'text-gray-600 dark:text-gray-400 hover:text-primary'
            }`}
          >
            Board
          </button>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            href="/admin/events/new"
            className="px-4 py-1.5 bg-rotaract-pink hover:bg-rotaract-darkpink text-white rounded-lg font-semibold text-sm transition-colors flex items-center gap-2"
          >
            <FaPlus className="text-base" />
            Create Event
          </Link>
          <div className="relative flex-1 sm:flex-initial">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input 
              className="pl-9 pr-4 py-1.5 bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm w-full sm:w-48 focus:ring-2 focus:ring-primary/30 focus:border-primary focus:w-64 transition-all duration-300"
              placeholder="Search events..." 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 3-Column Visual Grid */}
      {loadingData ? (
        <div className="flex items-center justify-center py-12 col-span-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => {
            const dateInfo = formatDateTime(event.startAt);
            const attendeeCount = attendeeCounts.get(event.id) || 0;

            return (
              <div 
                key={event.id}
                className="group event-card relative overflow-hidden rounded-xl h-[360px] shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
              >
                {/* Event Image/Background */}
                <div 
                  className="event-image absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                  style={{
                    backgroundImage: event.imageUrl 
                      ? `linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.7) 100%), url(${event.imageUrl})`
                      : `linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.7) 100%), linear-gradient(135deg, #a855f7 0%, #6366f1 100%)`
                  }}
                />
                
                {/* Visibility & Status Badges */}
                <div className="absolute top-3 left-3 z-10 flex gap-2">
                  <span className={`px-2.5 py-0.5 backdrop-blur-sm text-[10px] font-semibold uppercase tracking-wider rounded-md transition-all group-hover:scale-105 ${
                    event.visibility === 'member'
                      ? 'bg-secondary-accent/80 text-white'
                      : event.visibility === 'board'
                      ? 'bg-purple-600/80 text-white'
                      : 'bg-white/80 text-gray-800'
                  }`}>
                    {event.visibility === 'member' ? 'Members' : event.visibility === 'board' ? 'Board' : 'Public'}
                  </span>
                  {event.status && event.status !== 'published' && (
                    <span className={`px-2.5 py-0.5 backdrop-blur-sm text-[10px] font-semibold uppercase tracking-wider rounded-md ${
                      event.status === 'draft' 
                        ? 'bg-amber-500/90 text-white' 
                        : 'bg-red-600/90 text-white'
                    }`}>
                      {event.status}
                    </span>
                  )}
                </div>

                {/* Attendee Count Badge */}
                {attendeeCount > 0 && (
                  <div className="absolute top-3 right-3 z-10">
                    <span className="px-2.5 py-1 backdrop-blur-sm text-xs font-semibold rounded-full bg-white/90 text-gray-800 flex items-center gap-1.5">
                      <FaCalendar className="text-sm" />
                      {attendeeCount} RSVPs
                    </span>
                  </div>
                )}

                {/* Content Card */}
                <div className="absolute bottom-3 inset-x-3 transition-all duration-300 group-hover:bottom-4">
                  <div className="glass-panel backdrop-blur-lg bg-white/85 dark:bg-gray-900/85 p-5 rounded-lg border border-white/50 dark:border-white/20 shadow-lg transition-all group-hover:bg-white/95 dark:group-hover:bg-gray-900/95">
                    <div className="flex justify-between items-start mb-1.5">
                      <p className="text-primary dark:text-primary font-bold text-[11px] uppercase tracking-wide">
                        {dateInfo.dateTime}
                      </p>
                    </div>
                    <h3 className="text-lg font-display font-bold text-[#161217] dark:text-white leading-tight mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                      {event.title}
                    </h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[#4d424e] dark:text-gray-300 text-xs font-medium">
                        <FaMapMarkerAlt className="text-sm" />
                        <span className="truncate max-w-[140px]">{event.location || 'TBD'}</span>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/events/${event.id}`);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold rounded-md transition-all transform hover:scale-105 bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md"
                        >
                          View
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(event);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold rounded-md transition-all transform hover:scale-105 bg-gray-600 hover:bg-gray-700 text-white hover:shadow-md"
                        >
                          <FaEdit />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            remove(event.id);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold rounded-md transition-all transform hover:scale-105 bg-red-600 hover:bg-red-700 text-white hover:shadow-md"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/50 p-12 text-center">
          <FaCalendar className="text-5xl text-gray-300 dark:text-gray-600 mb-3 mx-auto" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {searchQuery ? 'No events found matching your search.' : 'No upcoming events at this time.'}
          </p>
        </div>
      )}
    </main>
  )
}
