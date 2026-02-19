'use client';

import { useEffect, useRef, useCallback, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const modalSizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Modal({ open, onClose, children, title, size = 'md', className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = title ? 'modal-title' : undefined;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const hasInitialFocusRef = useRef(false);

  const focusElement = (el: HTMLElement) => {
    try {
      // Avoid scrolling the underlying page when focusing.
      el.focus({ preventScroll: true });
    } catch {
      el.focus();
    }
  };

  // Focus trap — stable callback that doesn't depend on onClose directly
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !modalRef.current) return;

      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    []
  );

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);

      // Focus the modal or first focusable element — only on initial open
      if (!hasInitialFocusRef.current) {
        hasInitialFocusRef.current = true;
        requestAnimationFrame(() => {
          if (modalRef.current) {
            const autoFocusEl = modalRef.current.querySelector<HTMLElement>('[autofocus]');
            const firstFocusable = modalRef.current.querySelector<HTMLElement>(
              'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])'
            );

            if (autoFocusEl) focusElement(autoFocusEl);
            else if (firstFocusable) focusElement(firstFocusable);
            else focusElement(modalRef.current);
          }
        });
      }

      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
    hasInitialFocusRef.current = false;
    document.body.style.overflow = '';
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'relative w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl animate-scale-in',
          'max-h-[90vh] overflow-y-auto',
          modalSizes[size],
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 id={titleId} className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
