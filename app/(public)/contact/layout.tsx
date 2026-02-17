import type { Metadata } from 'next';
import { generateMeta } from '@/lib/seo';

export const metadata: Metadata = generateMeta({
  title: 'Contact',
  description:
    'Get in touch with Rotaract NYC — send us a message, find our address, or connect on social media.',
  path: '/contact',
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
