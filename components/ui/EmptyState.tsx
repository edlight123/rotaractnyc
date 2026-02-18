import { cn } from '@/lib/utils/cn';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      {icon && (
        <div className="mb-5 w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500">
          {icon}
        </div>
      )}
      <h3 className="text-base font-display font-bold text-gray-900 dark:text-white mb-1.5">{title}</h3>
      {description && <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed mb-6">{description}</p>}
      {action}
    </div>
  );
}
