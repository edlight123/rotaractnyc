'use client';

import Link from 'next/link';
import Card from '@/components/ui/Card';
import StatCard from '@/components/ui/StatCard';
import type { RotaractEvent } from '@/types';

interface DashboardWidgetsProps {
  memberName: string;
  totalServiceHours: number;
  upcomingEvents: RotaractEvent[];
  duesStatus: string;
}

const quickActions = [
  { label: 'Log Service Hours', href: '/portal/service-hours', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  { label: 'View Events', href: '/portal/events', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
  { label: 'Member Directory', href: '/portal/directory', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
  { label: 'Pay Dues', href: '/portal/dues', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> },
];

export default function DashboardWidgets({
  memberName,
  totalServiceHours,
  upcomingEvents,
  duesStatus,
}: DashboardWidgetsProps) {
  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card padding="md">
        <h3 className="font-display font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-cranberry-50 dark:hover:bg-cranberry-900/10 hover:text-cranberry transition-colors text-center group"
            >
              <span className="text-gray-400 group-hover:text-cranberry transition-colors">{action.icon}</span>
              <span className="text-xs font-medium">{action.label}</span>
            </Link>
          ))}
        </div>
      </Card>

      {/* Upcoming Events */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-gray-900 dark:text-white">Upcoming Events</h3>
          <Link href="/portal/events" className="text-xs text-cranberry hover:text-cranberry-800 font-medium">
            View all
          </Link>
        </div>
        {upcomingEvents.length === 0 ? (
          <p className="text-sm text-gray-400">No upcoming events.</p>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.slice(0, 3).map((event) => (
              <div key={event.id} className="flex gap-3 items-start">
                <div className="text-center bg-cranberry-50 dark:bg-cranberry-900/20 rounded-lg px-2.5 py-1.5 shrink-0">
                  <p className="text-xs text-cranberry font-bold">
                    {new Date(event.date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                  </p>
                  <p className="text-lg font-bold text-cranberry-800 dark:text-cranberry-300">
                    {new Date(event.date).getDate()}
                  </p>
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

      {/* Stats */}
      <StatCard
        label="Service Hours"
        value={totalServiceHours}
        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
      />
    </div>
  );
}
