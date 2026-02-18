'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { apiPatch } from '@/hooks/useFirestore';
import { useToast } from '@/components/ui/Toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Avatar from '@/components/ui/Avatar';
import { useRouter } from 'next/navigation';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage as getStorage } from '@/lib/firebase/client';

const steps = [
  { id: 1, title: 'Profile' },
  { id: 2, title: 'About You' },
  { id: 3, title: 'Photo' },
  { id: 4, title: 'Review' },
];

const interestOptions = [
  'Community Service', 'Professional Development', 'International Service',
  'Social Events', 'Fundraising', 'Youth Mentoring', 'Environmental Projects',
  'Networking', 'Health & Wellness', 'Education', 'Event Planning',
];

export default function OnboardingPage() {
  const { user, member } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    bio: '',
    occupation: '',
    employer: '',
    birthday: '',
    linkedIn: '',
    memberType: 'professional' as 'professional' | 'student',
    interests: [] as string[],
    hearAbout: '',
  });

  // Pre-fill from member data
  useEffect(() => {
    if (member) {
      setForm((f) => ({
        ...f,
        firstName: member.firstName || f.firstName,
        lastName: member.lastName || f.lastName,
        phone: member.phone || f.phone,
        occupation: member.occupation || f.occupation,
        employer: member.employer || f.employer,
        memberType: member.memberType || f.memberType,
        bio: member.bio || f.bio,
        linkedIn: member.linkedIn || f.linkedIn,
        birthday: member.birthday || f.birthday,
        interests: member.interests || f.interests,
      }));
      if (member.photoURL) {
        setPhotoPreview(member.photoURL);
      }
    }
  }, [member]);

  // If already onboarded, redirect
  useEffect(() => {
    if (member?.onboardingComplete === true) {
      router.push('/portal');
    }
  }, [member, router]);

  const toggleInterest = (interest: string) => {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(interest)
        ? f.interests.filter((i) => i !== interest)
        : [...f.interests, interest],
    }));
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast('Photo must be under 5MB', 'error');
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile || !user) return member?.photoURL || null;
    setUploadingPhoto(true);
    try {
      const ext = photoFile.name.split('.').pop() || 'jpg';
      const storageRef = ref(getStorage(), `avatars/${user.uid}.${ext}`);
      await uploadBytes(storageRef, photoFile);
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (err) {
      console.error('Photo upload failed:', err);
      toast('Photo upload failed — you can update it later in your profile.', 'error');
      return member?.photoURL || null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const canProceedStep1 = form.firstName.trim() && form.lastName.trim() && form.phone.trim();

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Upload photo if selected
      const photoURL = await uploadPhoto();

      await apiPatch('/api/portal/profile', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        displayName: `${form.firstName.trim()} ${form.lastName.trim()}`,
        phone: form.phone.trim(),
        address: form.address.trim() || undefined,
        bio: form.bio.trim() || undefined,
        occupation: form.occupation.trim() || undefined,
        employer: form.employer.trim() || undefined,
        birthday: form.birthday || undefined,
        linkedIn: form.linkedIn.trim() || undefined,
        memberType: form.memberType,
        interests: form.interests,
        ...(photoURL && { photoURL }),
        onboardingComplete: true,
      });
      toast('Welcome to Rotaract NYC!');
      router.push('/portal/dues');
    } catch (err: any) {
      toast(err.message || 'Failed to save profile', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-cranberry-50 dark:bg-cranberry-900/20 flex items-center justify-center">
          <svg className="w-6 h-6 text-cranberry" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
        </div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Welcome to Rotaract NYC</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1.5">Let&apos;s get your profile set up in just a few steps.</p>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((s) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-200 ${step > s.id ? 'bg-cranberry text-white' : step === s.id ? 'bg-cranberry text-white ring-4 ring-cranberry-100 dark:ring-cranberry-900/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
              {step > s.id ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : s.id}
            </div>
            <span className={`text-sm font-medium hidden sm:inline transition-colors ${step >= s.id ? 'text-cranberry' : 'text-gray-400'}`}>{s.title}</span>
            {s.id < steps.length && <div className={`w-8 h-0.5 transition-colors duration-200 ${step > s.id ? 'bg-cranberry' : 'bg-gray-200 dark:bg-gray-700'}`} />}
          </div>
        ))}
      </div>

      <Card padding="lg">
        {/* Step 1: Personal Info */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="font-display font-bold text-gray-900 dark:text-white">Personal Information</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">These details help us stay in touch and manage your membership.</p>
            <div className="grid sm:grid-cols-2 gap-5">
              <Input label="First Name" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              <Input label="Last Name" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
            <Input label="Phone Number" required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 (555) 000-0000" />
            <Input label="Mailing Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main St, New York, NY 10001" />
            <Input label="Birthday" type="date" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Membership Type</label>
              <div className="grid sm:grid-cols-2 gap-3">
                {(['professional', 'student'] as const).map((type) => (
                  <button key={type} type="button" onClick={() => setForm({ ...form, memberType: type })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${form.memberType === type ? 'border-cranberry bg-cranberry-50/50 dark:bg-cranberry-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                    <p className="font-semibold text-gray-900 dark:text-white capitalize">{type}</p>
                    <p className="text-xs text-gray-500 mt-1">{type === 'professional' ? 'Working professionals' : 'Valid student ID required'}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>Continue</Button>
            </div>
          </div>
        )}

        {/* Step 2: About You */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="font-display font-bold text-gray-900 dark:text-white">About You</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Help other members get to know you.</p>
            <Input label="Occupation" value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} placeholder="e.g., Software Engineer, Student" />
            <Input label="Employer / School" value={form.employer} onChange={(e) => setForm({ ...form, employer: e.target.value })} placeholder="e.g., Google, NYU" />
            <Input label="LinkedIn URL" type="url" value={form.linkedIn} onChange={(e) => setForm({ ...form, linkedIn: e.target.value })} placeholder="https://linkedin.com/in/yourname" />
            <Textarea label="Short Bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell us a bit about yourself..." rows={3} />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Areas of Interest</label>
              <div className="flex flex-wrap gap-2">
                {interestOptions.map((interest) => (
                  <button key={interest} type="button" onClick={() => toggleInterest(interest)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${form.interests.includes(interest) ? 'bg-cranberry text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                    {interest}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">How did you hear about us?</label>
              <select className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cranberry-500/20 focus:border-cranberry-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" value={form.hearAbout} onChange={(e) => setForm({ ...form, hearAbout: e.target.value })}>
                <option value="">Select...</option>
                <option value="social-media">Social Media</option>
                <option value="friend">A Friend / Member</option>
                <option value="rotary">Rotary / Interact Alumni</option>
                <option value="event">Attended an Event</option>
                <option value="website">Found the Website</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)}>Continue</Button>
            </div>
          </div>
        )}

        {/* Step 3: Profile Photo */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="font-display font-bold text-gray-900 dark:text-white">Profile Photo</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Add a photo so other members can recognize you. You can always update this later.</p>

            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoPreview}
                    alt="Profile preview"
                    className="w-32 h-32 rounded-full object-cover border-4 border-cranberry-100 dark:border-cranberry-900/30"
                  />
                ) : (
                  <Avatar alt={`${form.firstName} ${form.lastName}`} size="xl" className="w-32 h-32 text-3xl" />
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoSelect}
              />

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                  {photoPreview ? 'Change Photo' : 'Upload Photo'}
                </Button>
                {photoPreview && (
                  <Button variant="ghost" onClick={() => { setPhotoPreview(null); setPhotoFile(null); }}>
                    Remove
                  </Button>
                )}
              </div>

              <p className="text-xs text-gray-400">JPG, PNG, or WebP. Max 5MB.</p>
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={() => setStep(4)}>Continue</Button>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="font-display font-bold text-gray-900 dark:text-white">Almost Done!</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Review your info and complete your setup.</p>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 space-y-3 text-sm">
              <div className="flex items-center gap-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreview} alt="" className="w-14 h-14 rounded-full object-cover" />
                ) : (
                  <Avatar alt={`${form.firstName} ${form.lastName}`} size="md" />
                )}
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{form.firstName} {form.lastName}</p>
                  <p className="text-gray-500">{member?.email}</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                <p><span className="text-gray-500">Type:</span> <span className="capitalize font-medium">{form.memberType}</span></p>
                <p><span className="text-gray-500">Phone:</span> {form.phone || '—'}</p>
                <p><span className="text-gray-500">Occupation:</span> {form.occupation || '—'}</p>
                <p><span className="text-gray-500">Employer:</span> {form.employer || '—'}</p>
              </div>
              {form.address && <p><span className="text-gray-500">Address:</span> {form.address}</p>}
              {form.interests.length > 0 && (
                <p><span className="text-gray-500">Interests:</span> {form.interests.join(', ')}</p>
              )}
            </div>

            <div className="bg-cranberry-50/50 dark:bg-cranberry-900/10 rounded-xl p-4 border border-cranberry-100 dark:border-cranberry-800">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-semibold">Next up:</span> After completing your profile, you&apos;ll be taken to the dues page to pay your annual membership dues.
              </p>
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(3)}>Back</Button>
              <Button onClick={handleSubmit} loading={submitting || uploadingPhoto}>
                {uploadingPhoto ? 'Uploading photo…' : 'Complete Setup & Pay Dues →'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
