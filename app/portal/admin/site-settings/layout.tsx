import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Site Settings — Rotaract Portal' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
