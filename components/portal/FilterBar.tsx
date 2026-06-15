'use client';

import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { ReactNode, SelectHTMLAttributes } from 'react';

/**
 * FilterBar — standard collection toolbar layout.
 *
 * Left side holds controls (search, tabs, selects); `trailing` is pushed to
 * the right (typically a <ViewToggle>). Wraps gracefully on small screens.
 */
interface FilterBarProps {
  children: ReactNode;
  trailing?: ReactNode;
  className?: string;
}

export default function FilterBar({ children, trailing, className }: FilterBarProps) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center', className)}>
      {children}
      {trailing && <div className="sm:ml-auto flex items-center gap-3">{trailing}</div>}
    </div>
  );
}

/* ── FilterSelect ─────────────────────────────────────────────────────────
   Compact native <select> styled to match the design system. The first
   option doubles as the "all" reset value. Native control keeps it fully
   accessible and robust on mobile. */
export interface FilterSelectOption {
  value: string;
  label: string;
}

interface FilterSelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  options: FilterSelectOption[];
  /** Accessible label (also used as the title). */
  label: string;
  /** Optional leading icon (e.g. ArrowDownUp for sort). */
  icon?: ReactNode;
  className?: string;
}

export function FilterSelect({
  value,
  onChange,
  options,
  label,
  icon,
  className,
  ...rest
}: FilterSelectProps) {
  const active = value !== options[0]?.value;
  return (
    <div className={cn('relative inline-flex items-center', className)}>
      {icon && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3 text-gray-400 dark:text-gray-500"
        >
          {icon}
        </span>
      )}
      <select
        aria-label={label}
        title={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'appearance-none rounded-lg border bg-white dark:bg-gray-900 text-sm py-2 pr-9 cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-cranberry-500/30 focus:border-cranberry-500 transition-colors',
          icon ? 'pl-9' : 'pl-3',
          active
            ? 'border-cranberry-300 text-cranberry-700 dark:border-cranberry-800 dark:text-cranberry-300 font-medium'
            : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300',
        )}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 w-4 h-4 text-gray-400"
      />
    </div>
  );
}

/* ── FilterChip + FilterChipRow ───────────────────────────────────────────
   Removable chips that summarize the active filters. */
interface FilterChipProps {
  children: ReactNode;
  onRemove: () => void;
}

export function FilterChip({ children, onRemove }: FilterChipProps) {
  return (
    <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium bg-cranberry-50 text-cranberry-700 dark:bg-cranberry-900/20 dark:text-cranberry-300 border border-cranberry-100 dark:border-cranberry-900/40">
      {children}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 p-0.5 rounded-full hover:bg-cranberry-100 dark:hover:bg-cranberry-900/40 transition-colors"
        aria-label="Remove filter"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

interface FilterChipRowProps {
  children: ReactNode;
  /** Shown after the chips when there is at least one active filter. */
  onClearAll?: () => void;
  className?: string;
}

export function FilterChipRow({ children, onClearAll, className }: FilterChipRowProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {children}
      {onClearAll && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs font-medium text-gray-500 hover:text-cranberry dark:text-gray-400 dark:hover:text-cranberry-400 underline-offset-2 hover:underline transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
