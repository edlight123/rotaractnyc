import type { Metadata } from 'next';
import { generateMeta } from '@/lib/seo';

export const metadata: Metadata = generateMeta({
  title: 'Donate',
  description:
    'Support Rotaract NYC\'s community service projects with a tax-deductible donation. 100% goes directly to our project funds.',
  path: '/donate',
});

export default function DonateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
