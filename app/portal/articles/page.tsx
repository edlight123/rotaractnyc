'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth';
import { useArticles } from '@/hooks/useFirestore';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import SearchInput from '@/components/ui/SearchInput';
import ArticleCard from '@/components/portal/ArticleCard';
import { defaultArticles } from '@/lib/defaults/data';
import type { Article } from '@/types';

export default function PortalArticlesPage() {
  const router = useRouter();
  const { member } = useAuth();
  const { data: firestoreArticles, loading } = useArticles(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'published' | 'drafts'>('all');

  const canManage = member && ['board', 'president', 'treasurer'].includes(member.role);

  const allArticles = (firestoreArticles as Article[] || []).length > 0
    ? (firestoreArticles as Article[])
    : defaultArticles;

  const articles = allArticles.filter((a) => {
    const q = search.toLowerCase();
    const matchesSearch =
      a.title.toLowerCase().includes(q) ||
      (a.excerpt || '').toLowerCase().includes(q) ||
      (a.category || '').toLowerCase().includes(q);
    const matchesFilter =
      filter === 'all' ||
      (filter === 'published' && a.isPublished) ||
      (filter === 'drafts' && !a.isPublished);
    return matchesSearch && matchesFilter;
  });

  const handleDelete = async (articleId: string) => {
    const article = allArticles.find((a) => a.id === articleId);
    if (!confirm(`Delete "${article?.title}"? This cannot be undone.`)) return;

    try {
      await fetch(`/api/portal/articles?id=${articleId}`, { method: 'DELETE' });
    } catch {
      // Silently fail — article may already be gone
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Articles</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Read stories and updates from our community.</p>
        </div>
        <div className="flex items-center gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search articles..." className="sm:max-w-xs" />
          {canManage && (
            <Button size="sm" onClick={() => router.push('/portal/articles/new')}>
              ✍️ New Article
            </Button>
          )}
        </div>
      </div>

      {/* Filters (board only) */}
      {canManage && (
        <div className="flex gap-2">
          {(['all', 'published', 'drafts'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? 'bg-cranberry text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {articles.length === 0 ? (
        <EmptyState
          icon={<svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>}
          title="No articles yet"
          description={canManage ? 'Create your first article to share with the community.' : 'Articles and stories will appear here once published.'}
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              canManage={!!canManage}
              onDelete={(id) => handleDelete(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
