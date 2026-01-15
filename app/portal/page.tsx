'use client';

import { useAuth } from '@/lib/firebase/auth';
import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getFirebaseClientApp } from '@/lib/firebase/client';
import Link from 'next/link';
import { FiCalendar, FiBell, FiUsers, FiFileText } from 'react-icons/fi';
import { Event, Announcement } from '@/types/portal';

export default function PortalDashboard() {
  const { userData, loading } = useAuth();
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && userData) {
      loadDashboardData();
    }
  }, [loading, userData]);

  const loadDashboardData = async () => {
    const app = getFirebaseClientApp();
    if (!app) return;

    const db = getFirestore(app);
    
    try {
      // Load upcoming events
      const eventsRef = collection(db, 'events');
      const eventsQuery = query(
        eventsRef,
        where('visibility', '==', 'member'),
        where('startAt', '>=', Timestamp.now()),
        orderBy('startAt', 'asc'),
        limit(5)
      );
      const eventsSnapshot = await getDocs(eventsQuery);
      const events = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Event[];
      setUpcomingEvents(events);

      // Load recent announcements
      const announcementsRef = collection(db, 'announcements');
      const announcementsQuery = query(
        announcementsRef,
        where('visibility', '==', 'member'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const announcementsSnapshot = await getDocs(announcementsQuery);
      const announcements = announcementsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Announcement[];
      setRecentAnnouncements(announcements);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {userData?.name}!
        </h1>
        <p className="text-gray-600">
          {userData?.committee && `${userData.committee} Committee`}
          {userData?.role && ` • ${userData.role}`}
        </p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/portal/directory"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <FiUsers className="text-3xl text-blue-600 mb-3" />
          <h3 className="font-semibold text-gray-900">Member Directory</h3>
          <p className="text-sm text-gray-600 mt-1">Browse and connect with members</p>
        </Link>

        <Link
          href="/portal/events"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <FiCalendar className="text-3xl text-green-600 mb-3" />
          <h3 className="font-semibold text-gray-900">Events</h3>
          <p className="text-sm text-gray-600 mt-1">View and RSVP to events</p>
        </Link>

        <Link
          href="/portal/announcements"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <FiBell className="text-3xl text-purple-600 mb-3" />
          <h3 className="font-semibold text-gray-900">Announcements</h3>
          <p className="text-sm text-gray-600 mt-1">Stay updated with club news</p>
        </Link>

        <Link
          href="/portal/docs"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <FiFileText className="text-3xl text-orange-600 mb-3" />
          <h3 className="font-semibold text-gray-900">Documents</h3>
          <p className="text-sm text-gray-600 mt-1">Access club documents</p>
        </Link>
      </div>

      {/* Upcoming events */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Upcoming Events</h2>
          <Link href="/portal/events" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View all →
          </Link>
        </div>
        {upcomingEvents.length > 0 ? (
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <Link
                key={event.id}
                href={`/portal/events/${event.id}`}
                className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{event.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{event.location}</p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {event.startAt.toDate().toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No upcoming events</p>
        )}
      </div>

      {/* Recent announcements */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Recent Announcements</h2>
          <Link href="/portal/announcements" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View all →
          </Link>
        </div>
        {recentAnnouncements.length > 0 ? (
          <div className="space-y-3">
            {recentAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                className="p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{announcement.title}</h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{announcement.body}</p>
                  </div>
                  {announcement.pinned && (
                    <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                      Pinned
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No announcements</p>
        )}
      </div>
    </div>
  );
}
