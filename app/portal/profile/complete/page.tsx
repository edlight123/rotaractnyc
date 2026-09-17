'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage as getStorage } from '@/lib/firebase/client';
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
  const { member, user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ bio: '', whyJoin: '', occupation: '' });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

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
    photoURL: photoPreview || member.photoURL,
  });

  const pickPhoto = (file: File | undefined) => {
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile || !user) return member.photoURL || null;
    const ext = photoFile.name.split('.').pop() || 'jpg';
    const storageRef = ref(getStorage(), `avatars/${user.uid}.${ext}`);
    await uploadBytes(storageRef, photoFile);
    return getDownloadURL(storageRef);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const photoURL = await uploadPhoto();
      await apiPatch('/api/portal/profile', {
        bio: value('bio').trim(),
        whyJoin: value('whyJoin').trim(),
        occupation: value('occupation').trim(),
        ...(photoURL && { photoURL }),
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

        {missing.includes('photoURL') && (
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {PROFILE_FIELD_LABELS.photoURL} <span className="text-cranberry">*</span>
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {PROFILE_FIELD_PROMPTS.photoURL}
            </p>
            <div className="mt-3 flex items-center gap-4">
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoPreview}
                  alt="Your new profile photo"
                  className="h-20 w-20 rounded-full border-4 border-cranberry-100 object-cover dark:border-cranberry-900/30"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-gray-100 dark:bg-gray-800" aria-hidden="true" />
              )}
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => pickPhoto(e.target.files?.[0])}
              />
              <Button variant="secondary" onClick={() => fileInput.current?.click()}>
                {photoPreview ? 'Choose a different photo' : 'Upload a photo'}
              </Button>
            </div>
          </div>
        )}

        <Button onClick={handleSave} disabled={!ready || saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </PageContainer>
  );
}
