'use client';

import Image from 'next/image';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { formatRelativeTime } from '@/lib/utils/format';
import type { CommunityPost } from '@/types';

interface FeedCardProps {
  post: CommunityPost;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
}

export default function FeedCard({ post, onLike, onComment }: FeedCardProps) {
  return (
    <Card padding="md" className="hover:border-gray-300 dark:hover:border-gray-700 transition-colors duration-200">
      <div className="flex items-start gap-3">
        <Avatar src={post.authorPhoto} alt={post.authorName || 'Member'} size="md" />
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 dark:text-white text-sm">{post.authorName}</p>
            {post.type === 'announcement' && <Badge variant="cranberry">Announcement</Badge>}
            {post.type === 'spotlight' && <Badge variant="gold">Spotlight</Badge>}
            <span className="text-xs text-gray-400 tabular-nums">{formatRelativeTime(post.createdAt)}</span>
          </div>

          {/* Content */}
          <p className="mt-2 text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
            {post.content}
          </p>

          {/* Images */}
          {post.imageURLs && post.imageURLs.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl overflow-hidden">
              {post.imageURLs.map((url, i) => (
                <Image key={i} src={url} alt="" className="rounded-xl object-cover w-full h-48" width={400} height={192} />
              ))}
            </div>
          )}

          {/* Link */}
          {post.linkURL && (
            <a
              href={post.linkURL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-cranberry hover:text-cranberry-800 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              {post.linkURL}
            </a>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => onLike?.(post.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all duration-150"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              <span className="tabular-nums">{post.likeCount || 0}</span>
            </button>
            <button
              onClick={() => onComment?.(post.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-cranberry hover:bg-cranberry-50 dark:hover:bg-cranberry-900/10 transition-all duration-150"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              <span className="tabular-nums">{post.commentCount || 0}</span>
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
