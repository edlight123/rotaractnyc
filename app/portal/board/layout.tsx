import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Board Manager — Rotaract Portal' };

export default function BoardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
