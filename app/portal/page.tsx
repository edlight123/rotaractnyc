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
  { label: 'Log Service Hours', href: '/portal/service-hours', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  { label: 'View Events', href: '/portal/events', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
  { label: 'Member Directory', href: '/portal/directory', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
  { label: 'Pay Dues', href: '/portal/dues', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> },
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
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cranberry-600 via-cranberry-700 to-cranberry-900 p-6 sm:p-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEuNSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNhKSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIvPjwvc3ZnPg==')] opacity-50" />
        <div className="relative">
          <p className="text-cranberry-200 text-sm font-medium mb-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">
            Welcome back, {member?.firstName || member?.displayName?.split(' ')[0] || 'Member'}
          </h1>
          <p className="text-cranberry-100 mt-1.5 text-sm sm:text-base">Here&apos;s what&apos;s happening in your community.</p>
        </div>
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
            <EmptyState icon={<svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>} title="No posts yet" description="Be the first to share something with the community!" />
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
                <Link key={action.href} href={action.href} className="group flex flex-col items-center gap-2.5 p-4 rounded-xl border border-transparent bg-gray-50 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-800 hover:border-cranberry-200 dark:hover:border-cranberry-800 hover:shadow-sm transition-all duration-200 text-center">
                  <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-cranberry-50 dark:bg-cranberry-900/20 text-cranberry group-hover:bg-cranberry group-hover:text-white transition-colors duration-200">{action.icon}</span>
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{action.label}</span>
                </Link>
              ))}
            </div>
          </Card>

          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-gray-900 dark:text-white">Upcoming Events</h3>
              <Link href="/portal/events" className="text-xs text-cranberry hover:text-cranberry-800 font-medium transition-colors">View all</Link>
            </div>
            {eventsLoading ? <Spinner /> : upcomingEvents.length === 0 ? (
              <div className="py-6 text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <p className="text-sm text-gray-400">No upcoming events</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <Link key={event.id} href={`/portal/events/${event.id}`} className="flex gap-3 items-start group p-2 -mx-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                    <div className="text-center bg-cranberry-50 dark:bg-cranberry-900/20 rounded-xl px-3 py-2 shrink-0 group-hover:bg-cranberry-100 dark:group-hover:bg-cranberry-900/30 transition-colors">
                      <p className="text-[10px] font-bold text-cranberry tracking-wider leading-none">{new Date(event.date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</p>
                      <p className="text-xl font-display font-bold text-cranberry-800 dark:text-cranberry-300 leading-tight mt-0.5">{new Date(event.date).getDate()}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-cranberry dark:group-hover:text-cranberry-400 transition-colors truncate">{event.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{event.time} · {event.location?.split(',')[0]}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
