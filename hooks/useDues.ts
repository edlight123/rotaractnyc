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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!member?.id) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const data = await apiGet('/api/portal/dues');
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

  return { status, cycleName, amount, loading };
}
