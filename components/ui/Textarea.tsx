import { cn } from '@/lib/utils/cn';
import { forwardRef, type TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const errorId = error ? `${inputId}-error` : undefined;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={cn(
            'w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm min-h-[100px] resize-y',
            'placeholder:text-gray-400 transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-cranberry-500/20 focus:border-cranberry-500',
            'dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100',
            error && 'border-red-500 focus:ring-red-500/20 focus:border-red-500',
            className
          )}
          {...props}
        />
        {error && <p id={errorId} className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
export default Textarea;
