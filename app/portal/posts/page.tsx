'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getFirebaseClientApp } from '@/lib/firebase/client';
import Link from 'next/link';

type Post = {
  slug: string;
  title: string;
  date: string;
  author: string;
  category: string;
  excerpt: string;
  content: string[];
  published: boolean;
};

export default function PortalPostsPage() {
  const { loading, user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (!loading && user) {
      loadPosts();
    }
  }, [loading, user]);

  const loadPosts = async () => {
    try {
      setLoadingPosts(true);
      setError(null);

      const app = getFirebaseClientApp();
      if (!app) {
        setError('Firebase not initialized');
        setLoadingPosts(false);
        return;
      }
      const db = getFirestore(app);
      const postsRef = collection(db, 'posts');
      
      // Only fetch published posts
      const postsQuery = query(
        postsRef,
        where('published', '==', true),
        orderBy('date', 'desc')
      );
      
      const snapshot = await getDocs(postsQuery);
      const postsData = snapshot.docs.map(doc => ({
        ...doc.data() as Post,
        slug: doc.id,
      }));
      
      setPosts(postsData);
    } catch (err) {
      console.error('Error loading posts:', err);
      setError('Failed to load articles. Please try again.');
    } finally {
      setLoadingPosts(false);
    }
  };

  if (loading || loadingPosts) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading articles...</p>
        </div>
      </div>
    );
  }

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(posts.map(p => p.category)))];
  const filteredPosts = selectedCategory === 'all' 
    ? posts 
    : posts.filter(p => p.category === selectedCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Articles & News
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Stay updated with the latest news, updates, and stories from our club
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Category Filter */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === category
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {category === 'all' ? 'All Articles' : category}
          </button>
        ))}
      </div>

      {/* Posts Grid */}
      {filteredPosts.length === 0 ? (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">
            article
          </span>
          <p className="text-gray-500 dark:text-gray-400">
            {selectedCategory === 'all' ? 'No articles published yet' : `No articles in ${selectedCategory}`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map(post => (
            <article
              key={post.slug}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                {/* Category Badge */}
                <div className="mb-3">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                    {post.category}
                  </span>
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
                  {post.title}
                </h2>

                {/* Excerpt */}
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                  {post.excerpt || post.content[0]?.substring(0, 150) || 'No preview available'}
                </p>

                {/* Meta */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <p>{post.date}</p>
                  </div>
                  <Link
                    href={`/portal/posts/${post.slug}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Read more
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
