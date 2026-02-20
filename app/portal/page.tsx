'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/auth';
import { usePosts, usePortalEvents, useServiceHours, apiPost } from '@/hooks/useFirestore';
import { useDues } from '@/hooks/useDues';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Tabs from '@/components/ui/Tabs';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ProgressRing from '@/components/ui/ProgressRing';
import PostComposerModal from '@/components/portal/PostComposerModal';
import FeedCard from '@/components/portal/FeedCard';
import { formatRelativeTime } from '@/lib/utils/format';
import type { CommunityPost, RotaractEvent, ServiceHour } from '@/types';

/* ── Icons ── */
const ClockIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const CalendarIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const UsersIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const CreditCardIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
const ArrowRightIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>;
const SparklesIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>;
const DocumentIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>;
const FolderIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>;

const SERVICE_HOURS_GOAL = 40;

const quickActions = [
  { label: 'Log Hours', href: '/portal/service-hours', icon: <ClockIcon />, color: 'bg-emerald-500', description: 'Track service' },
  { label: 'Events', href: '/portal/events', icon: <CalendarIcon />, color: 'bg-azure', description: 'Browse events' },
  { label: 'Directory', href: '/portal/directory', icon: <UsersIcon />, color: 'bg-violet-500', description: 'Find members' },
  { label: 'Pay Dues', href: '/portal/dues', icon: <CreditCardIcon />, color: 'bg-gold-600', description: 'Membership fees' },
  { label: 'Articles', href: '/portal/articles', icon: <DocumentIcon />, color: 'bg-cranberry', description: 'Read & write' },
  { label: 'Documents', href: '/portal/documents', icon: <FolderIcon />, color: 'bg-cyan-600', description: 'Club resources' },
];

export default function PortalDashboard() {
  const { user, member } = useAuth();
  const { toast } = useToast();
  const { data: posts, loading: postsLoading } = usePosts();
  const { data: events, loading: eventsLoading } = usePortalEvents();
  const { data: serviceHours } = useServiceHours(member?.id ?? null);
  const { status: duesStatus } = useDues();
  const [activeTab, setActiveTab] = useState('all');
  const [mobileView, setMobileView] = useState<'overview' | 'feed' | 'widgets'>('overview');
  const [showComposer, setShowComposer] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const totalHours = ((serviceHours || []) as ServiceHour[])
    .filter((h) => h.status === 'approved')
    .reduce((sum, h) => sum + h.hours, 0);

  const handlePost = async (data: { content: string; type: string; imageURLs?: string[]; linkURL?: string; audience: string }) => {
    if (!user) return;
    try {
      await apiPost('/api/portal/posts', data);
      toast('Post shared with the community!');
    } catch (err: any) {
      toast(err.message || 'Failed to create post', 'error');
    }
  };

  const handleLike = useCallback(async (postId: string) => {
    if (!user) return;
    try { await apiPost(`/api/portal/posts/${postId}/like`, {}); } catch { /* optimistic UI */ }
  }, [user]);

  const handleComment = useCallback(async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text || !user) return;
    try {
      await apiPost(`/api/portal/posts/${postId}/comments`, { content: text });
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      toast('Comment added!');
    } catch { toast('Failed to add comment', 'error'); }
  }, [commentInputs, user, toast]);

  const isBoardMember = member?.role === 'board' || member?.role === 'president' || member?.role === 'treasurer';

  const filteredPosts = ((posts || []) as CommunityPost[]).filter((p) => {
    // Hide board-only posts from non-board members
    if (p.audience === 'board' && !isBoardMember) return false;
    if (activeTab === 'announcements') return p.type === 'announcement';
    if (activeTab === 'community') return p.type !== 'announcement';
    return true;
  });

  const upcomingEvents = ((events || []) as RotaractEvent[])
    .filter((e) => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const firstName = member?.firstName || member?.displayName?.split(' ')[0] || 'Member';

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 page-enter">

      {/* ═══════ MOBILE VIEW TABS (sm:hidden) ═══════ */}
      <div className="sm:hidden">
        <div role="tablist" aria-orientation="horizontal" className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
          {(['overview', 'feed', 'widgets'] as const).map((view) => (
            <button
              key={view}
              role="tab"
              aria-selected={mobileView === view}
              onClick={() => setMobileView(view)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 capitalize ${
                mobileView === view
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {view}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════ HERO SECTION ═══════ */}
      {/* On mobile: only show in overview tab. On sm+: always show */}
      <section className={`relative overflow-hidden rounded-2xl lg:rounded-3xl ${mobileView !== 'overview' ? 'hidden sm:block' : ''}`}>
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-cranberry-700 via-cranberry-800 to-cranberry-950" />
        {/* Mesh pattern overlay */}
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H0V0h2v14h4v-6h2v6h4V0h2v14h4v-4h2v4h4v2h-4v4h4v2H20z' /%3E%3C/g%3E%3C/svg%3E")` }} />
        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-cranberry-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-gold/10 rounded-full blur-3xl" />

        <div className="relative px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            {/* Left: greeting */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar src={member?.photoURL} alt={member?.displayName || ''} size="xl" className="ring-4 ring-white/20" />
                {duesStatus === 'PAID' || duesStatus === 'PAID_OFFLINE' || duesStatus === 'WAIVED' ? (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center ring-2 ring-cranberry-800">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  </div>
                ) : null}
              </div>
              <div>
                <p className="text-cranberry-200 text-sm font-medium flex items-center gap-1.5">
                  <SparklesIcon />
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-white mt-1">
                  {greeting}, {firstName}
                </h1>
                <p className="text-cranberry-200/80 mt-1 text-sm sm:text-base">Here&apos;s your community at a glance.</p>
              </div>
            </div>

            {/* Right: key metrics */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full sm:w-auto">
              <div className="glass-card rounded-2xl px-3 sm:px-5 py-3 sm:py-4 text-center">
                <p className="text-xl sm:text-3xl font-display font-bold text-white tabular-nums">{totalHours}</p>
                <p className="text-cranberry-200 text-[10px] sm:text-[11px] font-medium uppercase tracking-wider mt-0.5">Hours</p>
              </div>
              <div className="glass-card rounded-2xl px-3 sm:px-5 py-3 sm:py-4 text-center">
                <p className="text-xl sm:text-3xl font-display font-bold text-white tabular-nums">{upcomingEvents.length}</p>
                <p className="text-cranberry-200 text-[10px] sm:text-[11px] font-medium uppercase tracking-wider mt-0.5">Events</p>
              </div>
              <div className="glass-card rounded-2xl px-3 sm:px-5 py-3 sm:py-4 text-center">
                {duesStatus === 'PAID' || duesStatus === 'PAID_OFFLINE' || duesStatus === 'WAIVED' ? (
                  <>
                    <div className="flex justify-center"><Badge variant="green" className="text-xs">Paid</Badge></div>
                    <p className="text-cranberry-200 text-[11px] font-medium uppercase tracking-wider mt-1.5">Dues</p>
                  </>
                ) : (
                  <>
                    <div className="flex justify-center"><Badge variant="red" className="text-xs">Unpaid</Badge></div>
                    <p className="text-cranberry-200 text-[11px] font-medium uppercase tracking-wider mt-1.5">Dues</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ QUICK ACTIONS STRIP ═══════ */}
      {/* On mobile: only show in overview tab. On sm+: always show */}
      <section className={`grid grid-cols-3 sm:grid-cols-6 gap-3 ${mobileView !== 'overview' ? 'hidden sm:block' : ''}`}>
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group relative flex flex-col items-center gap-2.5 p-4 sm:p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-800 hover:border-cranberry-200 dark:hover:border-cranberry-800 hover:shadow-lg hover:shadow-cranberry-500/5 hover:-translate-y-0.5 transition-all duration-300 text-center"
          >
            <span className={`w-11 h-11 flex items-center justify-center rounded-xl ${action.color} text-white shadow-lg shadow-black/10 group-hover:scale-110 transition-transform duration-300`}>
              {action.icon}
            </span>
            <div>
              <span className="text-xs font-bold text-gray-900 dark:text-white block">{action.label}</span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 hidden sm:block">{action.description}</span>
            </div>
          </Link>
        ))}
      </section>

      {/* ═══════ MAIN GRID ═══════ */}
      <div className="grid lg:grid-cols-12 gap-6">

        {/* ── LEFT: Feed ── */}
        {/* On mobile: only show in feed tab. On lg+: always show */}
        <div className={`lg:col-span-7 xl:col-span-8 space-y-5 ${mobileView !== 'feed' ? 'hidden sm:block' : ''}`}>
          {/* Composer trigger card */}
          <div
            onClick={() => setShowComposer(true)}
            className="flex items-center gap-3.5 p-5 sm:p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 hover:border-cranberry-200 dark:hover:border-cranberry-700 cursor-pointer transition-all duration-200 group hover:shadow-md hover:shadow-cranberry-500/5"
          >
            <Avatar src={member?.photoURL} alt={member?.displayName || ''} size="md" />
            <div className="flex-1 bg-gray-50/80 dark:bg-gray-800/40 rounded-xl px-4 py-3 border border-gray-200/80 dark:border-gray-700/60 group-hover:border-cranberry-200 dark:group-hover:border-cranberry-700 transition-colors">
              <p className="text-sm text-gray-400 dark:text-gray-500">Share an update with the community…</p>
            </div>
          </div>

          {/* Composer modal */}
          <PostComposerModal
            open={showComposer}
            onClose={() => setShowComposer(false)}
            onSubmit={handlePost}
          />

          <div className="flex items-center justify-between">
            <Tabs
              tabs={[
                { id: 'all', label: 'All Posts' },
                { id: 'announcements', label: 'Announcements' },
                { id: 'community', label: 'Community' },
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
            />
          </div>

          {postsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Spinner size="lg" />
              <p className="text-sm text-gray-400">Loading your feed…</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <EmptyState
              icon={<svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
              title="No posts yet"
              description="Be the first to share something with the community!"
            />
          ) : (
            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <div key={post.id}>
                  <FeedCard
                    post={post}
                    onLike={handleLike}
                    onComment={(postId) => setExpandedComments((prev) => ({ ...prev, [postId]: !prev[postId] }))}
                  />
                  {expandedComments[post.id] && (
                    <div className="mt-2 ml-14 flex gap-2 animate-slide-up">
                      <input
                        type="text"
                        className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cranberry-500/20 focus:border-cranberry-300 dark:focus:border-cranberry-700 transition-all"
                        placeholder="Write a comment…"
                        value={commentInputs[post.id] || ''}
                        onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                      />
                      <Button size="sm" onClick={() => handleComment(post.id)}>Send</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Sidebar Widgets ── */}
        {/* On mobile: only show in widgets tab. On lg+: always show */}
        <aside className={`lg:col-span-5 xl:col-span-4 space-y-5 ${mobileView !== 'widgets' ? 'hidden sm:block' : ''}`}>

          {/* Service Hours Progress */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-display font-bold text-gray-900 dark:text-white">Service Progress</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Annual goal: {SERVICE_HOURS_GOAL}h</p>
              </div>
              <Link href="/portal/service-hours" className="text-xs text-cranberry hover:text-cranberry-800 font-semibold transition-colors flex items-center gap-1">
                View all <ArrowRightIcon />
              </Link>
            </div>
            <div className="flex items-center justify-center">
              <ProgressRing
                value={totalHours}
                max={SERVICE_HOURS_GOAL}
                size={140}
                strokeWidth={10}
                color={totalHours >= SERVICE_HOURS_GOAL ? 'emerald' : 'cranberry'}
                sublabel="hours"
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 text-center">
                <p className="text-lg font-display font-bold text-gray-900 dark:text-white tabular-nums">{SERVICE_HOURS_GOAL - totalHours > 0 ? SERVICE_HOURS_GOAL - totalHours : 0}</p>
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Remaining</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 text-center">
                <p className="text-lg font-display font-bold text-gray-900 dark:text-white tabular-nums">{Math.round((totalHours / SERVICE_HOURS_GOAL) * 100)}%</p>
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Complete</p>
              </div>
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-gray-900 dark:text-white">Upcoming Events</h3>
              <Link href="/portal/events" className="text-xs text-cranberry hover:text-cranberry-800 font-semibold transition-colors flex items-center gap-1">
                View all <ArrowRightIcon />
              </Link>
            </div>

            {eventsLoading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : upcomingEvents.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <CalendarIcon />
                </div>
                <p className="text-sm text-gray-400 font-medium">No upcoming events</p>
                <p className="text-xs text-gray-400/60 mt-1">Check back soon!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/portal/events/${event.id}`}
                    className="group flex gap-3.5 items-center p-3 -mx-1 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-all duration-200"
                  >
                    {/* Date badge */}
                    <div className="text-center bg-gradient-to-br from-cranberry-50 to-cranberry-100/50 dark:from-cranberry-900/30 dark:to-cranberry-900/10 rounded-xl w-14 h-14 flex flex-col items-center justify-center shrink-0 group-hover:from-cranberry-100 dark:group-hover:from-cranberry-900/40 transition-colors">
                      <p className="text-[10px] font-extrabold text-cranberry tracking-widest leading-none">
                        {new Date(event.date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                      </p>
                      <p className="text-xl font-display font-bold text-cranberry-800 dark:text-cranberry-300 leading-tight">
                        {new Date(event.date).getDate()}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-cranberry dark:group-hover:text-cranberry-400 transition-colors truncate">
                        {event.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {event.time} · {event.location?.split(',')[0]}
                      </p>
                    </div>
                    <span className="text-gray-300 dark:text-gray-600 group-hover:text-cranberry transition-colors shrink-0">
                      <ArrowRightIcon />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Member Status Card */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-950 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cranberry/10 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gold/10 rounded-full blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Active Member</span>
              </div>
              <p className="font-display font-bold text-lg">{member?.displayName}</p>
              <p className="text-gray-400 text-sm mt-0.5 capitalize">{member?.role} · {member?.committee || 'General'}</p>
              <div className="mt-4 pt-4 border-t border-gray-700/50">
                <Link
                  href="/portal/profile"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-cranberry-300 hover:text-cranberry-200 transition-colors"
                >
                  View Profile <ArrowRightIcon />
                </Link>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
