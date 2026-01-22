'use client';

import { useAuth } from '@/lib/firebase/auth';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, doc, getDoc, onSnapshot, limit } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getFirebaseClientApp } from '@/lib/firebase/client';
import { Announcement, User } from '@/types/portal';
import FeedCard from './_components/FeedCard';
import { PostCard } from './_components/PostCard';
import PostComposer from './_components/PostComposer';
import MemberSpotlight from './_components/MemberSpotlight';
import UpcomingDeadlines from './_components/UpcomingDeadlines';
import QuickLinks from './_components/QuickLinks';
import DashboardSummary from './_components/DashboardSummary';

interface CommunityPost {
  id: string;
  author: {
    name: string;
    role: string;
    photoUrl?: string;
    uid: string;
  };
  timestamp: string;
  createdAt: Date;
  content: {
    title?: string;
    body: string;
    type: 'text' | 'images' | 'announcement' | 'document' | 'link' | 'event' | 'spotlight';
    images?: string[];
    document?: {
      name: string;
      size: string;
      url: string;
    };
    link?: {
      url: string;
      title?: string;
      description?: string;
      image?: string;
    };
    event?: {
      id: string;
      title: string;
      date: string;
      time: string;
    };
    spotlight?: {
      userId: string;
      name: string;
      role: string;
      photoURL?: string;
      quote: string;
    };
  };
  likes: string[];
  commentsCount: number;
}

type FeedItem = 
  | { type: 'announcement'; data: Announcement; author?: User }
  | { type: 'post'; data: CommunityPost };

export default function PortalDashboard() {
  const { loading, user, userData } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [authors, setAuthors] = useState<Record<string, User>>({});
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      loadFeed();
    }
  }, [loading]);

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const loadFeed = async () => {
    const app = getFirebaseClientApp();
    if (!app) {
      setError('Firebase not initialized');
      setLoadingData(false);
      return;
    }

    const db = getFirestore(app);
    
    try {
      setError(null);
      
      // Load announcements with real-time listener
      const announcementsRef = collection(db, 'announcements');
      const announcementsQuery = query(
        announcementsRef,
        where('visibility', '==', 'member'),
        orderBy('createdAt', 'desc')
      );
      
      const unsubscribeAnnouncements = onSnapshot(announcementsQuery, async (snapshot) => {
        const announcementsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Announcement[];
        
        setAnnouncements(announcementsData);
        
        // Load author data
        const uniqueAuthors = Array.from(new Set(announcementsData.map(a => a.createdBy)));
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
      }, (error) => {
        console.error('Error loading announcements:', error);
        setError(error.message);
      });

      // Load community posts with real-time listener
      const postsRef = collection(db, 'communityPosts');
      const postsQuery = query(postsRef, orderBy('createdAt', 'desc'), limit(50));

      const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
        const loadedPosts = snapshot.docs.map((doc) => {
          const data = doc.data() as any;
          const createdAt: Date | null = data.createdAt?.toDate ? data.createdAt.toDate() : null;

          return {
            id: doc.id,
            author: {
              name: String(data.authorName || 'Member'),
              role: String(data.authorRole || 'Member'),
              photoUrl: data.authorPhotoURL ? String(data.authorPhotoURL) : undefined,
              uid: data.authorUid || '',
            },
            timestamp: createdAt ? formatTimeAgo(createdAt) : '',
            createdAt: createdAt || new Date(),
            content: {
              title: data.title ? String(data.title) : undefined,
              body: String(data.body || ''),
              type: (data.type as CommunityPost['content']['type']) || 'text',
              images: Array.isArray(data.images) ? (data.images as string[]) : undefined,
              document: data.document ? (data.document as CommunityPost['content']['document']) : undefined,
              link: data.link ? (data.link as CommunityPost['content']['link']) : undefined,
              event: data.event ? (data.event as CommunityPost['content']['event']) : undefined,
              spotlight: data.spotlight ? (data.spotlight as CommunityPost['content']['spotlight']) : undefined,
            },
            likes: Array.isArray(data.likes) ? data.likes : [],
            commentsCount: Number(data.commentsCount || 0),
          } as CommunityPost;
        });

        setCommunityPosts(loadedPosts);
        setLoadingData(false);
      }, (error) => {
        console.error('Error loading community posts:', error);
        setLoadingData(false);
      });

      // Cleanup listeners on unmount
      return () => {
        unsubscribeAnnouncements();
        unsubscribePosts();
      };
    } catch (error: any) {
      console.error('Error setting up feed listeners:', error);
      setError(error.message);
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

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-red-500 mb-4">error</span>
          <p className="text-red-500 text-lg">Error loading announcements</p>
          <p className="text-gray-500 text-sm mt-2">{error}</p>
          {error.includes('index') && (
            <p className="text-gray-500 text-sm mt-2">
              A Firestore index may need to be created. Check the browser console for the index creation link.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Merge and sort feed items
  const feedItems: FeedItem[] = [
    ...announcements.map(announcement => ({
      type: 'announcement' as const,
      data: announcement,
      author: authors[announcement.createdBy],
      sortDate: announcement.createdAt?.toDate?.() || new Date(0),
      pinned: announcement.pinned || false,
    })),
    ...communityPosts.map(post => ({
      type: 'post' as const,
      data: post,
      sortDate: post.createdAt,
      pinned: false,
    }))
  ].sort((a, b) => {
    // Pinned announcements always come first
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    
    // Then sort by date (newest first)
    return b.sortDate.getTime() - a.sortDate.getTime();
  });

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Dashboard Summary - Full Width */}
      <div className="mb-8">
        <DashboardSummary />
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* LEFT/MAIN COLUMN: The Feed */}
        <div className="flex-1 w-full lg:max-w-[720px] mx-auto flex flex-col gap-6">
          {/* Section Heading */}
          <div className="flex flex-col gap-1 pb-2">
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              Club Feed
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Stay updated with announcements, updates, and posts from your club
            </p>
          </div>

          {/* Post Composer */}
          <PostComposer onPostCreated={loadFeed} />

          {/* Unified Feed */}
          {feedItems.length > 0 ? (
            <>
              {feedItems.map((item) => {
                if (item.type === 'announcement') {
                  return (
                    <FeedCard
                      key={`announcement-${item.data.id}`}
                      announcement={item.data}
                      author={item.author ? {
                        name: item.author.name,
                        role: item.author.role,
                        photoURL: item.author.photoURL
                      } : undefined}
                    />
                  );
                } else {
                  return (
                    <PostCard
                      key={`post-${item.data.id}`}
                      postId={item.data.id}
                      author={item.data.author}
                      timestamp={item.data.timestamp}
                      content={item.data.content}
                      likes={item.data.likes}
                      commentsCount={item.data.commentsCount}
                    />
                  );
                }
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
              <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4">forum</span>
              <p className="text-gray-500 dark:text-gray-400 text-lg">No posts yet</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Be the first to share something with the club!</p>
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
