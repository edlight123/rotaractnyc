'use client';

import { useState } from 'react';

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName: string;
  recipientId: string;
  onSend: (data: { subject: string; message: string }) => Promise<void>;
}

export default function MessageModal({
  isOpen,
  onClose,
  recipientName,
  recipientId,
  onSend,
}: MessageModalProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!subject.trim()) {
      setError('Subject is required');
      return;
    }

    if (!message.trim()) {
      setError('Message is required');
      return;
    }

    setIsSending(true);

    try {
      await onSend({ subject: subject.trim(), message: message.trim() });
      setSuccess(true);
      
      // Reset form and close after short delay
      setTimeout(() => {
        setSubject('');
        setMessage('');
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (!isSending) {
      setSubject('');
      setMessage('');
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Send Message
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              To: <span className="font-semibold">{recipientName}</span>
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSending}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Privacy Notice */}
          <div className="flex gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 flex-shrink-0">
              info
            </span>
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <p className="font-semibold mb-1">Privacy Notice</p>
              <p>Your email will only be shared if the recipient replies to your message.</p>
            </div>
          </div>

          {/* Subject Field */}
          <div>
            <label htmlFor="subject" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isSending || success}
              placeholder="Brief topic or reason for reaching out"
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              maxLength={200}
            />
          </div>

          {/* Message Field */}
          <div>
            <label htmlFor="message" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSending || success}
              placeholder="Type your message here..."
              rows={8}
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
              maxLength={2000}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-right">
              {message.length}/2000
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400 flex-shrink-0">
                error
              </span>
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
              <span className="material-symbols-outlined text-green-600 dark:text-green-400 flex-shrink-0">
                check_circle
              </span>
              <p className="text-sm text-green-800 dark:text-green-300">
                Message sent successfully! Closing...
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSending || success}
              className="flex-1 px-6 py-3 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending || success || !subject.trim() || !message.trim()}
              className="flex-1 px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSending ? (
                <>
                  <span className="animate-spin material-symbols-outlined">refresh</span>
                  Sending...
                </>
              ) : success ? (
                <>
                  <span className="material-symbols-outlined">check</span>
                  Sent!
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">send</span>
                  Send Message
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
