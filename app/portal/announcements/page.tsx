'use client';

import { useAuth } from '@/lib/firebase/auth';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getFirebaseClientApp } from '@/lib/firebase/client';
import { Announcement } from '@/types/portal';
import { FiBell } from 'react-icons/fi';
import { BsPinAngleFill } from 'react-icons/bs';

export default function AnnouncementsPage() {
  const { loading } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading) {
      loadAnnouncements();
    }
  }, [loading]);

  const loadAnnouncements = async () => {
    const app = getFirebaseClientApp();
    if (!app) return;

    const db = getFirestore(app);
    
    try {
      const announcementsRef = collection(db, 'announcements');
      const announcementsQuery = query(
        announcementsRef,
        where('visibility', '==', 'member'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(announcementsQuery);
      const announcementsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Announcement[];
      
      // Sort to put pinned announcements first
      const sorted = announcementsData.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return 0;
      });
      
      setAnnouncements(sorted);
      
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Announcements</h1>
        <p className="text-gray-600">Stay updated with club news and updates</p>
      </div>

      {announcements.length > 0 ? (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className={`bg-white rounded-lg shadow-sm border-2 p-6 ${
                announcement.pinned
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-2xl font-bold text-gray-900">{announcement.title}</h2>
                    {announcement.pinned && (
                      <BsPinAngleFill className="text-yellow-600 text-lg" title="Pinned" />
                    )}
                  </div>
                  <div className="text-gray-700 whitespace-pre-wrap mb-4">
                    {announcement.body}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <FiBell />
                    <span>Posted {formatDate(announcement.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <FiBell className="text-6xl text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No announcements yet</p>
        </div>
      )}
    </div>
  );
}
