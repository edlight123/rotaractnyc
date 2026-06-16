'use client';

import { useState, useCallback, useEffect, useMemo, type FormEvent, type ChangeEvent } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { apiGet, apiPost } from '@/hooks/useFirestore';
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

interface DirectoryStatus {
  configured: boolean;
  ok: boolean;
  domain: string | null;
  slackInviteConfigured?: boolean;
}

/** Mirror of the server slug rule for previewing the org email local-part. */
function slugifyNamePart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export default function AddMemberModal({ open, onClose, onCreated }: AddMemberModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [provisionWorkspace, setProvisionWorkspace] = useState(false);
  const [directory, setDirectory] = useState<DirectoryStatus | null>(null);

  // Load Workspace provisioning availability when the modal opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const status = await apiGet<DirectoryStatus>('/api/google/directory/status');
        if (!cancelled) setDirectory(status);
      } catch {
        if (!cancelled) setDirectory({ configured: false, ok: false, domain: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const canProvision = !!directory?.ok && !!directory.domain;

  const orgEmailPreview = useMemo(() => {
    if (!directory?.domain) return '';
    const local = [slugifyNamePart(form.firstName), slugifyNamePart(form.lastName)]
      .filter(Boolean)
      .join('.');
    return local ? `${local}@${directory.domain}` : `…@${directory.domain}`;
  }, [form.firstName, form.lastName, directory?.domain]);

  const handleInputChange = useCallback((field: keyof FormState) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }, []);

  function resetForm() {
    setForm(INITIAL_FORM);
    setProvisionWorkspace(false);
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
        provisionWorkspace: canProvision && provisionWorkspace,
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
            <svg aria-hidden="true" className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {provisionWorkspace && canProvision ? 'Account Created!' : 'Invitation Sent!'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
            {provisionWorkspace && canProvision ? (
              <>We emailed sign-in details (new org email + temporary password) to <strong>{form.email}</strong>.</>
            ) : (
              <>{form.firstName} will receive an email at <strong>{form.email}</strong> with instructions to sign in and complete their profile.</>
            )}
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
              Enter the new member&apos;s basic info. They&apos;ll receive an invite email and complete the rest of their profile during onboarding.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="First Name" placeholder="Jane" value={form.firstName} onChange={handleInputChange('firstName')} required autoComplete="off" />
              <Input label="Last Name" placeholder="Doe" value={form.lastName} onChange={handleInputChange('lastName')} required autoComplete="off" />
            </div>
            <Input
              label={provisionWorkspace && canProvision ? 'Personal Email' : 'Email'}
              type="email"
              placeholder="jane@example.com"
              value={form.email}
              onChange={handleInputChange('email')}
              required
              autoComplete="off"
              helperText={
                provisionWorkspace && canProvision
                  ? 'Where we send their new org email + temporary password.'
                  : undefined
              }
            />
            <Select label="Role" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as MemberRole }))} options={ROLES} />

            {canProvision && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={provisionWorkspace}
                    onChange={(e) => setProvisionWorkspace(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-cranberry-600 focus:ring-cranberry-500"
                  />
                  <span>
                    <span className="block text-sm font-medium text-gray-900 dark:text-white">
                      Create a Workspace account
                    </span>
                    <span className="block text-sm text-gray-500 dark:text-gray-400">
                      Provision an <strong>@{directory?.domain}</strong> email so they sign in with
                      their org account{directory?.slackInviteConfigured ? ' and join Slack' : ''}.
                    </span>
                  </span>
                </label>
                {provisionWorkspace && (
                  <div className="mt-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 px-3 py-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-gray-400">New org email</span>
                    <p className="text-sm font-mono font-semibold text-gray-900 dark:text-white">
                      {orgEmailPreview}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Final address is confirmed on creation (a number is appended if taken).
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Sticky footer ── */}
          <div className="shrink-0 flex justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button type="submit" loading={loading}>
              {provisionWorkspace && canProvision ? 'Create Account' : 'Send Invite'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
