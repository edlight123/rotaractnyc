import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Finance — Rotaract Portal' };

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
