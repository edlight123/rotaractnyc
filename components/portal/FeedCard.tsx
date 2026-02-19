'use client';

import { useState } from 'react';
import Image from 'next/image';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import { formatRelativeTime } from '@/lib/utils/format';
import type { CommunityPost } from '@/types';

interface FeedCardProps {
  post: CommunityPost;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
}

export default function FeedCard({ post, onLike, onComment }: FeedCardProps) {
  const [liked, setLiked] = useState(false);

  const likeDisplayCount = (post.likeCount || 0) + (liked ? 1 : 0);
  const commentDisplayCount = post.commentCount || 0;

  const handleLike = () => {
    setLiked(!liked);
    onLike?.(post.id);
  };

  return (
    <article className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 hover:border-gray-300/80 dark:hover:border-gray-700 transition-all duration-200 overflow-hidden group">
      {/* Announcement accent bar */}
      {post.type === 'announcement' && (
        <div className="h-0.5 bg-gradient-to-r from-cranberry via-cranberry-400 to-cranberry" />
      )}
      {post.type === 'spotlight' && (
        <div className="h-0.5 bg-gradient-to-r from-gold-400 via-gold to-gold-400" />
      )}

      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3.5">
          <Avatar src={post.authorPhoto} alt={post.authorName || 'Member'} size="md" className="mt-0.5" />
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-gray-900 dark:text-white text-sm">{post.authorName}</p>
              {post.type === 'announcement' && <Badge variant="cranberry">📢 Announcement</Badge>}
              {post.type === 'spotlight' && <Badge variant="gold">⭐ Spotlight</Badge>}
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span className="text-xs text-gray-400 tabular-nums">{formatRelativeTime(post.createdAt)}</span>
            </div>

            {/* Content */}
            <div className="mt-3 text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
              {post.content}
            </div>

            {/* Images */}
            {post.imageURLs && post.imageURLs.length > 0 && (
              <div className={`mt-4 rounded-xl overflow-hidden ${post.imageURLs.length === 1 ? '' : 'grid grid-cols-2 gap-1'}`}>
                {post.imageURLs.map((url, i) => (
                  <Image
                    key={i}
                    src={url}
                    alt=""
                    className="object-cover w-full h-52 hover:scale-[1.02] transition-transform duration-300"
                    width={400}
                    height={208}
                  />
                ))}
              </div>
            )}

            {/* Link preview */}
            {post.linkURL && (
              <a
                href={post.linkURL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group/link"
              >
                <div className="w-9 h-9 rounded-lg bg-cranberry-50 dark:bg-cranberry-900/20 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-cranberry" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                </div>
                <span className="text-sm text-cranberry group-hover/link:text-cranberry-800 dark:group-hover/link:text-cranberry-300 font-medium truncate transition-colors">{post.linkURL}</span>
                <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1 mt-4 pt-3.5 border-t border-gray-100 dark:border-gray-800/60">
              <button
                type="button"
                onClick={handleLike}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  liked
                    ? 'text-red-500 bg-red-50 dark:bg-red-900/15'
                    : 'text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10'
                }`}
              >
                <svg className="w-4.5 h-4.5" fill={liked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={liked ? 0 : 2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                {likeDisplayCount > 0 ? (
                  <span className="tabular-nums">{likeDisplayCount}</span>
                ) : (
                  <span>Like</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => onComment?.(post.id)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-cranberry hover:bg-cranberry-50 dark:hover:bg-cranberry-900/10 transition-all duration-200"
              >
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" /></svg>
                {commentDisplayCount > 0 ? (
                  <span className="tabular-nums">{commentDisplayCount}</span>
                ) : (
                  <span>Comment</span>
                )}
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm text-gray-500 hover:text-azure hover:bg-azure-50 dark:hover:bg-azure-900/10 transition-all duration-200 ml-auto"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
