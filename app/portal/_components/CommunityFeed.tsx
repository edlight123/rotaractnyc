'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getFirebaseClientApp } from '@/lib/firebase/client';
import { CreatePostComposer } from './CommunityPostComposer';
import { PostCard } from './PostCard';

interface Post {
  id: string;
  author: {
    name: string;
    role: string;
    photoUrl?: string;
    uid: string;
  };
  timestamp: string;
  content: {
    title?: string;
    body: string;
    type: 'text' | 'images' | 'announcement' | 'document' | 'link' | 'event';
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
  };
  likes: string[];
  commentsCount: number;
}

export default function CommunityFeed() {
  const { user, userData } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const app = getFirebaseClientApp();
    if (!app) {
      setLoading(false);
      return;
    }
    const db = getFirestore(app);

    const postsRef = collection(db, 'communityPosts');
    const q = query(postsRef, orderBy('createdAt', 'desc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
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
          content: {
            title: data.title ? String(data.title) : undefined,
            body: String(data.body || ''),
            type: (data.type as Post['content']['type']) || 'text',
            images: Array.isArray(data.images) ? (data.images as string[]) : undefined,
            document: data.document ? (data.document as Post['content']['document']) : undefined,
            link: data.link ? (data.link as Post['content']['link']) : undefined,
            event: data.event ? (data.event as Post['content']['event']) : undefined,
          },
          likes: Array.isArray(data.likes) ? data.likes : [],
          commentsCount: Number(data.commentsCount || 0),
        } as Post;
      });

      setPosts(loadedPosts);
      setLoading(false);
    }, (error) => {
      console.error('Error loading community posts:', error);
      setPosts([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <main className="flex-1 w-full lg:max-w-[720px] mx-auto flex flex-col gap-6">
      {/* Page Heading & Greeting */}
      <div className="flex flex-col gap-1 pb-2">
        <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
          Community Hub
        </h2>
        <p className="text-gray-500 dark:text-gray-400 font-medium">
          Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {userData?.name?.split(' ')[0] || 'Member'}! Here's what's happening today.
        </p>
      </div>

      {/* Composer */}
      <CreatePostComposer 
        user={user} 
        userData={userData} 
        onPostCreated={() => {}} 
      />

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#17b0cf]"></div>
        </div>
      )}

      {/* Feed Posts */}
      {!loading && posts.map((post) => (
        <PostCard
          key={post.id}
          postId={post.id}
          author={post.author}
          timestamp={post.timestamp}
          content={post.content}
          likes={post.likes}
          commentsCount={post.commentsCount}
        />
      ))}

      {/* Empty State */}
      {!loading && posts.length === 0 && (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4">
            forum
          </span>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            No posts yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Be the first to share something with the club!
          </p>
        </div>
      )}
    </main>
  );
}
