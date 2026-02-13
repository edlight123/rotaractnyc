'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { apiPost, apiGet } from '@/hooks/useFirestore';
import { useToast } from '@/components/ui/Toast';
import Card from '@/components/ui/Card';
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

  const amount = selectedType === 'student' ? SITE.dues.student : SITE.dues.professional;

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
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Annual Dues</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your membership dues for the current Rotary year.</p>
      </div>

      {/* Status Card */}
      <Card padding="lg">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Rotary Year {cycleName}</p>
          <Badge
            variant={duesStatus === 'PAID' || duesStatus === 'PAID_OFFLINE' ? 'green' : duesStatus === 'WAIVED' ? 'azure' : 'red'}
            className="text-sm px-4 py-1"
          >
            {duesStatus === 'PAID' || duesStatus === 'PAID_OFFLINE' ? '✓ Paid' : duesStatus === 'WAIVED' ? 'Waived' : 'Unpaid'}
          </Badge>
        </div>

        {duesStatus === 'UNPAID' && (
          <div className="mt-8 space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <button
                onClick={() => setSelectedType('professional')}
                className={`p-5 rounded-xl border-2 text-left transition-all ${selectedType === 'professional' ? 'border-cranberry bg-cranberry-50/50 dark:bg-cranberry-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-cranberry'}`}
              >
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Professional</p>
                <p className="text-3xl font-display font-bold text-cranberry mt-1">{formatCurrency(SITE.dues.professional)}</p>
                <p className="text-xs text-gray-500 mt-1">For working professionals</p>
              </button>
              <button
                onClick={() => setSelectedType('student')}
                className={`p-5 rounded-xl border-2 text-left transition-all ${selectedType === 'student' ? 'border-cranberry bg-cranberry-50/50 dark:bg-cranberry-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-cranberry'}`}
              >
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Student</p>
                <p className="text-3xl font-display font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(SITE.dues.student)}</p>
                <p className="text-xs text-gray-500 mt-1">Valid student ID required</p>
              </button>
            </div>

            <Button size="lg" className="w-full" loading={paying} onClick={handlePay}>
              Pay {formatCurrency(amount)} via Stripe
            </Button>

            <p className="text-xs text-gray-400 text-center">
              Secure payment powered by Stripe. Includes Rotary International registration.
            </p>
          </div>
        )}

        {(duesStatus === 'PAID' || duesStatus === 'PAID_OFFLINE') && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your dues for {cycleName} have been paid. Thank you! 🎉
            </p>
          </div>
        )}
      </Card>

      {/* Info */}
      <Card padding="md">
        <h3 className="font-display font-bold text-gray-900 dark:text-white mb-3">About Annual Dues</h3>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li className="flex items-start gap-2"><span className="text-cranberry mt-0.5">•</span>The Rotary year runs July 1 – June 30</li>
          <li className="flex items-start gap-2"><span className="text-cranberry mt-0.5">•</span>Dues include Rotary International membership registration</li>
          <li className="flex items-start gap-2"><span className="text-cranberry mt-0.5">•</span>There is a 30-day grace period after the cycle ends</li>
          <li className="flex items-start gap-2"><span className="text-cranberry mt-0.5">•</span>Contact your treasurer for payment questions or alternative arrangements</li>
        </ul>
      </Card>
    </div>
  );
}
