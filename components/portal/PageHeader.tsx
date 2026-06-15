import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  /** Page title — rendered as the single standardized portal H1. */
  title: ReactNode;
  /** Optional supporting line beneath the title. */
  subtitle?: ReactNode;
  /** Right-aligned actions (buttons, menus). */
  actions?: ReactNode;
  /** Render a back link above the title (detail pages). */
  backHref?: string;
  /** Or a back handler (e.g. router.back()). */
  onBack?: () => void;
  backLabel?: string;
  /** Optional leading icon shown beside the title. */
  icon?: ReactNode;
  className?: string;
}

/**
 * PageHeader — the one header pattern for every portal page.
 *
 * Standardizes the H1 to `text-2xl font-display font-bold` (see DESIGN.md §3)
 * so headers stop drifting in size/weight/color across the portal.
 */
export default function PageHeader({
  title,
  subtitle,
  actions,
  backHref,
  onBack,
  backLabel = 'Back',
  icon,
  className,
}: PageHeaderProps) {
  const showBack = Boolean(backHref || onBack);

  return (
    <div className={cn('space-y-3', className)}>
      {showBack &&
        (backHref ? (
          <Link
            href={backHref}
            className="group inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-cranberry dark:text-gray-400 dark:hover:text-cranberry-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            {backLabel}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onBack}
            className="group inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-cranberry dark:text-gray-400 dark:hover:text-cranberry-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            {backLabel}
          </button>
        ))}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          {icon && (
            <div className="shrink-0 mt-0.5 w-10 h-10 rounded-xl bg-cranberry-50 dark:bg-cranberry-900/20 text-cranberry dark:text-cranberry-400 flex items-center justify-center">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-display font-bold tracking-tight text-gray-900 dark:text-white">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
