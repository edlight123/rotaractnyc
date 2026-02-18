'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiGet } from '@/hooks/useFirestore';
import { useToast } from '@/components/ui/Toast';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';
import { formatDate } from '@/lib/utils/format';
import type { Article } from '@/types';

const categoryColors: Record<string, 'cranberry' | 'azure' | 'green' | 'gold' | 'gray'> = {
  Service: 'azure',
  Leadership: 'cranberry',
  International: 'green',
  Fellowship: 'gold',
};

export default function PortalArticleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchArticle = useCallback(async () => {
    try {
      const data = await apiGet(`/api/news?slug=${slug}`);
      if (Array.isArray(data)) {
        const found = data.find((a: Article) => a.slug === slug);
        setArticle(found || null);
      } else {
        setArticle(data);
      }
    } catch {
      toast('Failed to load article', 'error');
    } finally {
      setLoading(false);
    }
  }, [slug, toast]);

  useEffect(() => {
    fetchArticle();
  }, [fetchArticle]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!article) return (
    <div className="text-center py-20">
      <p className="text-gray-500 mb-4">Article not found.</p>
      <Button variant="secondary" onClick={() => router.push('/portal/articles')}>Back to Articles</Button>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-cranberry transition-colors flex items-center gap-1">
        ← Back to articles
      </button>

      {/* Cover */}
      {article.coverImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={article.coverImage} alt={article.title} className="rounded-2xl w-full h-64 sm:h-80 object-cover" />
      )}

      <Card padding="lg">
        {/* Meta */}
        <div className="flex items-center gap-2 mb-4">
          <Badge variant={categoryColors[article.category] || 'gray'}>{article.category}</Badge>
          {!article.isPublished && <Badge variant="gold">Draft</Badge>}
          {article.publishedAt && (
            <span className="text-sm text-gray-400">{formatDate(article.publishedAt)}</span>
          )}
        </div>

        <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white leading-tight">{article.title}</h1>

        {/* Author */}
        {article.author && (
          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Avatar src={article.author.photoURL} alt={article.author.name} size="md" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">{article.author.name}</p>
              {article.publishedAt && (
                <p className="text-xs text-gray-500">{formatDate(article.publishedAt)}</p>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="mt-8 prose prose-sm dark:prose-invert max-w-none">
          {article.content ? (
            <div dangerouslySetInnerHTML={{ __html: article.content }} />
          ) : (
            <p className="text-gray-600 dark:text-gray-400">{article.excerpt}</p>
          )}
        </div>

        {/* Stats */}
        <div className="mt-8 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-4 text-sm text-gray-500">
          {article.viewCount != null && <span>{article.viewCount} views</span>}
          {article.likeCount != null && <span>{article.likeCount} likes</span>}
        </div>
      </Card>
    </div>
  );
}
