'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { apiPost, apiGet } from '@/hooks/useFirestore';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { SITE } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils/format';
import type { DuesPaymentStatus } from '@/types';

export default function DuesPage() {
  const { member } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [selectedType, setSelectedType] = useState<'professional' | 'student'>('professional');
  const [duesStatus, setDuesStatus] = useState<DuesPaymentStatus>('UNPAID');
  const [cycleName, setCycleName] = useState('2025-2026');
  const [cycleAmounts, setCycleAmounts] = useState<{ professional: number; student: number }>({
    professional: SITE.dues.professional,
    student: SITE.dues.student,
  });

  // Fetch dues status
  useEffect(() => {
    if (!member?.id) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const data = await apiGet('/api/portal/dues');
        if (data?.dues?.status) setDuesStatus(data.dues.status);
        if (data?.cycle?.name) setCycleName(data.cycle.name);
        if (data?.cycle) {
          setCycleAmounts({
            professional: data.cycle.amountProfessional ?? SITE.dues.professional,
            student: data.cycle.amountStudent ?? SITE.dues.student,
          });
        }
      } catch {
        // Default to UNPAID — page renders fine with defaults
      } finally {
        setLoading(false);
      }
    })();
  }, [member?.id]);

  // Set selected type from member profile
  useEffect(() => {
    if (member?.memberType) setSelectedType(member.memberType);
  }, [member?.memberType]);

  const amount = selectedType === 'student' ? cycleAmounts.student : cycleAmounts.professional;

  const handlePay = async () => {
    setPaying(true);
    try {
      const { url } = await apiPost('/api/portal/dues', {
        memberType: selectedType,
      });
      if (url) {
        // Stripe checkout URL - redirect
        window.location.href = url;
      } else {
        toast('Dues recorded successfully!');
        setDuesStatus('PAID');
      }
    } catch (err: any) {
      toast(err.message || 'Payment failed', 'error');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 page-enter">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Annual Dues</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your membership dues for the current Rotary year.</p>
      </div>

      {/* Status Card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6 sm:p-8">
        <div className="text-center">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Rotary Year {cycleName}</p>
          <Badge
            variant={duesStatus === 'PAID' || duesStatus === 'PAID_OFFLINE' ? 'green' : duesStatus === 'WAIVED' ? 'azure' : 'red'}
            className="text-sm px-4 py-1.5"
          >
            {duesStatus === 'PAID' || duesStatus === 'PAID_OFFLINE' ? 'Paid' : duesStatus === 'WAIVED' ? 'Waived' : 'Unpaid'}
          </Badge>
        </div>

        {duesStatus === 'UNPAID' && (
          <div className="mt-8 space-y-6">
            {/* Single price card based on member profile */}
            <div className="relative p-6 rounded-2xl border-2 border-cranberry bg-cranberry-50/50 dark:bg-cranberry-900/10 shadow-sm text-center">
              <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-cranberry flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 capitalize">{selectedType} Membership</p>
              <p className="text-4xl font-display font-bold text-cranberry mt-2">{formatCurrency(amount)}</p>
              <p className="text-xs text-gray-500 mt-2">
                {selectedType === 'student' ? 'Student rate — valid student ID required' : 'Professional rate'}
              </p>
            </div>

            <Button size="lg" className="w-full" loading={paying} onClick={handlePay}>
              Pay {formatCurrency(amount)} via Stripe
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              Secure payment powered by Stripe. Includes Rotary International registration.
            </div>
          </div>
        )}

        {(duesStatus === 'PAID' || duesStatus === 'PAID_OFFLINE') && (
          <div className="mt-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
              <svg className="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your dues for {cycleName} have been paid. Thank you for your support.
            </p>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6">
        <h3 className="font-display font-bold text-gray-900 dark:text-white mb-3">About Annual Dues</h3>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li className="flex items-start gap-2"><span className="text-cranberry mt-0.5">•</span>The Rotary year runs July 1 – June 30</li>
          <li className="flex items-start gap-2"><span className="text-cranberry mt-0.5">•</span>Dues include Rotary International membership registration</li>
          <li className="flex items-start gap-2"><span className="text-cranberry mt-0.5">•</span>There is a 30-day grace period after the cycle ends</li>
          <li className="flex items-start gap-2"><span className="text-cranberry mt-0.5">•</span>Contact your treasurer for payment questions or alternative arrangements</li>
        </ul>
      </div>
    </div>
  );
}
