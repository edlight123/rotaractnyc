'use client';

import { useEffect, useLayoutEffect, useRef, useCallback, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/* SSR-safe layout effect — runs synchronously before paint on the client,
   falls back to useEffect during SSR to avoid React warnings. */
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  /** When true the default p-6 content wrapper is removed so children control their own padding. */
  noPadding?: boolean;
}

const modalSizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Modal({ open, onClose, children, title, size = 'md', className, noPadding }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = title ? 'modal-title' : undefined;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const focusElement = (el: HTMLElement) => {
    try {
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

  /* Lock body scroll synchronously (before paint) to prevent scroll jumps. */
  useIsomorphicLayoutEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
    document.body.style.overflow = '';
  }, [open]);

  /* Keyboard listener + auto-focus (runs after paint so DOM is settled). */
  useEffect(() => {
    if (!open) return;

    window.addEventListener('keydown', handleKeyDown);

    // Auto-focus: find [data-autofocus] → first focusable → modal container
    const raf = requestAnimationFrame(() => {
      if (!modalRef.current) return;

      // Skip if something inside the modal already has focus (e.g. React autoFocus fired)
      if (
        modalRef.current.contains(document.activeElement) &&
        document.activeElement !== modalRef.current
      ) {
        return;
      }

      const preferred =
        modalRef.current.querySelector<HTMLElement>('[data-autofocus]') ||
        modalRef.current.querySelector<HTMLElement>('[autofocus]');
      const firstFocusable = modalRef.current.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])'
      );

      if (preferred) focusElement(preferred);
      else if (firstFocusable) focusElement(firstFocusable);
      else focusElement(modalRef.current);
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', handleKeyDown);
      // Restore focus to the element that opened the modal
      if (previousFocusRef.current && document.contains(previousFocusRef.current)) {
        previousFocusRef.current.focus({ preventScroll: true });
      }
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none p-4"
      onClick={(e) => e.target === overlayRef.current && onClose()}
      onWheel={(e) => {
        // Prevent scroll from propagating outside the modal dialog
        if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
          e.preventDefault();
        }
      }}
    >
      {/* Backdrop — pointer-events-none so clicks fall through to the overlay handler */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in pointer-events-none"
        aria-hidden="true"
      />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'relative z-10 w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl animate-scale-in',
          'max-h-[90vh] flex flex-col overflow-hidden',
          modalSizes[size],
          className
        )}
      >
        {title && (
          <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 id={titleId} className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {noPadding
          ? <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">{children}</div>
          : <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 p-6">{children}</div>
        }
      </div>
    </div>
  );
}
