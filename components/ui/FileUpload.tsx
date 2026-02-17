'use client';

import { useState, useRef } from 'react';
import { cn } from '@/lib/utils/cn';
import Button from './Button';

interface FileUploadProps {
  label?: string;
  accept?: string;
  multiple?: boolean;
  maxSizeMB?: number;
  onChange: (files: File[]) => void;
  error?: string;
  helperText?: string;
  className?: string;
  disabled?: boolean;
}

export default function FileUpload({
  label,
  accept = 'image/*',
  multiple = false,
  maxSizeMB = 10,
  onChange,
  error,
  helperText,
  className,
  disabled,
}: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach((file) => {
      if (file.size > maxSizeMB * 1024 * 1024) {
        errors.push(`${file.name} exceeds ${maxSizeMB}MB`);
      } else {
        validFiles.push(file);
      }
    });

    if (validFiles.length > 0) {
      setFileNames(validFiles.map((f) => f.name));
      onChange(validFiles);
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
        </label>
      )}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={label ? `${label} — click to upload or drag and drop` : 'Click to upload or drag and drop files'}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); !disabled && inputRef.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          'relative flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
          dragOver
            ? 'border-cranberry bg-cranberry-50/30 dark:bg-cranberry-900/10'
            : 'border-gray-300 hover:border-cranberry-300 dark:border-gray-700 dark:hover:border-cranberry-700',
          error && 'border-red-500',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        {fileNames.length > 0 ? (
          <p className="text-sm text-gray-700 dark:text-gray-300 font-medium text-center">
            {fileNames.join(', ')}
          </p>
        ) : (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="text-cranberry font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-400">Max {maxSizeMB}MB per file</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled}
        />
      </div>
      {error && <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {helperText && !error && <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>}
    </div>
  );
}
