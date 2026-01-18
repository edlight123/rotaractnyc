'use client';

import { useAuth } from '@/lib/firebase/auth';
import { useEffect, useState } from 'react';
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

type FilterType = 'all' | 'member' | 'public';

export default function EventsPage() {
  const { user, userData, loading } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [rsvps, setRsvps] = useState<Map<string, RSVP>>(new Map());
  const [attendeeCounts, setAttendeeCounts] = useState<Map<string, number>>(new Map());
  const [loadingData, setLoadingData] = useState(true);
  const [updatingRsvp, setUpdatingRsvp] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  useEffect(() => {
    if (!loading && user) {
      loadEvents();
    }
  }, [loading, user]);

  useEffect(() => {
    applyFilter();
  }, [events, activeFilter]);

  const applyFilter = () => {
    if (activeFilter === 'all') {
      setFilteredEvents(events);
    } else {
      setFilteredEvents(events.filter(e => e.visibility === activeFilter));
    }
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

  const formatDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    return {
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      day: date.getDate().toString(),
      full: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    };
  };

  const formatTime = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getEventStats = () => {
    const upcomingCount = filteredEvents.length;
    const rsvpCount = Array.from(rsvps.values()).filter(r => r.status === 'going').length;
    return { upcomingCount, rsvpCount };
  };

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center py-12 col-span-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#17b0cf]"></div>
      </div>
    );
  }

  const stats = getEventStats();

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col gap-8">
        {/* Greeting & Stats Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Welcome back, {userData?.name?.split(' ')[0] || 'Member'}!
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Here&apos;s what&apos;s happening with the club this week.
          </p>
        </div>
        {/* Mini Stats */}
        <div className="flex gap-4">
          <div className="bg-white rounded-lg px-4 py-2 shadow-sm border border-slate-100 flex flex-col items-center min-w-[100px]">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Upcoming
            </span>
            <span className="text-xl font-bold text-blue-600">{stats.upcomingCount}</span>
          </div>
          <div className="bg-white rounded-lg px-4 py-2 shadow-sm border border-slate-100 flex flex-col items-center min-w-[100px]">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              RSVP&apos;d
            </span>
            <span className="text-xl font-bold text-green-600">{stats.rsvpCount}</span>
          </div>
        </div>
      </div>

      {/* Events Filter */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <h2 className="text-lg font-bold text-slate-900">Upcoming Events</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md shadow-sm transition-colors ${
                activeFilter === 'all'
                  ? 'text-white bg-blue-600'
                  : 'text-slate-600 hover:bg-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveFilter('member')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeFilter === 'member'
                  ? 'text-white bg-blue-600'
                  : 'text-slate-600 hover:bg-white'
              }`}
            >
              Member Only
            </button>
            <button
              onClick={() => setActiveFilter('public')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeFilter === 'public'
                  ? 'text-white bg-blue-600'
                  : 'text-slate-600 hover:bg-white'
              }`}
            >
              Public
            </button>
          </div>
        </div>

        {/* Event Cards Grid */}
        {filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredEvents.map((event) => {
              const userRsvp = rsvps.get(event.id);
              const isUpdating = updatingRsvp === event.id;
              const dateInfo = formatDate(event.startAt);
              const attendeeCount = attendeeCounts.get(event.id) || 0;

              return (
                <article
                  key={event.id}
                  className="group bg-white rounded-xl overflow-hidden border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col h-full"
                >
                  {/* Event Image/Header */}
                  <div className="relative h-48 overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700">
                    <div className="absolute top-3 right-3 z-10">
                      <span className={`inline-flex items-center rounded-md backdrop-blur px-2.5 py-0.5 text-xs font-bold shadow-sm ${
                        event.visibility === 'member'
                          ? 'bg-white/90 text-blue-600'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      }`}>
                        {event.visibility === 'member' ? 'Member Only' : 'Public'}
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>

                  <div className="p-5 flex flex-col flex-grow">
                    {/* Date & Title */}
                    <div className="flex gap-4 mb-3">
                      <div className="flex flex-col items-center justify-center bg-gray-50 rounded-lg p-2 min-w-[60px] h-[60px] border border-slate-200">
                        <span className="text-xs font-bold text-slate-500 uppercase">
                          {dateInfo.month}
                        </span>
                        <span className="text-xl font-bold text-slate-900 leading-none">
                          {dateInfo.day}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                          {event.title}
                        </h3>
                        <div className="flex items-center gap-1 mt-1 text-sm text-slate-500">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{formatTime(event.startAt)}</span>
                          <span className="mx-1">•</span>
                          <span className="truncate">{event.location}</span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                      {event.description}
                    </p>

                    {/* Footer with Actions */}
                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-sm text-slate-500">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <span className="font-medium">{attendeeCount > 0 ? `+${attendeeCount}` : 'No attendees yet'}</span>
                      </div>

                      {/* RSVP Status / Action */}
                      {userRsvp?.status === 'going' ? (
                        <div className="flex items-center gap-1.5 text-green-600 font-bold text-sm bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                          <svg className="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                          <span>Going</span>
                        </div>
                      ) : userRsvp?.status === 'maybe' ? (
                        <div className="flex items-center gap-1.5 text-amber-600 font-bold text-sm bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">
                          <svg className="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24">
                            <path d="M12 2l-5.5 9h11z"/>
                            <circle cx="12" cy="17" r="1.5"/>
                          </svg>
                          <span>Interested</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleRsvp(event.id, 'going')}
                          disabled={isUpdating}
                          className="flex items-center justify-center rounded-lg h-9 px-5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold leading-normal transition-colors shadow-sm disabled:opacity-50"
                        >
                          {isUpdating ? 'Loading...' : 'RSVP'}
                        </button>
                      )}
                    </div>

                    {/* Additional RSVP Actions */}
                    {userRsvp && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                        <button
                          onClick={() => handleRsvp(event.id, 'going')}
                          disabled={isUpdating}
                          className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            userRsvp.status === 'going'
                              ? 'bg-green-600 text-white'
                              : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                          } disabled:opacity-50`}
                        >
                          Going
                        </button>
                        <button
                          onClick={() => handleRsvp(event.id, 'maybe')}
                          disabled={isUpdating}
                          className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            userRsvp.status === 'maybe'
                              ? 'bg-amber-500 text-white'
                              : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                          } disabled:opacity-50`}
                        >
                          Maybe
                        </button>
                        <button
                          onClick={() => handleRsvp(event.id, 'not')}
                          disabled={isUpdating}
                          className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            userRsvp.status === 'not'
                              ? 'bg-gray-600 text-white'
                              : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                          } disabled:opacity-50`}
                        >
                          Can&apos;t Go
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-500">No upcoming events</p>
          </div>
        )}
      </div>
    </main>
  );
}
