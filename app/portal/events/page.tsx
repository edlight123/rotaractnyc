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

  return (
    <main className="max-w-[1200px] mx-auto px-6 lg:px-20 py-10 w-full">
      {/* Welcome & Stats Section */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-display font-extrabold text-[#161217] dark:text-white mb-2 tracking-tight">
            Welcome back, {userData?.name?.split(' ')[0] || 'Member'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            Ready for another month of impact?
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          {/* Quick Stats Cards */}
          <div className="flex min-w-[180px] flex-col gap-1 rounded-xl p-5 bg-white dark:bg-gray-800 shadow-sm border border-[#e3dde4] dark:border-gray-700">
            <div className="flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined text-xl">event_available</span>
              <p className="text-sm font-bold uppercase tracking-wider">RSVPs</p>
            </div>
            <div className="flex items-end gap-2 mt-1">
              <p className="text-3xl font-display font-black text-[#161217] dark:text-white">{stats.rsvpCount}</p>
              <p className="text-[#07884c] text-sm font-bold pb-1">confirmed</p>
            </div>
            <p className="text-xs text-gray-400 mt-1">For this month</p>
          </div>
          <div className="flex min-w-[180px] flex-col gap-1 rounded-xl p-5 bg-white dark:bg-gray-800 shadow-sm border border-[#e3dde4] dark:border-gray-700">
            <div className="flex items-center gap-2 text-secondary-accent">
              <span className="material-symbols-outlined text-xl">volunteer_activism</span>
              <p className="text-sm font-bold uppercase tracking-wider">Impact</p>
            </div>
            <div className="flex items-end gap-2 mt-1">
              <p className="text-3xl font-display font-black text-[#161217] dark:text-white">{stats.totalHours}</p>
              <p className="text-[#07884c] text-sm font-bold pb-1">hrs</p>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-secondary-accent h-full w-[65%]"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-[#e3dde4] dark:border-gray-700">
        <div className="flex bg-[#f3f1f4] dark:bg-gray-700 p-1 rounded-lg w-full sm:w-auto">
          <button 
            onClick={() => setActiveFilter('all')}
            className={`flex-1 sm:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all ${
              activeFilter === 'all' 
                ? 'bg-white dark:bg-gray-600 shadow-sm text-primary' 
                : 'text-gray-500 hover:text-primary'
            }`}
          >
            All Events
          </button>
          <button 
            onClick={() => setActiveFilter('member')}
            className={`flex-1 sm:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all ${
              activeFilter === 'member' 
                ? 'bg-white dark:bg-gray-600 shadow-sm text-primary' 
                : 'text-gray-500 hover:text-primary'
            }`}
          >
            Member-Only
          </button>
          <button 
            onClick={() => setActiveFilter('public')}
            className={`flex-1 sm:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all ${
              activeFilter === 'public' 
                ? 'bg-white dark:bg-gray-600 shadow-sm text-primary' 
                : 'text-gray-500 hover:text-primary'
            }`}
          >
            Public
          </button>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
            <input 
              className="pl-10 pr-4 py-2 bg-[#f3f1f4] dark:bg-gray-700 border-none rounded-full text-sm w-full sm:w-48 focus:ring-1 focus:ring-primary focus:w-64 transition-all duration-300" 
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredEvents.map((event) => {
            const userRsvp = rsvps.get(event.id);
            const isUpdating = updatingRsvp === event.id;
            const dateInfo = formatDateTime(event.startAt);
            const attendeeCount = attendeeCounts.get(event.id) || 0;
            const isRegistered = userRsvp?.status === 'going';

            return (
              <div 
                key={event.id}
                className="group event-card relative overflow-hidden rounded-2xl h-[450px] shadow-lg transition-all duration-500 hover:-translate-y-2 cursor-pointer"
              >
                {/* Event Image/Background */}
                <div 
                  className="event-image absolute inset-0 bg-cover bg-center transition-transform duration-700 bg-gradient-to-br from-primary to-blue-600"
                  style={{
                    backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.8) 100%), linear-gradient(135deg, #8f29a3 0%, #4f46e5 100%)`
                  }}
                />
                
                {/* Visibility Badge */}
                <div className="absolute top-4 left-4 z-10 flex gap-2">
                  <span className={`px-3 py-1 backdrop-blur-md text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-sm ${
                    event.visibility === 'member'
                      ? 'bg-secondary-accent/90 text-white'
                      : 'bg-white/90 text-[#161217]'
                  }`}>
                    {event.visibility === 'member' ? 'Member-Only' : 'Public'}
                  </span>
                </div>

                {/* Content Card */}
                <div className="absolute bottom-4 inset-x-4">
                  <div className="glass-panel backdrop-blur-md bg-white/70 dark:bg-gray-900/70 p-6 rounded-xl border border-white/30 dark:border-white/10">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-primary dark:text-primary font-black text-xs uppercase tracking-widest">
                        {dateInfo.dateTime}
                      </p>
                    </div>
                    <h3 className="text-xl font-display font-extrabold text-[#161217] dark:text-white leading-tight mb-4 line-clamp-2">
                      {event.title}
                    </h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[#4d424e] dark:text-gray-300 text-xs font-semibold">
                        <span className="material-symbols-outlined text-sm">location_on</span>
                        <span className="truncate max-w-[140px]">{event.location || 'TBD'}</span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isRegistered && !isUpdating) {
                            handleRsvp(event.id, 'going');
                          } else {
                            router.push(`/portal/events/${event.id}`);
                          }
                        }}
                        disabled={isUpdating}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
                          isRegistered 
                            ? 'bg-green-600 hover:bg-green-700 text-white' 
                            : 'bg-primary hover:bg-primary/90 text-white'
                        } disabled:opacity-50`}
                      >
                        {isUpdating ? '...' : isRegistered ? 'Registered' : 'Details'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">event_busy</span>
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm ? 'No events found matching your search.' : 'No upcoming events at this time.'}
          </p>
        </div>
      )}
    </main>
  );
}
