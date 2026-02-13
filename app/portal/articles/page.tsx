'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/auth';
import { useArticles } from '@/hooks/useFirestore';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import SearchInput from '@/components/ui/SearchInput';
import { formatDate } from '@/lib/utils/format';
import { defaultArticles } from '@/lib/defaults/data';
import type { Article } from '@/types';

const categoryColors: Record<string, 'cranberry' | 'azure' | 'green' | 'gold' | 'gray'> = {
  Service: 'azure',
  Leadership: 'cranberry',
  International: 'green',
  Fellowship: 'gold',
  Announcements: 'cranberry',
  Events: 'azure',
};

export default function PortalArticlesPage() {
  const router = useRouter();
  const { member } = useAuth();
  const { data: firestoreArticles, loading } = useArticles(false);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
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

  const handleDelete = async (articleId: string, articleTitle: string) => {
    if (!confirm(`Delete "${articleTitle}"? This cannot be undone.`)) return;

    setDeleting(articleId);
    try {
      const res = await fetch(`/api/portal/articles?id=${articleId}`, { method: 'DELETE' });
      if (res.ok) {
        // Real-time listener will auto-update the list
      }
    } catch {
      // Silently fail — article may already be gone
    } finally {
      setDeleting(null);
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
            <Card key={article.id} interactive padding="none" className="overflow-hidden group relative">
              <Link href={`/news/${article.slug}`} className="block">
                <div className="h-36 bg-gradient-to-br from-cranberry-100 to-cranberry-50 dark:from-cranberry-900/20 dark:to-cranberry-950/30 overflow-hidden relative">
                  {article.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={article.coverImage} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : null}
                  {/* Draft badge */}
                  {!article.isPublished && (
                    <div className="absolute top-2 left-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-300">
                        Draft
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={categoryColors[article.category] || 'gray'}>{article.category}</Badge>
                    <span className="text-xs text-gray-400">{article.publishedAt ? formatDate(article.publishedAt) : ''}</span>
                  </div>
                  <h3 className="font-display font-bold text-gray-900 dark:text-white line-clamp-2">{article.title}</h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{article.excerpt}</p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                    {article.author?.photoURL && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={article.author.photoURL} alt={article.author.name} className="w-5 h-5 rounded-full" />
                    )}
                    <span>By {article.author?.name || 'Unknown'}</span>
                    {article.viewCount != null && <><span>·</span><span>{article.viewCount} views</span></>}
                    {article.likeCount != null && <><span>·</span><span>❤️ {article.likeCount}</span></>}
                  </div>
                </div>
              </Link>
              {/* Board actions */}
              {canManage && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(article.id, article.title);
                    }}
                    disabled={deleting === article.id}
                    className="p-1.5 rounded-lg bg-red-600/90 text-white hover:bg-red-700 transition-colors text-xs"
                    title="Delete article"
                  >
                    {deleting === article.id ? '…' : '🗑️'}
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
