import { cn } from '@/lib/utils/cn';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'cranberry' | 'gold' | 'azure' | 'green' | 'gray' | 'red';
  className?: string;
}

const variants = {
  cranberry: 'bg-cranberry-100 text-cranberry-800 dark:bg-cranberry-900/40 dark:text-cranberry-300',
  gold: 'bg-gold-100 text-gold-800 dark:bg-gold-900/40 dark:text-gold-300',
  azure: 'bg-azure-100 text-azure-900 dark:bg-azure-950/40 dark:text-azure-300',
  green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  red: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

export default function Badge({ children, variant = 'gray', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
}
