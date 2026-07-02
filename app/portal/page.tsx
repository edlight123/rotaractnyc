'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/auth';
import { usePosts, usePortalEvents, useServiceHours, useMemberRsvps, apiPost } from '@/hooks/useFirestore';
import { useDues } from '@/hooks/useDues';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Tabs from '@/components/ui/Tabs';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ProgressRing from '@/components/ui/ProgressRing';
import PageHeader, { SectionHeader } from '@/components/portal/PageHeader';
import PostComposerModal from '@/components/portal/PostComposerModal';
import FeedCard from '@/components/portal/FeedCard';
import ProfileCompletionCard from '@/components/portal/ProfileCompletionCard';
import OnboardingChecklist from '@/components/portal/OnboardingChecklist';
import { TutorialLauncher, useTutorial } from '@/components/portal/tutorial';
import { formatRelativeTime } from '@/lib/utils/format';
import { SERVICE_HOURS_GOAL } from '@/lib/constants';
import type { CommunityPost, RotaractEvent, ServiceHour } from '@/types';

/* ── Icons ── */
const ClockIcon = () => <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const CalendarIcon = () => <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const UsersIcon = () => <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const CreditCardIcon = () => <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
const DocumentIcon = () => <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>;
const FolderIcon = () => <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>;
const ChartIcon = () => <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>;
const TrendingUpIcon = () => <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>;

// SERVICE_HOURS_GOAL is now imported from '@/lib/constants'

type QuickAction = {
  label: string;
  href: string;
  icon: React.ReactNode;
  description: string;
  roles?: string[];
};

const quickActions: QuickAction[] = [
  { label: 'Log Hours', href: '/portal/service-hours', icon: <ClockIcon />, description: 'Track service' },
  { label: 'Events', href: '/portal/events', icon: <CalendarIcon />, description: 'Browse events' },
  { label: 'Directory', href: '/portal/directory', icon: <UsersIcon />, description: 'Find members' },
  { label: 'Pay Dues', href: '/portal/dues', icon: <CreditCardIcon />, description: 'Membership fees' },
  { label: 'Articles', href: '/portal/articles', icon: <DocumentIcon />, description: 'Read & write' },
  { label: 'Documents', href: '/portal/documents', icon: <FolderIcon />, description: 'Club resources' },
  { label: 'Leaderboard', href: '/portal/service-hours/analytics', icon: <TrendingUpIcon />, description: 'Service stats' },
  { label: 'Analytics', href: '/portal/admin/analytics', icon: <ChartIcon />, description: 'Club insights', roles: ['board', 'president', 'treasurer'] },
];

export default function PortalDashboard() {
  const { user, member } = useAuth();
  const { toast } = useToast();
  const { data: posts, loading: postsLoading } = usePosts();
  const { data: events, loading: eventsLoading } = usePortalEvents();
  const { data: serviceHours } = useServiceHours(member?.id ?? null);
  const { data: myRsvps } = useMemberRsvps(member?.id ?? null);
  const { status: duesStatus } = useDues();
  const { isMemberComplete, isAdminComplete, isActive: tutorialActive } = useTutorial();
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

  // Phase 2: onboarding / profile completion
  const hasRsvp = (myRsvps?.length ?? 0) > 0;
  const isNewMember = member
    ? (Date.now() - new Date(member.joinedAt).getTime()) < 30 * 24 * 60 * 60 * 1000
    : false;
  const showOnboarding = isNewMember && !member?.onboardingComplete;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const firstName = member?.firstName || member?.displayName?.split(' ')[0] || 'Member';
  const dateLine = `${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} — here's your community at a glance.`;
  const duesPaid = duesStatus === 'PAID' || duesStatus === 'PAID_OFFLINE' || duesStatus === 'WAIVED';

  return (
    <>
    <div className="space-y-8 page-enter">

      {/* ═══════ MOBILE VIEW TABS (sm:hidden) ═══════ */}
      <div className="sm:hidden">
        <div role="tablist" aria-orientation="horizontal" className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
          {(['overview', 'feed', 'widgets'] as const).map((view) => (
            <button
              key={view}
              role="tab"
              aria-selected={mobileView === view}
              onClick={() => setMobileView(view)}
              className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 capitalize ${
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

      {/* ═══════ HEADER + STAT STRIP ═══════ */}
      {/* On mobile: only show in overview tab. On sm+: always show */}
      <section className={mobileView !== 'overview' ? 'hidden sm:block' : ''}>
        <PageHeader
          eyebrow="Portal"
          title={`${greeting}, ${firstName}`}
          subtitle={dateLine}
        />

        <div className="mt-6 grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">Service hours this year</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-gray-900 dark:text-white">{totalHours}</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">Upcoming events</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-gray-900 dark:text-white">{upcomingEvents.length}</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">Dues</p>
            <div className="mt-2">
              <Badge variant={duesPaid ? 'green' : 'red'}>{duesPaid ? 'Paid' : 'Unpaid'}</Badge>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ PHASE 2: ONBOARDING / PROFILE COMPLETION ═══════ */}
      {member && showOnboarding && (
        <OnboardingChecklist member={member} duesStatus={duesStatus} hasRsvp={hasRsvp} />
      )}
      {member && !showOnboarding && (
        <ProfileCompletionCard member={member} />
      )}

      {/* ═══════ QUICK ACTIONS ═══════ */}
      {/* On mobile: only show in overview tab. On sm+: always show */}
      <section className={mobileView !== 'overview' ? 'hidden sm:block' : ''}>
        <SectionHeader title="Quick actions" />
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="grid sm:grid-cols-2 gap-1">
            {quickActions.filter((action) => !action.roles || (member?.role && action.roles.includes(member.role))).map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <span className="w-4 h-4 shrink-0 text-gray-500">{action.icon}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{action.label}</span>
                <span className="text-xs text-gray-500 truncate">{action.description}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ MAIN GRID ═══════ */}
      <div className="grid lg:grid-cols-12 gap-6 lg:items-start">

        {/* ── LEFT: Feed ── */}
        {/* On mobile: only show in feed tab. On lg+: always show */}
        <div className={`lg:col-span-7 xl:col-span-8 space-y-5 ${mobileView !== 'feed' ? 'hidden sm:block' : ''}`}>
          {/* Composer trigger card */}
          <div
            onClick={() => setShowComposer(true)}
            className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 cursor-pointer transition-colors"
          >
            <Avatar src={member?.photoURL} alt={member?.displayName || ''} size="md" />
            <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-4 py-2.5">
              <p className="text-sm text-gray-400 dark:text-gray-500">Share an update with the community…</p>
            </div>
          </div>

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
              icon={<svg aria-hidden="true" className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
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
                    <div className="mt-2 ml-0 sm:ml-14 flex gap-2 animate-slide-up">
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
        <aside className={`lg:col-span-5 xl:col-span-4 space-y-5 lg:sticky lg:top-24 lg:self-start ${mobileView !== 'widgets' ? 'hidden lg:block' : ''}`}>

          {/* Service Hours Progress */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Service progress</h3>
                <p className="text-xs text-gray-500 mt-0.5">Annual goal: <span className="tabular-nums">{SERVICE_HOURS_GOAL}</span>h</p>
              </div>
              <Link href="/portal/service-hours" className="text-xs font-medium text-cranberry hover:text-cranberry-800 dark:text-cranberry-400 dark:hover:text-cranberry-300 transition-colors">
                View all
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
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
                <p className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white tabular-nums">{SERVICE_HOURS_GOAL - totalHours > 0 ? SERVICE_HOURS_GOAL - totalHours : 0}</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">Remaining</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
                <p className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white tabular-nums">{Math.round((totalHours / SERVICE_HOURS_GOAL) * 100)}%</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">Complete</p>
              </div>
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Upcoming events
                {upcomingEvents.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-gray-400 tabular-nums">{upcomingEvents.length}</span>
                )}
              </h3>
              <Link href="/portal/events" className="text-xs font-medium text-cranberry hover:text-cranberry-800 dark:text-cranberry-400 dark:hover:text-cranberry-300 transition-colors">
                View all
              </Link>
            </div>

            {eventsLoading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : upcomingEvents.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-11 h-11 mx-auto mb-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center">
                  <CalendarIcon />
                </div>
                <p className="text-sm font-medium text-gray-500">No upcoming events</p>
                <p className="text-xs text-gray-500 mt-1">Check back soon!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {upcomingEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/portal/events/${event.id}`}
                    className="group flex items-center gap-3 py-3"
                  >
                    {/* Date badge */}
                    <div className="rounded-lg bg-gray-100 dark:bg-gray-800 w-11 h-11 flex flex-col items-center justify-center shrink-0 tabular-nums">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 leading-none">
                        {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                      </p>
                      <p className="text-base font-semibold text-gray-900 dark:text-white leading-tight tabular-nums">
                        {new Date(event.date).getDate()}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-cranberry dark:group-hover:text-cranberry-400 transition-colors truncate">
                        {event.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {event.time} · {event.location?.split(',')[0]}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>

    {/* PostComposerModal must live outside page-enter (which uses transform via
        its animation) so that the Modal's position:fixed overlay is relative
        to the viewport rather than the transformed ancestor. */}
    <PostComposerModal
      open={showComposer}
      onClose={() => setShowComposer(false)}
      onSubmit={handlePost}
    />

    {/* Tutorial Launchers — shown once per track */}
    {!tutorialActive && !isMemberComplete && (
      <TutorialLauncher track="member" />
    )}
    {!tutorialActive && isMemberComplete && !isAdminComplete && isBoardMember && (
      <TutorialLauncher track="admin" />
    )}
    </>
  );
}
