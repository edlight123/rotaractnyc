import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Email Broadcasts — Rotaract Portal',
  description: 'Send email broadcasts to club members.',
};

export default function BroadcastsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
