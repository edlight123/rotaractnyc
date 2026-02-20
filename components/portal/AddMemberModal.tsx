'use client';

import { useState, useCallback, type FormEvent, type ChangeEvent } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { apiPost } from '@/hooks/useFirestore';
import type { MemberRole } from '@/types';

interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const ROLES: { value: string; label: string }[] = [
  { value: 'member', label: 'Member' },
  { value: 'board', label: 'Board' },
  { value: 'treasurer', label: 'Treasurer' },
  { value: 'president', label: 'President' },
];

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  role: MemberRole;
}

const INITIAL_FORM: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  role: 'member',
};

export default function AddMemberModal({ open, onClose, onCreated }: AddMemberModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const handleInputChange = useCallback((field: keyof FormState) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }, []);

  function resetForm() {
    setForm(INITIAL_FORM);
    setError('');
    setSuccess(false);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiPost('/api/portal/members', {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        role: form.role,
        status: 'pending',
      });
      setSuccess(true);
      onCreated?.();
      // Auto-close after brief success state
      setTimeout(() => {
        handleClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to create member');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add New Member" size="sm" noPadding>
      {success ? (
        <div className="flex flex-col items-center py-12 gap-3 px-6">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Invitation Sent!</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
            {form.firstName} will receive an email at <strong>{form.email}</strong> with instructions to sign in and complete their profile.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 px-6 py-5 space-y-4">
            {error && (
              <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter the new member's basic info. They'll receive an invite email and complete the rest of their profile during onboarding.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="First Name" placeholder="Jane" value={form.firstName} onChange={handleInputChange('firstName')} required autoComplete="off" />
              <Input label="Last Name" placeholder="Doe" value={form.lastName} onChange={handleInputChange('lastName')} required autoComplete="off" />
            </div>
            <Input label="Email" type="email" placeholder="jane@example.com" value={form.email} onChange={handleInputChange('email')} required autoComplete="off" />
            <Select label="Role" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as MemberRole }))} options={ROLES} />
          </div>

          {/* ── Sticky footer ── */}
          <div className="shrink-0 flex justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button type="submit" loading={loading}>Send Invite</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
