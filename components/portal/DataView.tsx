'use client';

import { LayoutGrid, List, Table2, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { ReactNode } from 'react';

export type ViewMode = 'grid' | 'list' | 'table' | 'calendar';

const VIEW_META: Record<ViewMode, { label: string; icon: ReactNode }> = {
  grid: { label: 'Grid view', icon: <LayoutGrid className="w-4 h-4" /> },
  list: { label: 'List view', icon: <List className="w-4 h-4" /> },
  table: { label: 'Table view', icon: <Table2 className="w-4 h-4" /> },
  calendar: { label: 'Calendar view', icon: <CalendarDays className="w-4 h-4" /> },
};

interface ViewToggleProps {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
  /** Which modes to offer, in order. */
  views: ViewMode[];
  className?: string;
}

/** Segmented icon control for switching collection view modes. */
export function ViewToggle({ value, onChange, views, className }: ViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="Change view"
      className={cn('flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl shrink-0', className)}
    >
      {views.map((v) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            aria-pressed={active}
            title={VIEW_META[v].label}
            className={cn(
              'p-2 rounded-lg transition-colors',
              active
                ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
            )}
          >
            <span aria-hidden="true">{VIEW_META[v].icon}</span>
            <span className="sr-only">{VIEW_META[v].label}</span>
          </button>
        );
      })}
    </div>
  );
}

interface DataViewProps {
  loading: boolean;
  isEmpty: boolean;
  /** Skeleton shown while loading (should mirror the final layout). */
  skeleton: ReactNode;
  /** Empty-state shown when there are no results. */
  empty: ReactNode;
  /** The active view's content. */
  children: ReactNode;
  /** Total result count — renders a "Showing N items" footer when provided. */
  count?: number;
  /** Singular item label, e.g. "member" → "Showing 12 members". */
  itemLabel?: string;
  className?: string;
}

/**
 * DataView — orchestrates the content region of a collection page:
 * loading → skeleton, empty → empty-state, else → content + result count.
 * Pairs with <ViewToggle> (placed in the FilterBar) for a consistent
 * grid/list/table/calendar experience across the portal.
 */
export default function DataView({
  loading,
  isEmpty,
  skeleton,
  empty,
  children,
  count,
  itemLabel = 'item',
  className,
}: DataViewProps) {
  if (loading) return <div className={className}>{skeleton}</div>;
  if (isEmpty) return <div className={className}>{empty}</div>;

  return (
    <div className={cn('space-y-4', className)}>
      {children}
      {count !== undefined && (
        <p className="text-center text-sm text-gray-400 dark:text-gray-500 pt-1">
          Showing {count} {itemLabel}
          {count !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
