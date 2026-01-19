'use client';

import { useAuth } from '@/lib/firebase/auth';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getFirebaseClientApp } from '@/lib/firebase/client';
import { Announcement, User } from '@/types/portal';
import FeedCard from './_components/FeedCard';
import PostComposer from './_components/PostComposer';
import MemberSpotlight from './_components/MemberSpotlight';
import UpcomingDeadlines from './_components/UpcomingDeadlines';
import QuickLinks from './_components/QuickLinks';

export default function PortalDashboard() {
  const { loading } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [authors, setAuthors] = useState<Record<string, User>>({});
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
      
      // Load author data
      const uniqueAuthors = Array.from(new Set(sorted.map(a => a.createdBy)));
      const authorsData: Record<string, User> = {};
      
      await Promise.all(
        uniqueAuthors.map(async (uid) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
              authorsData[uid] = { uid, ...userDoc.data() } as User;
            }
          } catch (error) {
            console.error(`Error loading author ${uid}:`, error);
          }
        })
      );
      
      setAuthors(authorsData);
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoadingData(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rotaract-blue"></div>
      </div>
    );
  }

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* LEFT COLUMN: The Feed (Main Content) */}
        <div className="flex-1 w-full lg:max-w-[720px] mx-auto flex flex-col gap-6">
          {/* New Post Composer */}
          <PostComposer />

          {/* Announcements Feed */}
          {announcements.length > 0 ? (
            <>
              {announcements.map((announcement) => {
                const author = authors[announcement.createdBy];
                return (
                  <FeedCard
                    key={announcement.id}
                    announcement={announcement}
                    author={author ? {
                      name: author.name,
                      role: author.role,
                      photoURL: author.photoURL
                    } : undefined}
                  />
                );
              })}
              
              {/* End of Feed Indicator */}
              <div className="flex items-center justify-center py-8">
                <span className="w-2 h-2 bg-gray-300 dark:bg-gray-700 rounded-full mx-1"></span>
                <span className="w-2 h-2 bg-gray-300 dark:bg-gray-700 rounded-full mx-1"></span>
                <span className="w-2 h-2 bg-gray-300 dark:bg-gray-700 rounded-full mx-1"></span>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-[#1e1e1e] rounded-xl shadow-sm border border-gray-100 dark:border-[#2a2a2a] p-12 text-center">
              <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4">notifications</span>
              <p className="text-gray-500 dark:text-gray-400 text-lg">No announcements yet</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Check back later for updates from your club</p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Sidebar (Widgets) */}
        <aside className="hidden lg:block w-[320px] shrink-0 sticky top-24 space-y-6">
          <MemberSpotlight />
          <UpcomingDeadlines />
          <QuickLinks />
          
          {/* Footer Links */}
          <div className="text-xs text-gray-400 dark:text-gray-600 px-2 leading-relaxed">
            <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2">
              <a href="/about" className="hover:underline">About</a>
              <a href="/help" className="hover:underline">Privacy</a>
              <a href="/help" className="hover:underline">Terms</a>
              <a href="/help" className="hover:underline">Help Center</a>
            </div>
            <p>© 2024 Rotaract Club of NYC. All rights reserved.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
