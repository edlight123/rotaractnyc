import { cn } from '@/lib/utils/cn';
import type { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  /**
   * Content width (see DESIGN.md §5):
   *  - `narrow`  → max-w-3xl  (focused detail / forms)
   *  - `default` → max-w-5xl  (standard index & detail pages — matches shell banners)
   *  - `wide`    → max-w-7xl  (dense dashboards / data tables)
   */
  width?: 'narrow' | 'default' | 'wide';
  /** Apply the page-enter animation (default true). */
  animate?: boolean;
  className?: string;
}

const widths = {
  narrow: 'max-w-3xl',
  default: 'max-w-5xl',
  wide: 'max-w-7xl',
};

/**
 * PageContainer — standard portal page wrapper.
 *
 * Centralizes max-width, vertical rhythm (`space-y-8`) and the page-enter
 * transition so pages stop drifting in width and spacing.
 */
export default function PageContainer({
  children,
  width = 'default',
  animate = true,
  className,
}: PageContainerProps) {
  return (
    <div className={cn(widths[width], 'mx-auto space-y-8', animate && 'page-enter', className)}>
      {children}
    </div>
  );
}
