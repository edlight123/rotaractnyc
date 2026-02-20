import { cn } from '@/lib/utils/cn';

interface AvatarProps {
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

export default function Avatar({ src, alt, size = 'md', className }: AvatarProps) {
  const initials = String(alt ?? '')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn('rounded-full object-cover ring-2 ring-white dark:ring-gray-800', sizes[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold bg-cranberry-100 text-cranberry-700 ring-2 ring-white dark:ring-gray-800 dark:bg-cranberry-900/40 dark:text-cranberry-300',
        sizes[size],
        className
      )}
      aria-label={alt}
    >
      {initials}
    </div>
  );
}
