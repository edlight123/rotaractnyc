'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { apiGet } from '@/hooks/useFirestore';
import { useToast } from '@/components/ui/Toast';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import MiniLineChart from '@/components/portal/analytics/MiniLineChart';
import MiniBarChart from '@/components/portal/analytics/MiniBarChart';

// ─── Types ─────────────────────────────────────────────────────────────────

interface TopContributor {
  memberId: string;
  memberName: string;
  hours: number;
}

interface AnalyticsData {
  overview: {
    totalMembers: number;
    activeMembers: number;
    newMembersThisMonth: number;
    newMembersLastMonth: number;
    memberGrowthPercent: number;
  };
  dues: {
    totalPaid: number;
    totalUnpaid: number;
    collectionRate: number;
    totalRevenue: number;
  };
  events: {
    totalEventsThisYear: number;
    avgAttendance: number;
    totalRsvps: number;
    checkInRate: number;
  };
  serviceHours: {
    totalApprovedHours: number;
    avgHoursPerMember: number;
    topContributors: TopContributor[];
  };
  engagement: {
    profileCompletionRate: number;
    onboardingCompletionRate: number;
    postsThisMonth: number;
  };
  membershipTrend: { month: string; count: number }[];
  duesOverTime: { cycle: string; paid: number; total: number }[];
}

const ADMIN_ROLES = ['board', 'president', 'treasurer'];

// ─── Icons (Heroicons outline) ─────────────────────────────────────────────

function UsersIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}

function CurrencyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 9v9.75" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182M2.985 14.652" />
    </svg>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function collectionRateColor(rate: number): 'green' | 'gold' | 'red' {
  if (rate >= 80) return 'green';
  if (rate >= 50) return 'gold';
  return 'red';
}

// ─── Skeleton Components ──────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 animate-pulse">
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="h-3 w-16 bg-gray-100 dark:bg-gray-800 rounded" />
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton({ h = 'h-56' }: { h?: string }) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 animate-pulse ${h}`}>
      <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
      <div className="h-full w-full bg-gray-100 dark:bg-gray-800 rounded-xl" />
    </div>
  );
}

// ─── Progress Ring ────────────────────────────────────────────────────────

function ProgressRing({ value, label, color = '#9B1B30' }: { value: number; label: string; color?: string }) {
  const size = 96;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          className="text-gray-100 dark:text-gray-800"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="text-xl font-bold text-gray-900 dark:text-white -mt-[68px] mb-8">
        {Math.round(value)}%
      </span>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center font-medium">{label}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const { user, member } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (showToast = false) => {
    try {
      const result = await apiGet<AnalyticsData>('/api/portal/analytics');
      setData(result);
      if (showToast) toast('Dashboard refreshed', 'success');
    } catch (err) {
      console.error('Failed to load analytics:', err);
      toast('Failed to load analytics data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user && member && ADMIN_ROLES.includes(member.role)) {
      fetchData();
    } else if (member) {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, member]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  // ─── Guards ───

  if (!member || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!ADMIN_ROLES.includes(member.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Access Restricted</h2>
        <p className="text-gray-500 dark:text-gray-400">
          Only board members, the president, and the treasurer can view analytics.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <KpiSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  // ─── Derived values ───

  const { overview, dues, events, serviceHours, engagement, membershipTrend, duesOverTime } = data;

  const growthIsPositive = overview.memberGrowthPercent >= 0;
  const topContributors = serviceHours.topContributors.slice(0, 5);
  const maxContributorHours = topContributors.length > 0 ? Math.max(...topContributors.map((c) => c.hours)) : 1;

  return (
    <div className="space-y-8 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-display">
            Analytics Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Club performance at a glance
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleRefresh} loading={refreshing}>
          <RefreshIcon />
          Refresh
        </Button>
      </div>

      {/* Section 1: KPI Cards */}
      <section aria-label="Key performance indicators">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Members */}
          <KpiCard
            icon={<UsersIcon />}
            label="Total Members"
            value={overview.totalMembers}
            footer={
              <span className="flex items-center gap-1.5 text-xs">
                <Badge variant={growthIsPositive ? 'green' : 'red'}>
                  {growthIsPositive ? '↑' : '↓'} {Math.abs(overview.memberGrowthPercent).toFixed(1)}%
                </Badge>
                <span className="text-gray-400 dark:text-gray-500">vs last month</span>
              </span>
            }
          />

          {/* Dues Collection Rate */}
          <KpiCard
            icon={<CurrencyIcon />}
            label="Dues Collection"
            value={`${dues.collectionRate.toFixed(0)}%`}
            footer={
              <Badge variant={collectionRateColor(dues.collectionRate)}>
                {dues.totalPaid} paid / {dues.totalPaid + dues.totalUnpaid} total
              </Badge>
            }
          />

          {/* Avg Event Attendance */}
          <KpiCard
            icon={<CalendarIcon />}
            label="Avg Event Attendance"
            value={events.avgAttendance}
            footer={
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {events.totalEventsThisYear} events this year
              </span>
            }
          />

          {/* Service Hours */}
          <KpiCard
            icon={<ClockIcon />}
            label="Service Hours"
            value={serviceHours.totalApprovedHours.toLocaleString()}
            footer={
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {serviceHours.avgHoursPerMember.toFixed(1)} avg per member
              </span>
            }
          />
        </div>
      </section>

      {/* Section 2: Membership Growth */}
      <section aria-label="Membership growth chart">
        <SectionCard title="Membership Growth" subtitle="Last 12 months">
          <MiniLineChart
            data={membershipTrend.map((d) => ({ label: d.month, value: d.count }))}
            color="#9B1B30"
            height={240}
          />
        </SectionCard>
      </section>

      {/* Section 3: Dues Overview */}
      <section aria-label="Dues overview chart">
        <SectionCard title="Dues Overview" subtitle="Paid vs total by cycle">
          <MiniBarChart
            data={duesOverTime.map((d) => ({
              label: d.cycle,
              value: d.paid,
              max: d.total,
              color: '#10b981',
            }))}
          />
        </SectionCard>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 4: Top Service Contributors */}
        <section aria-label="Top service contributors">
          <SectionCard title="Top Service Contributors" subtitle="Hours logged (top 5)">
            {topContributors.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 py-4">No contributors yet</p>
            ) : (
              <div className="space-y-3">
                {topContributors.map((c, i) => (
                  <div key={c.memberId} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-5 text-right">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                          {c.memberName}
                        </span>
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 ml-2">
                          {c.hours} hrs
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cranberry rounded-full transition-all duration-500"
                          style={{ width: `${(c.hours / maxContributorHours) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </section>

        {/* Section 5: Engagement Metrics */}
        <section aria-label="Engagement metrics">
          <SectionCard title="Engagement Metrics" subtitle="Completion & check-in rates">
            <div className="grid grid-cols-3 gap-4 py-4">
              <ProgressRing
                value={engagement.profileCompletionRate}
                label="Profile Completion"
                color="#9B1B30"
              />
              <ProgressRing
                value={engagement.onboardingCompletionRate}
                label="Onboarding Completion"
                color="#EBC85B"
              />
              <ProgressRing
                value={events.checkInRate}
                label="Event Check-In"
                color="#005dAA"
              />
            </div>
          </SectionCard>
        </section>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  footer,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  footer?: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-3xl font-bold text-gray-900 dark:text-white font-display">{value}</p>
      {footer && <div>{footer}</div>}
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-sm text-gray-400 dark:text-gray-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
