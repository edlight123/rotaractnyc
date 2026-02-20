'use client';

import { useState, useCallback, useRef } from 'react';
import { useDrag } from '@use-gesture/react';

interface UsePullToRefreshOptions {
  /** Distance in px before refresh triggers (default: 120) */
  threshold?: number;
  /** Async function to call on refresh */
  onRefresh: () => Promise<void> | void;
  /** Disable the gesture */
  disabled?: boolean;
}

interface UsePullToRefreshReturn {
  /** Bind this to the scrollable container via {...bind()} */
  bind: ReturnType<typeof useDrag>;
  /** Whether a refresh is currently in progress */
  isRefreshing: boolean;
  /** Current pull distance (0 when idle/refreshing) */
  pullDistance: number;
  /** Inline style for the pull indicator wrapper */
  indicatorStyle: React.CSSProperties;
}

/**
 * Pull-to-refresh gesture hook.
 *
 * Only activates when the container is scrolled to the top (scrollTop === 0).
 * Dragging down past the threshold triggers the onRefresh callback and shows
 * a spinner until the promise resolves.
 *
 * Usage:
 * ```tsx
 * const { bind, isRefreshing, pullDistance, indicatorStyle } = usePullToRefresh({
 *   onRefresh: () => mutate(),
 * });
 * return (
 *   <div {...bind()} style={{ touchAction: 'pan-x' }}>
 *     <div style={indicatorStyle} className="flex justify-center">
 *       {pullDistance > 0 || isRefreshing ? <Spinner /> : null}
 *     </div>
 *     ...content...
 *   </div>
 * );
 * ```
 */
export function usePullToRefresh({
  threshold = 120,
  onRefresh,
  disabled = false,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLElement | null>(null);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setPullDistance(0);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  const bind = useDrag(
    ({ down, movement: [, my], cancel, event }) => {
      if (disabled || isRefreshing) {
        cancel();
        return;
      }

      // Find the nearest scrollable parent, fall back to window scroll
      const el = event?.target as HTMLElement | null;
      const scrollParent = el?.closest('[data-pull-scroll]') as HTMLElement | null;
      const scrollTop = scrollParent ? scrollParent.scrollTop : (typeof window !== 'undefined' ? window.scrollY : 0);

      // Only allow pull when scrolled to top
      if (scrollTop > 0) {
        cancel();
        return;
      }

      // Dampen the pull distance (rubber-band feel)
      const damped = Math.max(0, my * 0.5);

      if (down) {
        setPullDistance(Math.min(damped, threshold * 1.3));
      } else {
        if (damped >= threshold) {
          handleRefresh();
        } else {
          setPullDistance(0);
        }
      }
    },
    {
      axis: 'y',
      filterTaps: true,
    },
  );

  const indicatorStyle: React.CSSProperties = {
    height: isRefreshing ? 48 : pullDistance,
    overflow: 'hidden',
    transition: pullDistance === 0 && !isRefreshing ? 'height 0.25s ease-out' : isRefreshing ? 'none' : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return { bind, isRefreshing, pullDistance, indicatorStyle };
}
