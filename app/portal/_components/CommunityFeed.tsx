'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { collection, addDoc, getDocs, limit, orderBy, query, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getFirebaseClientApp } from '@/lib/firebase/client';

interface Post {
  id: string;
  author: {
    name: string;
    role: string;
    photoUrl?: string;
  };
  timestamp: string;
  content: {
    title?: string;
    body: string;
    type: 'text' | 'images' | 'announcement' | 'document';
    images?: string[];
    document?: {
      name: string;
      size: string;
      url: string;
    };
  };
  reactions: {
    likes: number;
    comments: number;
  };
}

export default function CommunityFeed() {
  const { user, userData } = useAuth();
  const [postText, setPostText] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const app = getFirebaseClientApp();
      if (!app) return;
      const db = getFirestore(app);

      try {
        const ref = collection(db, 'communityPosts');
        const q = query(ref, orderBy('createdAt', 'desc'), limit(20));
        const snapshot = await getDocs(q);
        if (cancelled) return;

        const mapped = snapshot.docs.map((d) => {
          const data = d.data() as any;
          const createdAt: Timestamp | null = data.createdAt?.toDate ? data.createdAt : null;

          return {
            id: d.id,
            author: {
              name: String(data.authorName || 'Member'),
              role: String(data.authorRole || 'Member'),
              photoUrl: data.authorPhotoURL ? String(data.authorPhotoURL) : undefined,
            },
            timestamp: createdAt ? formatTimeAgo(createdAt) : '',
            content: {
              title: data.title ? String(data.title) : undefined,
              body: String(data.body || ''),
              type: (data.type as Post['content']['type']) || 'text',
              images: Array.isArray(data.images) ? (data.images as string[]) : undefined,
              document: data.document ? (data.document as Post['content']['document']) : undefined,
            },
            reactions: {
              likes: Number(data.likesCount || 0),
              comments: Number(data.commentsCount || 0),
            },
          } as Post;
        });

        setPosts(mapped);
      } catch (err) {
        console.error('Error loading community posts:', err);
        if (!cancelled) setPosts([]);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const formatTimeAgo = (timestamp: Timestamp) => {
    const now = new Date();
    const date = timestamp.toDate();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handlePost = () => {
    if (!postText.trim()) return;
    void createPost(postText.trim());
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied');
    } catch {
      alert(text);
    }
  };

  const createPost = async (body: string) => {
    const app = getFirebaseClientApp();
    if (!app) return;
    const db = getFirestore(app);

    try {
      const authorName = userData?.name || user?.displayName || 'Member';
      const authorRole = userData?.role ? String(userData.role) : 'Member';
      const authorPhotoURL = userData?.photoURL || user?.photoURL || null;
      const authorUid = user?.uid || null;

      // Optimistic UI
      const optimistic: Post = {
        id: `local-${Date.now()}`,
        author: { name: authorName, role: authorRole, photoUrl: authorPhotoURL || undefined },
        timestamp: 'Just now',
        content: { body, type: 'text' },
        reactions: { likes: 0, comments: 0 },
      };
      setPosts((prev) => [optimistic, ...prev]);
      setPostText('');

      await addDoc(collection(db, 'communityPosts'), {
        authorUid,
        authorName,
        authorRole,
        authorPhotoURL,
        title: null,
        body,
        type: 'text',
        images: null,
        document: null,
        likesCount: 0,
        commentsCount: 0,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error creating post:', err);
    }
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

      {/* Composer (Create Post) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 transition-all focus-within:ring-2 focus-within:ring-[#17b0cf]/20">
        <div className="flex gap-4">
          <div 
            className="size-12 rounded-full bg-cover bg-center shrink-0 border-2 border-white dark:border-gray-700 shadow-sm" 
            style={{ 
              backgroundImage: userData?.photoURL 
                ? `url(${userData.photoURL})` 
                : 'url(https://via.placeholder.com/48)'
            }}
          />
          <div className="flex-1 flex flex-col gap-3">
            <textarea
              className="w-full bg-gray-50 dark:bg-gray-900/50 border-0 rounded-lg p-3 text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:ring-0 resize-none h-20"
              placeholder="Share a photo, update, or shoutout with the club..."
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
            />
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <button 
                  className="p-2 text-[#17b0cf] hover:bg-[#17b0cf]/10 rounded-full transition-colors" 
                  title="Add Photo"
                  onClick={() => alert('Photo attachments are not implemented yet.')}
                >
                  <span className="material-symbols-outlined">image</span>
                </button>
                <button 
                  className="p-2 text-[#17b0cf] hover:bg-[#17b0cf]/10 rounded-full transition-colors" 
                  title="Add Event"
                  onClick={() => alert('Event attachments are not implemented yet.')}
                >
                  <span className="material-symbols-outlined">event</span>
                </button>
                <button 
                  className="p-2 text-[#17b0cf] hover:bg-[#17b0cf]/10 rounded-full transition-colors" 
                  title="Attach Link"
                  onClick={() => alert('Link attachments are not implemented yet.')}
                >
                  <span className="material-symbols-outlined">link</span>
                </button>
              </div>
              <button 
                onClick={handlePost}
                className="bg-[#17b0cf] hover:bg-cyan-500 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-lg shadow-[#17b0cf]/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                disabled={!postText.trim()}
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feed Posts */}
      {posts.map((post) => (
        <article 
          key={post.id} 
          className={`rounded-xl overflow-hidden shadow-sm hover:shadow-md border transition-all duration-300 ${
            post.content.type === 'announcement' 
              ? 'relative bg-gradient-to-br from-indigo-600 to-purple-700' 
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
          }`}
        >
          {post.content.type === 'announcement' && (
            <div className="absolute -top-10 -right-10 size-40 bg-white/10 rounded-full blur-2xl" />
          )}
          
          <div className={post.content.type === 'announcement' ? 'relative p-6' : ''}>
            {/* Post Header */}
            {post.content.type !== 'announcement' && (
              <div className="p-4 flex justify-between items-start">
                <div className="flex gap-3">
                  <div 
                    className="size-10 rounded-full bg-cover bg-center border border-gray-200 dark:border-gray-700" 
                    style={{ 
                      backgroundImage: post.author.photoUrl 
                        ? `url(${post.author.photoUrl})` 
                        : 'url(https://via.placeholder.com/40)'
                    }}
                  />
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{post.author.name}</p>
                    <p className="text-xs text-gray-500">{post.author.role} • {post.timestamp}</p>
                  </div>
                </div>
                <button
                  onClick={() => void copyText(post.content.body)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  title="Copy post text"
                >
                  <span className="material-symbols-outlined">more_horiz</span>
                </button>
              </div>
            )}

            {/* Announcement Header */}
            {post.content.type === 'announcement' && (
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-sm">
                    <span className="material-symbols-outlined">celebration</span>
                  </div>
                  <div>
                    <p className="text-white font-bold">{post.author.name}</p>
                    <p className="text-white/60 text-xs">{post.author.role} • {post.timestamp}</p>
                  </div>
                </div>
                <span className="bg-[#FCCE10] text-amber-900 text-xs font-black px-2 py-1 rounded uppercase tracking-wider">
                  New
                </span>
              </div>
            )}

            {/* Post Content */}
            <div className={post.content.type === 'announcement' ? '' : 'px-4 pb-3'}>
              {post.content.title && (
                <h3 className={`font-bold mb-2 ${
                  post.content.type === 'announcement' 
                    ? 'text-2xl text-white' 
                    : 'text-lg text-gray-900 dark:text-white'
                }`}>
                  {post.content.title}
                </h3>
              )}
              <p className={`leading-relaxed mb-4 ${
                post.content.type === 'announcement' 
                  ? 'text-indigo-100 max-w-lg' 
                  : post.content.type === 'document'
                  ? 'text-gray-700 dark:text-gray-300 text-sm'
                  : 'text-gray-600 dark:text-gray-300'
              }`}>
                {post.content.body}
              </p>

              {/* Images Grid */}
              {post.content.images && post.content.images.length > 0 && (
                <div className="grid grid-cols-2 gap-2 h-64 md:h-80 rounded-xl overflow-hidden">
                  <div 
                    className="bg-cover bg-center h-full hover:scale-105 transition-transform duration-500 cursor-pointer" 
                    style={{ backgroundImage: `url(${post.content.images[0]})` }}
                  />
                  {post.content.images.length > 1 && (
                    <div className="grid grid-rows-2 gap-2 h-full">
                      {post.content.images.slice(1).map((img, idx) => (
                        <div 
                          key={idx}
                          className="bg-cover bg-center h-full hover:scale-105 transition-transform duration-500 cursor-pointer" 
                          style={{ backgroundImage: `url(${img})` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Document Attachment */}
              {post.content.document && (
                <a 
                  href={post.content.document.url} 
                  className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                >
                  <div className="size-12 bg-red-100 dark:bg-red-900/20 rounded flex items-center justify-center text-red-500 shrink-0">
                    <span className="material-symbols-outlined">picture_as_pdf</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate group-hover:text-[#17b0cf] transition-colors">
                      {post.content.document.name}
                    </h4>
                    <p className="text-xs text-gray-500">{post.content.document.size} • Added {post.timestamp}</p>
                  </div>
                  <span className="material-symbols-outlined text-gray-400">download</span>
                </a>
              )}

              {/* Announcement CTA */}
              {post.content.type === 'announcement' && (
                <button
                  onClick={() => alert('Say hello is coming soon.')}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-bold backdrop-blur-sm transition-colors"
                >
                  Say Hello 👋
                </button>
              )}
            </div>

            {/* Post Footer / Reactions */}
            {post.content.type !== 'announcement' && (
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex gap-4">
                  <button
                    onClick={() => alert('Reactions are coming soon.')}
                    className="flex items-center gap-2 group"
                  >
                    <div className="p-2 rounded-full group-hover:bg-pink-50 dark:group-hover:bg-pink-900/30 transition-colors">
                      <span className="material-symbols-outlined text-gray-500 group-hover:text-pink-500 transition-colors text-[20px]">
                        favorite
                      </span>
                    </div>
                    <span className="text-sm font-bold text-gray-500 group-hover:text-pink-500 transition-colors">
                      {post.reactions.likes}
                    </span>
                  </button>
                  <button
                    onClick={() => alert('Comments are coming soon.')}
                    className="flex items-center gap-2 group"
                  >
                    <div className="p-2 rounded-full group-hover:bg-[#17b0cf]/10 transition-colors">
                      <span className="material-symbols-outlined text-gray-500 group-hover:text-[#17b0cf] transition-colors text-[20px]">
                        chat_bubble
                      </span>
                    </div>
                    <span className="text-sm font-bold text-gray-500 group-hover:text-[#17b0cf] transition-colors">
                      {post.reactions.comments}
                    </span>
                  </button>
                </div>
                <button
                  onClick={() => void copyText(post.content.body)}
                  className="text-gray-400 hover:text-[#17b0cf] transition-colors"
                  title="Copy post text"
                >
                  <span className="material-symbols-outlined">share</span>
                </button>
              </div>
            )}
          </div>
        </article>
      ))}
    </main>
  );
}
