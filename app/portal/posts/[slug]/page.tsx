'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getFirebaseClientApp } from '@/lib/firebase/client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

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

export default function PortalPostDetailPage() {
  const { loading, user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loadingPost, setLoadingPost] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const slug = params?.slug as string;

  useEffect(() => {
    if (!loading && user && slug) {
      loadPost();
    }
  }, [loading, user, slug]);

  const loadPost = async () => {
    try {
      setLoadingPost(true);
      setError(null);

      const app = getFirebaseClientApp();
      if (!app) {
        setError('Firebase not initialized');
        setLoadingPost(false);
        return;
      }
      const db = getFirestore(app);
      const postRef = doc(db, 'posts', slug);
      
      const snapshot = await getDoc(postRef);
      
      if (!snapshot.exists()) {
        setError('Article not found');
        return;
      }

      const postData = snapshot.data() as Post;
      
      // Check if published
      if (!postData.published) {
        setError('This article is not published');
        return;
      }
      
      setPost({
        ...postData,
        slug: snapshot.id,
      });
    } catch (err) {
      console.error('Error loading post:', err);
      setError('Failed to load article. Please try again.');
    } finally {
      setLoadingPost(false);
    }
  };

  if (loading || loadingPost) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading article...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">
            error_outline
          </span>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {error || 'Article not found'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The article you're looking for doesn't exist or is no longer available.
          </p>
          <Link
            href="/portal/posts"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            Back to Articles
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Link */}
      <Link
        href="/portal/posts"
        className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary mb-6 transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Back to Articles
      </Link>

      {/* Article */}
      <article className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-gray-200 dark:border-gray-700">
          {/* Category */}
          <div className="mb-4">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
              {post.category}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {post.title}
          </h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">calendar_today</span>
              <span>{post.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">person</span>
              <span>{post.author}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="prose prose-lg dark:prose-invert max-w-none">
            {post.content.map((paragraph, index) => {
              // Check if paragraph contains HTML
              const hasHTML = /<[a-z][\s\S]*>/i.test(paragraph);
              
              if (hasHTML) {
                return (
                  <div
                    key={index}
                    dangerouslySetInnerHTML={{ __html: paragraph }}
                    className="mb-4"
                  />
                );
              }
              
              return (
                <p key={index} className="mb-4 text-gray-700 dark:text-gray-300">
                  {paragraph}
                </p>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Published by {post.author}
            </p>
            <Link
              href="/portal/posts"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              View all articles
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}
