import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Messages — Rotaract Portal' };

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
