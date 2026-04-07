'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/auth';
import { apiGet } from '@/hooks/useFirestore';
import { useToast } from '@/components/ui/Toast';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import ProgressRing from '@/components/ui/ProgressRing';

// ─── Types ──────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  memberId: string;
  memberName: string;
  memberPhoto?: string;
  hours: number;
  rank: number;
}

interface MonthlyTrend {
  month: string;
  hours: number;
}

interface EventBreakdown {
  eventTitle: string;
  totalHours: number;
  participantCount: number;
}

interface AnalyticsData {
  summary: {
    totalApproved: number;
    totalPending: number;
    avgPerMember: number;
    membersAtGoal: number;
    totalMembers: number;
  };
  leaderboard: LeaderboardEntry[];
  monthlyTrend: MonthlyTrend[];
  byEvent: EventBreakdown[];
  myStats?: {
    totalApproved: number;
    totalPending: number;
    rank: number;
    percentile: number;
    goal: number;
    progress: number;
  };
}

// ─── Icons ──────────────────────────────────────────────────────────────────

function ChartIcon() {
  return (
    <svg aria-hidden="true" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg aria-hidden="true" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-3.77 1.522m0 0a6.003 6.003 0 01-3.77-1.522" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className ?? ''}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* My Progress skeleton */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-6">
          <SkeletonBlock className="h-28 w-28 rounded-full" />
          <div className="flex-1 space-y-3">
            <SkeletonBlock className="h-5 w-40" />
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="h-4 w-24" />
          </div>
        </div>
      </div>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
            <SkeletonBlock className="h-3 w-20 mb-3" />
            <SkeletonBlock className="h-8 w-16 mb-2" />
            <SkeletonBlock className="h-3 w-14" />
          </div>
        ))}
      </div>

      {/* Leaderboard skeleton */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
        <SkeletonBlock className="h-5 w-32 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <SkeletonBlock className="h-10 w-10 rounded-full" />
              <SkeletonBlock className="h-4 w-32" />
              <div className="flex-1" />
              <SkeletonBlock className="h-4 w-12" />
            </div>
          ))}
        </div>
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 h-72">
          <SkeletonBlock className="h-5 w-32 mb-4" />
          <SkeletonBlock className="h-48 w-full rounded-xl" />
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 h-72">
          <SkeletonBlock className="h-5 w-40 mb-4" />
          <SkeletonBlock className="h-48 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ─── Monthly Trend Bar Chart (SVG) ─────────────────────────────────────────

function MonthlyTrendChart({ data }: { data: MonthlyTrend[] }) {
  const maxHours = Math.max(...data.map((d) => d.hours), 1);
  const barWidth = 40;
  const gap = 12;
  const chartHeight = 180;
  const chartWidth = data.length * (barWidth + gap) - gap;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${chartWidth + 20} ${chartHeight + 40}`}
        className="w-full min-w-[500px]"
        role="img"
        aria-label="Monthly service hours trend"
      >
        {data.map((d, i) => {
          const barHeight = maxHours > 0 ? (d.hours / maxHours) * chartHeight : 0;
          const x = i * (barWidth + gap) + 10;
          const y = chartHeight - barHeight;

          return (
            <g key={d.month}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={4}
                className="fill-cranberry transition-all duration-500"
                opacity={0.85}
              />
              {/* Value on top */}
              {d.hours > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 6}
                  textAnchor="middle"
                  className="fill-gray-600 dark:fill-gray-400"
                  fontSize={11}
                  fontWeight={600}
                >
                  {d.hours}
                </text>
              )}
              {/* Month label */}
              <text
                x={x + barWidth / 2}
                y={chartHeight + 16}
                textAnchor="middle"
                className="fill-gray-500 dark:fill-gray-400"
                fontSize={10}
              >
                {d.month.split(' ')[0]}
              </text>
              {/* Year label (only show for Jan or first item) */}
              {(d.month.startsWith('Jan') || i === 0) && (
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 30}
                  textAnchor="middle"
                  className="fill-gray-400 dark:fill-gray-500"
                  fontSize={9}
                >
                  {d.month.split(' ')[1]}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function ServiceHoursAnalyticsPage() {
  const { user, member } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !member) return;

    apiGet<AnalyticsData>('/api/portal/service-hours/analytics')
      .then(setData)
      .catch((err) => {
        console.error('Failed to load analytics:', err);
        toast('Failed to load analytics', 'error');
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, member]);

  const maxLeaderboardHours = data?.leaderboard?.[0]?.hours || 1;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/portal/service-hours"
          className="p-2 -ml-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
          aria-label="Back to Service Hours"
        >
          <ArrowLeftIcon />
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
            Service Hours Analytics
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Club-wide performance, leaderboard, and trends
          </p>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : !data ? (
        <div className="text-center py-20 text-gray-500 dark:text-gray-400">
          <p>Unable to load analytics data.</p>
        </div>
      ) : (
        <>
          {/* ── My Progress Card ─────────────────────────────────────── */}
          {data.myStats && (
            <section
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800"
              aria-labelledby="my-progress-title"
            >
              <h2 id="my-progress-title" className="text-lg font-display font-bold text-gray-900 dark:text-white mb-4">
                My Progress
              </h2>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ProgressRing
                  value={data.myStats.totalApproved}
                  max={data.myStats.goal}
                  size={120}
                  strokeWidth={10}
                  color={data.myStats.progress >= 100 ? 'emerald' : 'cranberry'}
                  label={`${data.myStats.totalApproved} of ${data.myStats.goal} hours`}
                  sublabel="goal"
                />
                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <Badge variant={data.myStats.progress >= 100 ? 'green' : 'cranberry'}>
                      {data.myStats.progress >= 100 ? '🎉 Goal Met!' : `${data.myStats.progress}% complete`}
                    </Badge>
                    {data.myStats.totalPending > 0 && (
                      <Badge variant="gold">
                        {data.myStats.totalPending}h pending
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    You&apos;re <span className="font-bold text-gray-900 dark:text-white">#{data.myStats.rank}</span> of {data.summary.totalMembers} members
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Top <span className="font-bold text-cranberry dark:text-cranberry-300">{data.myStats.percentile}%</span> of all members
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* ── Summary Cards ────────────────────────────────────────── */}
          <section aria-label="Summary statistics">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard
                label="Total Approved Hours"
                value={data.summary.totalApproved.toLocaleString()}
                sublabel="club-wide"
                accentClass="text-cranberry"
              />
              <SummaryCard
                label="Average Per Member"
                value={data.summary.avgPerMember.toString()}
                sublabel="hours"
                accentClass="text-azure-600"
              />
              <SummaryCard
                label="Members at Goal"
                value={`${data.summary.membersAtGoal} / ${data.summary.totalMembers}`}
                sublabel={`≥${40} hours`}
                accentClass="text-emerald-600"
              />
              <SummaryCard
                label="Pending Hours"
                value={data.summary.totalPending.toLocaleString()}
                sublabel="awaiting review"
                accentClass="text-gold-600"
              />
            </div>
          </section>

          {/* ── Leaderboard ──────────────────────────────────────────── */}
          <section
            className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800"
            aria-labelledby="leaderboard-title"
          >
            <div className="flex items-center gap-2 mb-4">
              <TrophyIcon />
              <h2 id="leaderboard-title" className="text-lg font-display font-bold text-gray-900 dark:text-white">
                Leaderboard
              </h2>
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">Top 20</span>
            </div>

            {data.leaderboard.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                No approved hours yet.
              </p>
            ) : (
              <div className="space-y-2">
                {data.leaderboard.map((entry) => {
                  const isMe = entry.memberId === member?.id;
                  const barPct = Math.max(4, (entry.hours / maxLeaderboardHours) * 100);

                  return (
                    <div
                      key={entry.memberId}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                        isMe
                          ? 'bg-cranberry-50 dark:bg-cranberry-900/20 ring-1 ring-cranberry-200 dark:ring-cranberry-800'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      {/* Rank */}
                      <span className={`w-7 text-center text-sm font-bold tabular-nums ${
                        entry.rank <= 3
                          ? 'text-cranberry dark:text-cranberry-300'
                          : 'text-gray-400 dark:text-gray-500'
                      }`}>
                        {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
                      </span>

                      {/* Avatar */}
                      <Avatar
                        src={entry.memberPhoto}
                        alt={entry.memberName}
                        size="sm"
                      />

                      {/* Name + bar */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          isMe
                            ? 'text-cranberry-700 dark:text-cranberry-300'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {entry.memberName}
                          {isMe && <span className="text-xs ml-1.5 opacity-60">(you)</span>}
                        </p>
                        {/* Hours bar */}
                        <div className="mt-1 h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ease-out ${
                              isMe
                                ? 'bg-cranberry'
                                : 'bg-cranberry/50 dark:bg-cranberry/40'
                            }`}
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Hours */}
                      <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-white whitespace-nowrap">
                        {entry.hours}h
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Monthly Trend + Top Events ───────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Trend */}
            <section
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800"
              aria-labelledby="monthly-trend-title"
            >
              <div className="flex items-center gap-2 mb-4">
                <ChartIcon />
                <h2 id="monthly-trend-title" className="text-lg font-display font-bold text-gray-900 dark:text-white">
                  Monthly Trend
                </h2>
              </div>
              {data.monthlyTrend.every((m) => m.hours === 0) ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-10 text-center">
                  No data for the last 12 months.
                </p>
              ) : (
                <MonthlyTrendChart data={data.monthlyTrend} />
              )}
            </section>

            {/* Top Events */}
            <section
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800"
              aria-labelledby="top-events-title"
            >
              <h2 id="top-events-title" className="text-lg font-display font-bold text-gray-900 dark:text-white mb-4">
                Top Events by Hours
              </h2>
              {data.byEvent.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-10 text-center">
                  No event data yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.byEvent.map((ev, i) => {
                    const maxEventHours = data.byEvent[0]?.totalHours || 1;
                    const pct = Math.max(6, (ev.totalHours / maxEventHours) * 100);

                    return (
                      <div key={`${ev.eventTitle}-${i}`}>
                        <div className="flex items-baseline justify-between mb-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate pr-3">
                            {ev.eventTitle}
                          </p>
                          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {ev.totalHours}h · {ev.participantCount} {ev.participantCount === 1 ? 'member' : 'members'}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-azure-500 dark:bg-azure-400 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Summary Card Component ─────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sublabel,
  accentClass = 'text-gray-900 dark:text-white',
}: {
  label: string;
  value: string;
  sublabel?: string;
  accentClass?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className={`text-2xl font-display font-bold tabular-nums ${accentClass}`}>
        {value}
      </p>
      {sublabel && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sublabel}</p>
      )}
    </div>
  );
}
