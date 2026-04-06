import { cn } from '@/lib/utils/cn';
import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText && !error ? `${inputId}-helper` : undefined;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId || helperId}
          className={cn(
            'w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm',
            'placeholder:text-gray-400 transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-cranberry-500/20 focus:border-cranberry-500',
            'dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100',
            error && 'border-red-500 focus:ring-red-500/20 focus:border-red-500',
            className
          )}
          {...props}
        />
        {error && <p id={errorId} className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
        {helperText && !error && <p id={helperId} className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
