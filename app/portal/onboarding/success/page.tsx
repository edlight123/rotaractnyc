'use client';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Link from 'next/link';

export default function OnboardingSuccessPage() {
  return (
    <div className="max-w-lg mx-auto text-center space-y-6 py-12">
      <div className="w-20 h-20 rounded-full bg-cranberry-50 dark:bg-cranberry-900/20 flex items-center justify-center mx-auto">
        <svg className="w-10 h-10 text-cranberry" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
      </div>
      <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white">
        You&apos;re All Set!
      </h1>
      <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
        Your profile has been submitted for approval. A board member will review your application shortly. In the meantime, feel free to explore the portal.
      </p>

      <Card padding="md" className="text-left">
        <h3 className="font-display font-bold text-gray-900 dark:text-white mb-3">Next Steps</h3>
        <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-cranberry text-white text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
            <span>Your membership application will be reviewed by a board member</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-cranberry text-white text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
            <span>Once approved, you&apos;ll get full access to all portal features</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-cranberry text-white text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
            <span>Don&apos;t forget to pay your annual dues to maintain active status</span>
          </li>
        </ul>
      </Card>

      <div className="flex justify-center gap-3">
        <Link href="/portal">
          <Button>Go to Dashboard</Button>
        </Link>
        <Link href="/portal/events">
          <Button variant="secondary">Browse Events</Button>
        </Link>
      </div>
    </div>
  );
}
