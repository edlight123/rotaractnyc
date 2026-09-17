'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth';
import { apiPatch } from '@/hooks/useFirestore';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import Input from '@/components/ui/Input';
import PageContainer from '@/components/portal/PageContainer';
import PageHeader from '@/components/portal/PageHeader';
import {
  missingProfileFields,
  isProfileComplete,
  PROFILE_FIELD_PROMPTS,
  PROFILE_FIELD_LABELS,
} from '@/lib/utils/profileCompleteness';

/**
 * The short way to finish a profile.
 *
 * Deliberately not the onboarding wizard. The members this exists for
 * completed that wizard already — sending them back through four steps to
 * collect two paragraphs would read as punishment for someone else's missing
 * validation. This shows only what they are missing.
 */
export default function CompleteProfilePage() {
  const { member } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ bio: '', whyJoin: '', occupation: '' });

  if (!member) {
    return (
      <PageContainer width="narrow">
        <div className="h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      </PageContainer>
    );
  }

  const missing = missingProfileFields(member);

  if (missing.length === 0) {
    return (
      <PageContainer width="narrow">
        <PageHeader eyebrow="Profile" title="You're all set" subtitle="Nothing else is missing." />
        <Button onClick={() => router.push('/portal/profile')}>View your profile</Button>
      </PageContainer>
    );
  }

  // Only the fields they still owe, pre-filled with anything already there.
  const value = (field: 'bio' | 'whyJoin' | 'occupation') =>
    form[field] || (member[field] as string | undefined) || '';

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
      toast('Thanks — your profile is complete.');
      // A hard navigation, not router.push. The auth context fetches the
      // member once per auth change rather than subscribing, so a client-side
      // push would land on the dashboard holding the pre-save record — and
      // the prompt telling them to finish their profile would still be there.
      window.location.assign('/portal');
    } catch (err: any) {
      toast(err.message || 'Could not save your profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer width="narrow">
      <PageHeader
        eyebrow="Profile"
        title="Finish your profile"
        subtitle="We used to collect this over email. It is what the club reads at inductions, and what other members see in the directory."
      />

      <div className="space-y-5">
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
            rows={4}
            value={value('bio')}
            placeholder={PROFILE_FIELD_PROMPTS.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />
        )}
        {missing.includes('whyJoin') && (
          <Textarea
            label={PROFILE_FIELD_LABELS.whyJoin}
            required
            rows={4}
            value={value('whyJoin')}
            placeholder={PROFILE_FIELD_PROMPTS.whyJoin}
            onChange={(e) => setForm({ ...form, whyJoin: e.target.value })}
          />
        )}

        <Button onClick={handleSave} disabled={!ready || saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </PageContainer>
  );
}
