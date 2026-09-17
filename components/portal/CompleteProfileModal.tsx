'use client';

import { useState } from 'react';
import type { Member } from '@/types';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { apiPatch } from '@/hooks/useFirestore';
import { useToast } from '@/components/ui/Toast';
import {
  missingProfileFields,
  isProfileComplete,
  PROFILE_FIELD_LABELS,
  PROFILE_FIELD_PROMPTS,
} from '@/lib/utils/profileCompleteness';

interface CompleteProfileModalProps {
  open: boolean;
  member: Member | null;
  onClose: () => void;
  /** Runs once the profile is saved, so the caller can resume what it was doing. */
  onComplete: () => void;
}

/**
 * Asked at the moment someone wants something.
 *
 * This blocks the RSVP rather than offering a dismissible nudge, which is a
 * deliberate choice: a gate you can always wave away is just a second banner,
 * and a banner is what failed to collect 38 bios in the first place. It earns
 * that by being three fields, inline, with no navigation — about thirty
 * seconds, and the RSVP continues by itself afterwards.
 */
export default function CompleteProfileModal({
  open,
  member,
  onClose,
  onComplete,
}: CompleteProfileModalProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ bio: '', whyJoin: '', occupation: '' });

  const missing = missingProfileFields(member);
  const value = (field: 'bio' | 'whyJoin' | 'occupation') =>
    form[field] || (member?.[field] as string | undefined) || '';

  const ready = isProfileComplete({
    bio: value('bio'),
    whyJoin: value('whyJoin'),
    occupation: value('occupation'),
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPatch('/api/portal/profile', {
        bio: value('bio').trim(),
        whyJoin: value('whyJoin').trim(),
        occupation: value('occupation').trim(),
      });
      toast('Thanks — that’s your profile done.');
      onComplete();
    } catch (err: any) {
      toast(err.message || 'Could not save your profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="One thing first" size="md">
      <div className="space-y-5">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Before you RSVP, the club needs a little about you. It is read at inductions and
          shown to other members in the directory. This is the only time we will ask.
        </p>

        {missing.includes('occupation') && (
          <Input
            label={PROFILE_FIELD_LABELS.occupation}
            required
            value={value('occupation')}
            placeholder={PROFILE_FIELD_PROMPTS.occupation}
            onChange={(e) => setForm({ ...form, occupation: e.target.value })}
          />
        )}
        {missing.includes('bio') && (
          <Textarea
            label={PROFILE_FIELD_LABELS.bio}
            required
            rows={3}
            value={value('bio')}
            placeholder={PROFILE_FIELD_PROMPTS.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />
        )}
        {missing.includes('whyJoin') && (
          <Textarea
            label={PROFILE_FIELD_LABELS.whyJoin}
            required
            rows={3}
            value={value('whyJoin')}
            placeholder={PROFILE_FIELD_PROMPTS.whyJoin}
            onChange={(e) => setForm({ ...form, whyJoin: e.target.value })}
          />
        )}

        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Not now
          </Button>
          <Button onClick={handleSave} disabled={!ready || saving}>
            {saving ? 'Saving…' : 'Save and RSVP'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
