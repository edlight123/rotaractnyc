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
  Timestamp 
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getFirebaseClientApp } from '@/lib/firebase/client';
import { Event, RSVP, RSVPStatus } from '@/types/portal';
import { FiCalendar, FiMapPin, FiClock, FiUsers } from 'react-icons/fi';

export default function EventsPage() {
  const { user, loading } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [rsvps, setRsvps] = useState<Map<string, RSVP>>(new Map());
  const [loadingData, setLoadingData] = useState(true);
  const [updatingRsvp, setUpdatingRsvp] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      loadEvents();
    }
  }, [loading, user]);

  const loadEvents = async () => {
    const app = getFirebaseClientApp();
    if (!app || !user) return;

    const db = getFirestore(app);
    
    try {
      // Load upcoming events
      const eventsRef = collection(db, 'events');
      const eventsQuery = query(
        eventsRef,
        where('visibility', '==', 'member'),
        where('startAt', '>=', Timestamp.now()),
        orderBy('startAt', 'asc')
      );
      const snapshot = await getDocs(eventsQuery);
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Event[];
      
      setEvents(eventsData);

      // Load RSVPs for current user
      const rsvpMap = new Map<string, RSVP>();
      for (const event of eventsData) {
        const rsvpDoc = await getDoc(doc(db, 'events', event.id, 'rsvps', user.uid));
        if (rsvpDoc.exists()) {
          rsvpMap.set(event.id, {
            uid: user.uid,
            eventId: event.id,
            ...rsvpDoc.data()
          } as RSVP);
        }
      }
      setRsvps(rsvpMap);
      
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
      const rsvpRef = doc(db, 'events', eventId, 'rsvps', user.uid);
      const rsvpData: Omit<RSVP, 'uid' | 'eventId'> = {
        status,
        updatedAt: Timestamp.now()
      };
      
      await setDoc(rsvpRef, rsvpData);
      
      // Update local state
      setRsvps(prev => new Map(prev).set(eventId, {
        uid: user.uid,
        eventId,
        ...rsvpData
      }));
    } catch (error) {
      console.error('Error updating RSVP:', error);
      alert('Failed to update RSVP. Please try again.');
    } finally {
      setUpdatingRsvp(null);
    }
  };

  const formatDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Events</h1>
        <p className="text-gray-600">{events.length} upcoming events</p>
      </div>

      {events.length > 0 ? (
        <div className="space-y-4">
          {events.map((event) => {
            const userRsvp = rsvps.get(event.id);
            const isUpdating = updatingRsvp === event.id;

            return (
              <div
                key={event.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{event.title}</h2>
                    <p className="text-gray-700 mb-4">{event.description}</p>

                    <div className="space-y-2 text-gray-600">
                      <div className="flex items-center gap-2">
                        <FiCalendar className="text-blue-600" />
                        <span>{formatDate(event.startAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiClock className="text-green-600" />
                        <span>
                          {formatTime(event.startAt)} - {formatTime(event.endAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiMapPin className="text-red-600" />
                        <span>{event.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="lg:w-64">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <FiUsers className="text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">Your RSVP</span>
                      </div>

                      {userRsvp && (
                        <div className="mb-3 text-sm">
                          Current status:{' '}
                          <span className={`font-medium ${
                            userRsvp.status === 'going' ? 'text-green-600' :
                            userRsvp.status === 'maybe' ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {userRsvp.status === 'going' ? 'Going' :
                             userRsvp.status === 'maybe' ? 'Maybe' :
                             'Not Going'}
                          </span>
                        </div>
                      )}

                      <div className="space-y-2">
                        <button
                          onClick={() => handleRsvp(event.id, 'going')}
                          disabled={isUpdating}
                          className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                            userRsvp?.status === 'going'
                              ? 'bg-green-600 text-white'
                              : 'bg-white border-2 border-green-600 text-green-600 hover:bg-green-50'
                          } disabled:opacity-50`}
                        >
                          Going
                        </button>
                        <button
                          onClick={() => handleRsvp(event.id, 'maybe')}
                          disabled={isUpdating}
                          className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                            userRsvp?.status === 'maybe'
                              ? 'bg-yellow-500 text-white'
                              : 'bg-white border-2 border-yellow-500 text-yellow-600 hover:bg-yellow-50'
                          } disabled:opacity-50`}
                        >
                          Maybe
                        </button>
                        <button
                          onClick={() => handleRsvp(event.id, 'not')}
                          disabled={isUpdating}
                          className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                            userRsvp?.status === 'not'
                              ? 'bg-gray-600 text-white'
                              : 'bg-white border-2 border-gray-400 text-gray-600 hover:bg-gray-50'
                          } disabled:opacity-50`}
                        >
                          Can&apos;t Go
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <FiCalendar className="text-6xl text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No upcoming events</p>
        </div>
      )}
    </div>
  );
}
