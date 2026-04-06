import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Articles — Rotaract Portal' };

export default function ArticlesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
