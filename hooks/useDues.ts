'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { apiGet } from '@/hooks/useFirestore';
import { getCurrentRotaryYear } from '@/lib/utils/rotaryYear';
import type { DuesPaymentStatus } from '@/types';

interface DuesInfo {
  status: DuesPaymentStatus;
  cycleName: string;
  amount: number;
  /** True only when an active dues cycle exists — no cycle means dues aren't collectable yet. */
  hasCycle: boolean;
  loading: boolean;
}

/**
 * Hook to fetch and track the current member's dues status.
 */
export function useDues(): DuesInfo {
  const { member } = useAuth();
  const [status, setStatus] = useState<DuesPaymentStatus>('UNPAID');
  const [cycleName, setCycleName] = useState(getCurrentRotaryYear());
  const [amount, setAmount] = useState(0);
  const [hasCycle, setHasCycle] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!member?.id) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const data = await apiGet('/api/portal/dues');
        setHasCycle(!!data?.cycle);
        if (data?.dues?.status) setStatus(data.dues.status);
        if (data?.cycle?.name) setCycleName(data.cycle.name);
        if (data?.dues?.amount) setAmount(data.dues.amount);
      } catch {
        // Default to UNPAID
      } finally {
        setLoading(false);
      }
    })();
  }, [member?.id]);

  return { status, cycleName, amount, hasCycle, loading };
}
