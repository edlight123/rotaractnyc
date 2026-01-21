'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getActiveDuesCycle,
  getMemberDues,
} from '@/lib/firebase/duesCycles';
import type { DuesCycle, MemberDues } from '@/types/dues';

interface DuesBannerProps {
  memberId: string;
}

export default function DuesBanner({ memberId }: DuesBannerProps) {
  const router = useRouter();
  const [activeCycle, setActiveCycle] = useState<DuesCycle | null>(null);
  const [memberDues, setMemberDues] = useState<MemberDues | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    loadDuesStatus();
  }, [memberId]);

  async function loadDuesStatus() {
    try {
      setLoading(true);
      setError(null);

      // Get active cycle
      const cycle = await getActiveDuesCycle();
      if (!cycle) {
        setLoading(false);
        return;
      }

      setActiveCycle(cycle);

      // Get member dues for active cycle
      const dues = await getMemberDues(memberId, cycle.id);
      setMemberDues(dues);
    } catch (err: any) {
      console.error('Error loading dues status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePayNow() {
    if (!activeCycle) return;

    try {
      setPaymentLoading(true);
      setError(null);

      // Call checkout API to create Stripe session
      const response = await fetch('/api/stripe/checkout/dues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          cycleId: activeCycle.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      console.error('Error creating checkout session:', err);
      setError(err.message);
      setPaymentLoading(false);
    }
  }

  // Don't show banner if loading or no active cycle
  if (loading || !activeCycle) {
    return null;
  }

  // Don't show banner if dues are already paid, paid offline, or waived
  if (
    memberDues &&
    ['PAID', 'PAID_OFFLINE', 'WAIVED'].includes(memberDues.status)
  ) {
    return null;
  }

  // Calculate days until due
  const today = new Date();
  const endDate = activeCycle.endDate instanceof Date 
    ? activeCycle.endDate 
    : activeCycle.endDate.toDate();
  const daysUntilDue = Math.ceil(
    (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Determine urgency level
  const isOverdue = daysUntilDue < 0;
  const isUrgent = daysUntilDue >= 0 && daysUntilDue <= 30;

  return (
    <div
      className={`border-l-4 p-4 mb-6 ${
        isOverdue
          ? 'bg-red-50 border-red-500'
          : isUrgent
          ? 'bg-yellow-50 border-yellow-500'
          : 'bg-blue-50 border-blue-500'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3
            className={`text-lg font-semibold mb-1 ${
              isOverdue
                ? 'text-red-800'
                : isUrgent
                ? 'text-yellow-800'
                : 'text-blue-800'
            }`}
          >
            {isOverdue
              ? '⚠️ Dues Payment Overdue'
              : isUrgent
              ? '⏰ Dues Payment Due Soon'
              : '📋 Annual Dues Payment Required'}
          </h3>
          <p
            className={`text-sm mb-3 ${
              isOverdue
                ? 'text-red-700'
                : isUrgent
                ? 'text-yellow-700'
                : 'text-blue-700'
            }`}
          >
            {isOverdue ? (
              <>
                Your annual dues of <strong>${activeCycle.amount.toFixed(2)}</strong> for{' '}
                <strong>{activeCycle.id}</strong> were due on{' '}
                <strong>{endDate.toLocaleDateString()}</strong>. Please pay as soon
                as possible to maintain your membership.
              </>
            ) : (
              <>
                Your annual dues of <strong>${activeCycle.amount.toFixed(2)}</strong> for{' '}
                <strong>{activeCycle.id}</strong> are due by{' '}
                <strong>{endDate.toLocaleDateString()}</strong>{' '}
                {daysUntilDue > 0 && `(${daysUntilDue} days remaining)`}.
              </>
            )}
          </p>
          {error && (
            <p className="text-sm text-red-600 mb-2">
              Error: {error}
            </p>
          )}
        </div>
        <button
          onClick={handlePayNow}
          disabled={paymentLoading}
          className={`ml-4 px-6 py-2 rounded-lg font-medium transition-colors ${
            paymentLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : isOverdue
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : isUrgent
              ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {paymentLoading ? 'Processing...' : 'Pay Now'}
        </button>
      </div>
      <p className="text-xs mt-2 text-gray-600">
        Questions about dues? Contact the board at{' '}
        <a href="mailto:board@rotaractnewyork.org" className="underline">
          board@rotaractnewyork.org
        </a>
      </p>
    </div>
  );
}
