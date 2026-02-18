'use client';

import { useState, type FormEvent } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import { apiPost } from '@/hooks/useFirestore';
import type { MemberRole, MemberStatus } from '@/types';

interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const ROLES: { value: MemberRole; label: string }[] = [
  { value: 'member', label: 'Member' },
  { value: 'board', label: 'Board' },
  { value: 'treasurer', label: 'Treasurer' },
  { value: 'president', label: 'President' },
];

const STATUSES: { value: MemberStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'alumni', label: 'Alumni' },
];

const MEMBER_TYPES = [
  { value: 'professional', label: 'Professional' },
  { value: 'student', label: 'Student' },
];

const selectClass =
  'w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm transition-colors duration-150 ' +
  'focus:outline-none focus:ring-2 focus:ring-cranberry-500/20 focus:border-cranberry-500 ' +
  'dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100';

export default function AddMemberModal({ open, onClose, onCreated }: AddMemberModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('member');
  const [status, setStatus] = useState<MemberStatus>('active');
  const [memberType, setMemberType] = useState('professional');
  const [committee, setCommittee] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [occupation, setOccupation] = useState('');
  const [employer, setEmployer] = useState('');
  const [linkedIn, setLinkedIn] = useState('');
  const [bio, setBio] = useState('');

  function resetForm() {
    setFirstName('');
    setLastName('');
    setEmail('');
    setRole('member');
    setStatus('active');
    setMemberType('professional');
    setCommittee('');
    setPhone('');
    setBirthday('');
    setOccupation('');
    setEmployer('');
    setLinkedIn('');
    setBio('');
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
        firstName,
        lastName,
        email,
        role,
        status,
        memberType,
        committee: committee || undefined,
        phone: phone || undefined,
        birthday: birthday || undefined,
        occupation: occupation || undefined,
        employer: employer || undefined,
        linkedIn: linkedIn || undefined,
        bio: bio || undefined,
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
            {firstName} will receive an email at <strong>{email}</strong> with instructions to sign in and complete their profile.
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
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              label="Last Name"
              placeholder="Doe"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          {/* ── Email ── */}
          <Input
            label="Email"
            type="email"
            placeholder="jane@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {/* ── Role / Status / Type row ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as MemberRole)}
                className={selectClass}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as MemberStatus)}
                className={selectClass}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Member Type
              </label>
              <select
                value={memberType}
                onChange={(e) => setMemberType(e.target.value)}
                className={selectClass}
              >
                {MEMBER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Committee / Phone ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Committee"
              placeholder="Community Service"
              value={committee}
              onChange={(e) => setCommittee(e.target.value)}
            />
            <Input
              label="Phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {/* ── Occupation / Employer ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Occupation"
              placeholder="Software Engineer"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
            />
            <Input
              label="Employer"
              placeholder="Acme Corp"
              value={employer}
              onChange={(e) => setEmployer(e.target.value)}
            />
          </div>

          {/* ── Birthday / LinkedIn ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Birthday"
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
            />
            <Input
              label="LinkedIn"
              type="url"
              placeholder="https://linkedin.com/in/janedoe"
              value={linkedIn}
              onChange={(e) => setLinkedIn(e.target.value)}
            />
          </div>

          {/* ── Bio ── */}
          <Textarea
            label="Bio"
            placeholder="Short bio or intro..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
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
