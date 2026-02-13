'use client';

import { useArticles } from '@/hooks/useFirestore';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/utils/format';
import type { Article } from '@/types';

const categoryColors: Record<string, 'cranberry' | 'azure' | 'green' | 'gold' | 'gray'> = {
  Service: 'azure',
  Leadership: 'cranberry',
  International: 'green',
  Fellowship: 'gold',
};

export default function PortalArticlesPage() {
  const { data: articles, loading } = useArticles();

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Articles</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Read stories and updates from our community.</p>
      </div>

      {articles.length === 0 ? (
        <EmptyState
          icon={<svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>}
          title="No articles yet"
          description="Articles and stories will appear here once published."
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {(articles as Article[]).map((article) => (
            <Card key={article.id} interactive padding="none" className="overflow-hidden">
              <div className="h-36 bg-gradient-to-br from-cranberry-100 to-cranberry-50 dark:from-cranberry-900/20 dark:to-cranberry-950/30" />
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={categoryColors[article.category] || 'gray'}>{article.category}</Badge>
                  <span className="text-xs text-gray-400">{article.publishedAt ? formatDate(article.publishedAt) : ''}</span>
                </div>
                <h3 className="font-display font-bold text-gray-900 dark:text-white line-clamp-2">{article.title}</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{article.excerpt}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                  <span>By {article.author?.name || 'Unknown'}</span>
                  {article.viewCount != null && <><span>·</span><span>{article.viewCount} views</span></>}
                  {article.likeCount != null && <><span>·</span><span>❤️ {article.likeCount}</span></>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
