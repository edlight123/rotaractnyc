'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { useAuth } from '@/lib/firebase/auth';
import { usePosts, usePortalEvents, apiPost, apiPatch } from '@/hooks/useFirestore';
import { useToast } from '@/components/ui/Toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Tabs from '@/components/ui/Tabs';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import PostComposer from '@/components/portal/PostComposer';
import FeedCard from '@/components/portal/FeedCard';
import Link from 'next/link';
import { formatRelativeTime } from '@/lib/utils/format';
import type { CommunityPost, RotaractEvent } from '@/types';

const quickActions = [
  { label: 'Log Service Hours', href: '/portal/service-hours', icon: '⏱️' },
  { label: 'View Events', href: '/portal/events', icon: '📅' },
  { label: 'Member Directory', href: '/portal/directory', icon: '👥' },
  { label: 'Pay Dues', href: '/portal/dues', icon: '💳' },
];

export default function PortalDashboard() {
  const { user, member } = useAuth();
  const { toast } = useToast();
  const { data: posts, loading: postsLoading } = usePosts();
  const { data: events, loading: eventsLoading } = usePortalEvents();
  const [activeTab, setActiveTab] = useState('all');
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const handlePost = async (content: string, type: string) => {
    if (!user) return;
    try {
      await apiPost('/api/portal/posts', {
        content,
        type,
      });
      toast('Post shared with the community!');
    } catch (err: any) {
      toast(err.message || 'Failed to create post', 'error');
    }
  };

  const handleLike = useCallback(async (postId: string) => {
    if (!user) return;
    try {
      await apiPost(`/api/portal/posts/${postId}/like`, {});
    } catch {
      // Silently fail — optimistic UI would handle this
    }
  }, [user]);

  const handleComment = useCallback(async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text || !user) return;
    try {
      await apiPost(`/api/portal/posts/${postId}/comments`, { content: text });
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      toast('Comment added!');
    } catch {
      toast('Failed to add comment', 'error');
    }
  }, [commentInputs, user, toast]);

  const filteredPosts = ((posts || []) as CommunityPost[]).filter((p) => {
    if (activeTab === 'announcements') return p.type === 'announcement';
    if (activeTab === 'community') return p.type !== 'announcement';
    return true;
  });

  const upcomingEvents = ((events || []) as RotaractEvent[])
    .filter((e) => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
          Welcome back, {member?.firstName || member?.displayName?.split(' ')[0] || 'Member'}! 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Here&apos;s what&apos;s happening in your community.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Post Composer */}
          <PostComposer onSubmit={handlePost} />

          <Tabs
            tabs={[
              { id: 'all', label: 'All' },
              { id: 'announcements', label: 'Announcements' },
              { id: 'community', label: 'Community' },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          {postsLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : filteredPosts.length === 0 ? (
            <EmptyState icon="💬" title="No posts yet" description="Be the first to share something with the community!" />
          ) : (
            filteredPosts.map((post) => (
              <div key={post.id}>
                <FeedCard
                  post={post}
                  onLike={handleLike}
                  onComment={(postId) => setExpandedComments((prev) => ({ ...prev, [postId]: !prev[postId] }))}
                />
                {expandedComments[post.id] && (
                  <div className="mt-2 ml-14 flex gap-2">
                    <input
                      type="text"
                      className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cranberry-500/20"
                      placeholder="Write a comment..."
                      value={commentInputs[post.id] || ''}
                      onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                    />
                    <Button size="sm" onClick={() => handleComment(post.id)}>Send</Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card padding="md">
            <h3 className="font-display font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => (
                <Link key={action.href} href={action.href} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-cranberry-50 dark:hover:bg-cranberry-900/10 hover:text-cranberry transition-colors text-center">
                  <span className="text-xl">{action.icon}</span>
                  <span className="text-xs font-medium">{action.label}</span>
                </Link>
              ))}
            </div>
          </Card>

          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-gray-900 dark:text-white">Upcoming Events</h3>
              <Link href="/portal/events" className="text-xs text-cranberry hover:text-cranberry-800 font-medium">View all</Link>
            </div>
            {eventsLoading ? <Spinner /> : upcomingEvents.length === 0 ? (
              <p className="text-sm text-gray-400">No upcoming events.</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="flex gap-3 items-start">
                    <div className="text-center bg-cranberry-50 dark:bg-cranberry-900/20 rounded-lg px-2.5 py-1.5 shrink-0">
                      <p className="text-xs text-cranberry font-bold">{new Date(event.date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</p>
                      <p className="text-lg font-bold text-cranberry-800 dark:text-cranberry-300">{new Date(event.date).getDate()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{event.title}</p>
                      <p className="text-xs text-gray-500">{event.time} · {event.location?.split(',')[0]}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
