import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Service Hours Analytics — Rotaract Portal',
  description: 'View service hours analytics, leaderboard, and trends for the club.',
};

export default function ServiceHoursAnalyticsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
