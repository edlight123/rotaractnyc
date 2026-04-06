import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Member Directory — Rotaract Portal' };

export default function DirectoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
