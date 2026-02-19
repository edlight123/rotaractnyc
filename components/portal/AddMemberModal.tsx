'use client';

import { useState, useCallback, type FormEvent, type ChangeEvent } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import SelectWithOther from '@/components/ui/SelectWithOther';
import { apiPost } from '@/hooks/useFirestore';
import { toSelectOptions, DEFAULT_COMMITTEES, DEFAULT_OCCUPATIONS } from '@/lib/profileOptions';
import type { MemberRole, MemberStatus } from '@/types';

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

const STATUSES: { value: string; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'alumni', label: 'Alumni' },
];

const MEMBER_TYPES = [
  { value: 'professional', label: 'Professional' },
  { value: 'student', label: 'Student' },
];

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  role: MemberRole;
  status: MemberStatus;
  memberType: string;
  committee: string;
  phone: string;
  birthday: string;
  occupation: string;
  employer: string;
  linkedIn: string;
  bio: string;
}

const INITIAL_FORM: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  role: 'member',
  status: 'active',
  memberType: 'professional',
  committee: '',
  phone: '',
  birthday: '',
  occupation: '',
  employer: '',
  linkedIn: '',
  bio: '',
};

export default function AddMemberModal({ open, onClose, onCreated }: AddMemberModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const updateField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleInputChange = useCallback((field: keyof FormState) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
        status: form.status,
        memberType: form.memberType,
        committee: form.committee || undefined,
        phone: form.phone || undefined,
        birthday: form.birthday || undefined,
        occupation: form.occupation || undefined,
        employer: form.employer || undefined,
        linkedIn: form.linkedIn || undefined,
        bio: form.bio || undefined,
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
    <Modal open={open} onClose={handleClose} title="Add New Member" size="lg">
      {success ? (
        <div className="flex flex-col items-center py-8 gap-3">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Invitation Sent!</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
            {form.firstName} will receive an email at <strong>{form.email}</strong> with instructions to sign in and complete their profile.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* ── Name row ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              placeholder="Jane"
              value={form.firstName}
              onChange={handleInputChange('firstName')}
              required
              autoComplete="off"
            />
            <Input
              label="Last Name"
              placeholder="Doe"
              value={form.lastName}
              onChange={handleInputChange('lastName')}
              required
              autoComplete="off"
            />
          </div>

          {/* ── Email ── */}
          <Input
            label="Email"
            type="email"
            placeholder="jane@example.com"
            value={form.email}
            onChange={handleInputChange('email')}
            required
            autoComplete="off"
          />

          {/* ── Role / Status / Type row ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Role"
              value={form.role}
              onChange={(e) => updateField('role', e.target.value as MemberRole)}
              options={ROLES}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => updateField('status', e.target.value as MemberStatus)}
              options={STATUSES}
            />
            <Select
              label="Member Type"
              value={form.memberType}
              onChange={handleInputChange('memberType')}
              options={MEMBER_TYPES}
            />
          </div>

          {/* ── Committee / Phone ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectWithOther
              label="Committee"
              value={form.committee}
              onChange={(v) => updateField('committee', v)}
              options={toSelectOptions(DEFAULT_COMMITTEES)}
              placeholder="Select a committee"
            />
            <Input
              label="Phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={form.phone}
              onChange={handleInputChange('phone')}
              autoComplete="off"
            />
          </div>

          {/* ── Occupation / Employer ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectWithOther
              label="Occupation"
              value={form.occupation}
              onChange={(v) => updateField('occupation', v)}
              options={toSelectOptions(DEFAULT_OCCUPATIONS)}
              placeholder="Select an occupation"
            />
            <Input
              label="Employer"
              placeholder="Acme Corp"
              value={form.employer}
              onChange={handleInputChange('employer')}
              autoComplete="off"
            />
          </div>

          {/* ── Birthday / LinkedIn ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Birthday"
              type="date"
              value={form.birthday}
              onChange={handleInputChange('birthday')}
            />
            <Input
              label="LinkedIn"
              type="url"
              placeholder="https://linkedin.com/in/janedoe"
              value={form.linkedIn}
              onChange={handleInputChange('linkedIn')}
              autoComplete="off"
            />
          </div>

          {/* ── Bio ── */}
          <Textarea
            label="Bio"
            placeholder="Short bio or intro..."
            value={form.bio}
            onChange={(e) => updateField('bio', e.target.value)}
            autoComplete="off"
          />

          {/* ── Actions ── */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Add Member
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
