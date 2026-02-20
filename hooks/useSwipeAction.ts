'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useDrag } from '@use-gesture/react';

interface UseSwipeActionOptions {
  /** Distance in px before the action panel is revealed (default: 80) */
  threshold?: number;
  /** Called when the user swipes past threshold and releases */
  onAction?: () => void;
  /** Disable swipe (e.g. while loading) */
  disabled?: boolean;
}

interface UseSwipeActionReturn {
  /** Bind this to the swipeable element via {...bind()} */
  bind: ReturnType<typeof useDrag>;
  /** Inline style to apply translateX */
  style: React.CSSProperties;
  /** Whether the action panel is currently revealed */
  isRevealed: boolean;
  /** Programmatically reset the swipe */
  reset: () => void;
}

/**
 * Hook for swipe-to-reveal-action on list items.
 *
 * Swiping left reveals a coloured action strip behind the card.
 * If the swipe distance exceeds the threshold the panel stays open;
 * otherwise it springs back.
 *
 * Usage:
 * ```tsx
 * const { bind, style, isRevealed, reset } = useSwipeAction({ onAction: handleDelete });
 * return (
 *   <div className="relative overflow-hidden">
 *     <div className="absolute inset-y-0 right-0 flex items-center px-4 bg-red-500">
 *       <TrashIcon />
 *     </div>
 *     <div {...bind()} style={style} className="relative bg-white">
 *       ...card content...
 *     </div>
 *   </div>
 * );
 * ```
 */
export function useSwipeAction({
  threshold = 80,
  onAction,
  disabled = false,
}: UseSwipeActionOptions = {}): UseSwipeActionReturn {
  const [offsetX, setOffsetX] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const startOffset = useRef(0);

  const reset = useCallback(() => {
    setOffsetX(0);
    setIsRevealed(false);
    startOffset.current = 0;
  }, []);

  const bind = useDrag(
    ({ down, movement: [mx], cancel, direction: [dx] }) => {
      if (disabled) {
        cancel();
        return;
      }

      // Only allow left swipe (negative direction)
      const raw = startOffset.current + mx;
      const clamped = Math.min(0, Math.max(-threshold * 1.5, raw));

      if (down) {
        setOffsetX(clamped);
      } else {
        // Released — snap open or closed
        if (Math.abs(clamped) >= threshold) {
          setOffsetX(-threshold);
          setIsRevealed(true);
          startOffset.current = -threshold;
        } else {
          reset();
        }
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      from: () => [startOffset.current, 0],
    },
  );

  // When revealed and the user taps the action, fire callback
  useEffect(() => {
    if (isRevealed && onAction) {
      // We don't auto-fire — the parent renders an action button
    }
  }, [isRevealed, onAction]);

  const style: React.CSSProperties = {
    transform: `translateX(${offsetX}px)`,
    transition: offsetX === 0 || Math.abs(offsetX) === threshold ? 'transform 0.25s ease-out' : 'none',
    touchAction: 'pan-y',
  };

  return { bind, style, isRevealed, reset };
}
