import { useState, useEffect } from 'react';
import type { ActivityType } from '@/lib/admin/activities';

export interface Activity {
  id: string;
  type: ActivityType;
  action: string;
  title: string;
  description: string;
  createdAt: string;
  userName?: string;
  userEmail?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

interface UseActivitiesOptions {
  limit?: number;
  type?: ActivityType | '';
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseActivitiesReturn {
  activities: Activity[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch and manage activities
 * 
 * @example
 * ```tsx
 * const { activities, loading, refresh } = useActivities({ limit: 10, type: 'member' })
 * ```
 */
export function useActivities(options: UseActivitiesOptions = {}): UseActivitiesReturn {
  const {
    limit = 20,
    type = '',
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds
  } = options;

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ limit: limit.toString() });
      if (type) params.append('type', type);

      const response = await fetch(`/api/admin/activities?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch activities: ${response.statusText}`);
      }

      const data = await response.json();
      setActivities(data.activities || []);
      setHasMore(data.hasMore || false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [limit, type]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchActivities, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, limit, type]);

  return {
    activities,
    loading,
    error,
    hasMore,
    refresh: fetchActivities,
  };
}
