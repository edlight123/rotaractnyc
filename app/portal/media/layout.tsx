import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Media Manager — Rotaract Portal' };

export default function MediaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
