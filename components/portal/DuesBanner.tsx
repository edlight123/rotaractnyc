'use client';

import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { SITE } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils/format';
import type { DuesPaymentStatus } from '@/types';

interface DuesBannerProps {
  status: DuesPaymentStatus;
  cycleName?: string;
  className?: string;
}

export default function DuesBanner({ status, cycleName = '2025-2026', className }: DuesBannerProps) {
  if (status === 'PAID' || status === 'PAID_OFFLINE' || status === 'WAIVED') return null;

  return (
    <div className={`bg-gold-50 dark:bg-gold-900/20 border border-gold-200 dark:border-gold-800 rounded-xl p-4 flex items-center justify-between gap-4 ${className || ''}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gold-100 dark:bg-gold-800/30 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-gold-600 dark:text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Dues Unpaid — {cycleName}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Please pay your annual dues ({formatCurrency(SITE.dues.professional)} professional / {formatCurrency(SITE.dues.student)} student) to maintain active status.
          </p>
        </div>
      </div>
      <Link href="/portal/dues">
        <Button size="sm" variant="gold">Pay Now</Button>
      </Link>
    </div>
  );
}
