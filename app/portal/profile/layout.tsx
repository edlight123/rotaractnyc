import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'My Profile — Rotaract Portal' };

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
