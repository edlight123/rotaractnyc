'use client';

import Button from '@/components/ui/Button';

interface DeleteEventDialogProps {
  open: boolean;
  eventTitle?: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Confirmation dialog for permanently deleting an event. Rendered outside the
 * page's `page-enter` wrapper so its fixed backdrop covers the full viewport.
 */
export default function DeleteEventDialog({ open, eventTitle, loading, onCancel, onConfirm }: DeleteEventDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h3 className="font-display font-semibold text-gray-900 dark:text-white">Delete Event</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone.</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          Are you sure you want to delete <strong>&ldquo;{eventTitle}&rdquo;</strong>? All RSVPs and check-in data will be permanently removed.
        </p>
        <div className="flex gap-3 justify-end">
          <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button size="sm" loading={loading} onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white">Delete Event</Button>
        </div>
      </div>
    </div>
  );
}
