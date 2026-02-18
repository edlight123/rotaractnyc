import { cn } from '@/lib/utils/cn';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
  className?: string;
}

export default function StatCard({ label, value, icon, trend, className }: StatCardProps) {
  return (
    <div className={cn('bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-5 sm:p-6 hover:border-gray-300 dark:hover:border-gray-700 transition-colors duration-200', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
          <p className="mt-1.5 text-2xl sm:text-3xl font-display font-bold text-gray-900 dark:text-white tabular-nums">{value}</p>
          {trend && (
            <div className={cn('mt-2 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full', trend.value >= 0 ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20' : 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900/20')}>
              <svg className={cn('w-3 h-3', trend.value < 0 && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
              {Math.abs(trend.value)}% {trend.label}
            </div>
          )}
        </div>
        {icon && (
          <div className="p-2.5 bg-cranberry-50 dark:bg-cranberry-900/20 rounded-xl text-cranberry dark:text-cranberry-400 shrink-0">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
