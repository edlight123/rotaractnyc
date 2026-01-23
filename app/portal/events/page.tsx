'use client';

import { useAuth } from '@/lib/firebase/auth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  doc,
  setDoc,
  getDoc,
  Timestamp,
  collectionGroup 
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getFirebaseClientApp } from '@/lib/firebase/client';
import { Event, RSVP, RSVPStatus, Visibility } from '@/types/portal';
import Link from 'next/link';

type FilterType = 'all' | 'member' | 'public';

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

export default function EventsPage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [rsvps, setRsvps] = useState<Map<string, RSVP>>(new Map());
  const [attendeeCounts, setAttendeeCounts] = useState<Map<string, number>>(new Map());
  const [loadingData, setLoadingData] = useState(true);
  const [updatingRsvp, setUpdatingRsvp] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!loading && user) {
      loadEvents();
    }
  }, [loading, user]);

  useEffect(() => {
    applyFilter();
  }, [events, activeFilter, searchTerm]);

  const applyFilter = () => {
    let filtered = events;
    
    // Apply visibility filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(e => e.visibility === activeFilter);
    }
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(e => 
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredEvents(filtered);
  };

  const loadEvents = async () => {
    const app = getFirebaseClientApp();
    if (!app || !user) return;

    const db = getFirestore(app);
    
    try {
      console.log('[Events] Starting to load events...');
      
      // Load upcoming events - query for both member and public visibility
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
      
      console.log('[Events] Executing queries...');
      const [memberSnapshot, publicSnapshot] = await Promise.all([
        getDocs(memberQuery),
        getDocs(publicQuery)
      ]);
      
      console.log('[Events] Member events count:', memberSnapshot.size);
      console.log('[Events] Public events count:', publicSnapshot.size);
      
      const memberEvents = memberSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Event[];
      
      const publicEvents = publicSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Event[];
      
      // Combine and sort by startAt
      const allEvents = [...memberEvents, ...publicEvents].sort((a, b) => {
        const aTime = a.startAt instanceof Timestamp ? a.startAt.toMillis() : 0;
        const bTime = b.startAt instanceof Timestamp ? b.startAt.toMillis() : 0;
        return aTime - bTime;
      });
      
      console.log('[Events] Total events loaded:', allEvents.length);
      console.log('[Events] Events:', allEvents.map(e => ({ id: e.id, title: e.title, startAt: e.startAt })));
      
      setEvents(allEvents);

      // Load RSVPs for current user
      const rsvpMap = new Map<string, RSVP>();
      const countsMap = new Map<string, number>();
      
      for (const event of allEvents) {
        // Get user's RSVP
        const rsvpDoc = await getDoc(doc(db, 'portalEvents', event.id, 'rsvps', user.uid));
        if (rsvpDoc.exists()) {
          rsvpMap.set(event.id, {
            uid: user.uid,
            eventId: event.id,
            ...rsvpDoc.data()
          } as RSVP);
        }

        // Get total "going" count
        const rsvpsQuery = query(
          collection(db, 'portalEvents', event.id, 'rsvps'),
          where('status', '==', 'going')
        );
        const rsvpsSnapshot = await getDocs(rsvpsQuery);
        countsMap.set(event.id, rsvpsSnapshot.size);
      }
      
      setRsvps(rsvpMap);
      setAttendeeCounts(countsMap);
      
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoadingData(false);
    }
  };

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

  const handleRsvp = async (eventId: string, status: RSVPStatus) => {
    const app = getFirebaseClientApp();
    if (!app || !user) return;

    setUpdatingRsvp(eventId);
    const db = getFirestore(app);
    
    try {
      const rsvpRef = doc(db, 'portalEvents', eventId, 'rsvps', user.uid);
      const rsvpData: Omit<RSVP, 'uid' | 'eventId'> = {
        status,
        updatedAt: Timestamp.now()
      };
      
      await setDoc(rsvpRef, rsvpData);
      
      // Update local state
      const newRsvp: RSVP = {
        uid: user.uid,
        eventId,
        ...rsvpData
      };
      setRsvps(prev => new Map(prev).set(eventId, newRsvp));

      // Update attendee count
      if (status === 'going') {
        setAttendeeCounts(prev => new Map(prev).set(eventId, (prev.get(eventId) || 0) + 1));
      } else {
        const prevRsvp = rsvps.get(eventId);
        if (prevRsvp?.status === 'going') {
          setAttendeeCounts(prev => new Map(prev).set(eventId, Math.max(0, (prev.get(eventId) || 0) - 1)));
        }
      }
    } catch (error) {
      console.error('Error updating RSVP:', error);
      alert('Failed to update RSVP. Please try again.');
    } finally {
      setUpdatingRsvp(null);
    }
  };

  const formatDateTime = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    return {
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      day: date.getDate(),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      dateTime: `${date.toLocaleDateString('en-US', { month: 'short' })} ${date.getDate()} • ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    };
  };

  const getEventStats = () => {
    const rsvpCount = Array.from(rsvps.values()).filter(r => r.status === 'going').length;
    const totalHours = 12.5; // This would come from service hours tracking
    return { rsvpCount, totalHours };
  };

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center py-12 col-span-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const stats = getEventStats();
  const isAdmin = userData?.role === 'ADMIN';

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome & Stats Section */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-[#161217] dark:text-white mb-1 tracking-tight">
            Welcome back, {userData?.name?.split(' ')[0] || 'Member'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ready for another month of impact?
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Quick Stats Cards */}
          <div className="flex min-w-[150px] flex-col gap-0.5 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50">
            <div className="flex items-center gap-1.5 text-primary">
              <span className="material-symbols-outlined text-base">event_available</span>
              <p className="text-xs font-semibold uppercase tracking-wide">RSVPs</p>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <p className="text-2xl font-display font-bold text-[#161217] dark:text-white">{stats.rsvpCount}</p>
              <p className="text-[#07884c] text-xs font-medium">confirmed</p>
            </div>
          </div>
          <div className="flex min-w-[150px] flex-col gap-0.5 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50">
            <div className="flex items-center gap-1.5 text-secondary-accent">
              <span className="material-symbols-outlined text-base">volunteer_activism</span>
              <p className="text-xs font-semibold uppercase tracking-wide">Impact</p>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <p className="text-2xl font-display font-bold text-[#161217] dark:text-white">{stats.totalHours}</p>
              <p className="text-[#07884c] text-xs font-medium">hrs</p>
            </div>
          </div>
        </div>
      </div>

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
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
            <input 
              className="pl-9 pr-4 py-1.5 bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm w-full sm:w-48 focus:ring-2 focus:ring-primary/30 focus:border-primary focus:w-64 transition-all duration-300"
              placeholder="Search events..." 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 3-Column Visual Grid */}
      {filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => {
            const userRsvp = rsvps.get(event.id);
            const isUpdating = updatingRsvp === event.id;
            const dateInfo = formatDateTime(event.startAt);
            const attendeeCount = attendeeCounts.get(event.id) || 0;
            const isRegistered = userRsvp?.status === 'going';

            return (
              <div 
                key={event.id}
                onClick={() => router.push(`/portal/events/${event.id}`)}
                className="group event-card relative overflow-hidden rounded-xl h-[360px] shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer"
              >
                {/* Event Image/Background */}
                <div 
                  className="event-image absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110 bg-gradient-to-br from-primary to-blue-500"
                  style={{
                    backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.7) 100%), linear-gradient(135deg, #a855f7 0%, #6366f1 100%)`
                  }}
                />
                
                {/* Visibility Badge */}
                <div className="absolute top-3 left-3 z-10 flex gap-2">
                  <span className={`px-2.5 py-0.5 backdrop-blur-sm text-[10px] font-semibold uppercase tracking-wider rounded-md transition-all group-hover:scale-105 ${
                    event.visibility === 'member'
                      ? 'bg-secondary-accent/80 text-white'
                      : 'bg-white/80 text-gray-800'
                  }`}>
                    {event.visibility === 'member' ? 'Members' : 'Public'}
                  </span>
                  {isRegistered && (
                    <span className="px-2.5 py-0.5 backdrop-blur-sm text-[10px] font-semibold uppercase tracking-wider rounded-md bg-green-600/90 text-white transition-all group-hover:scale-105">
                      ✓ Registered
                    </span>
                  )}
                </div>

                {/* Attendee Count Badge */}
                {attendeeCount > 0 && (
                  <div className="absolute top-3 right-3 z-10">
                    <span className="px-2.5 py-1 backdrop-blur-sm text-xs font-semibold rounded-full bg-white/90 text-gray-800 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">group</span>
                      {attendeeCount}
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
                        <span className="material-symbols-outlined text-sm">location_on</span>
                        <span className="truncate max-w-[140px]">{event.location || 'TBD'}</span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isRegistered && !isUpdating) {
                            handleRsvp(event.id, 'going');
                          }
                        }}
                        disabled={isUpdating || isRegistered}
                        className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all transform hover:scale-105 ${
                          isRegistered 
                            ? 'bg-green-600 text-white cursor-default' 
                            : 'bg-primary hover:bg-primary/90 text-white hover:shadow-md'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isUpdating ? '...' : isRegistered ? 'Going ✓' : 'RSVP Now'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/50 p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600 mb-3">event_busy</span>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {searchTerm ? 'No events found matching your search.' : 'No upcoming events at this time.'}
          </p>
        </div>
      )}
    </main>
  );
}
