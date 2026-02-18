'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { apiPatch } from '@/hooks/useFirestore';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import ProgressBar from '@/components/ui/ProgressBar';

interface OnboardingWizardProps {
  onComplete: () => void;
  onToast?: (message: string, type?: 'success' | 'error') => void;
}

const steps = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'profile', label: 'Profile' },
  { id: 'interests', label: 'Interests' },
  { id: 'done', label: 'All Done!' },
];

export default function OnboardingWizard({ onComplete, onToast }: OnboardingWizardProps) {
  const { member } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: member?.firstName || '',
    lastName: member?.lastName || '',
    bio: '',
    occupation: '',
    employer: '',
    phone: '',
    linkedIn: '',
    memberType: 'professional' as 'professional' | 'student',
    interests: [] as string[],
  });

  const interestOptions = [
    'Service Projects', 'Fundraising', 'Professional Development',
    'Networking', 'Social Events', 'International Service',
    'Youth Mentoring', 'Environmental', 'Health & Wellness',
    'Education', 'Community Outreach', 'Event Planning',
  ];

  const toggleInterest = (interest: string) => {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(interest)
        ? f.interests.filter((i) => i !== interest)
        : [...f.interests, interest],
    }));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await apiPatch('/api/portal/profile', {
        firstName: form.firstName,
        lastName: form.lastName,
        bio: form.bio,
        occupation: form.occupation,
        employer: form.employer,
        phone: form.phone,
        linkedIn: form.linkedIn,
        memberType: form.memberType,
        interests: form.interests,
      });
      onToast?.('Profile saved!');
      setStep(step + 1);
    } catch (err: any) {
      onToast?.(err.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <ProgressBar
        value={((step + 1) / steps.length) * 100}
        label={`Step ${step + 1} of ${steps.length}`}
        showPercent
        className="mb-8"
      />

      {/* Step 0: Welcome */}
      {step === 0 && (
        <Card padding="lg" className="text-center">
          <div className="w-16 h-16 rounded-full bg-cranberry-50 dark:bg-cranberry-900/20 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-cranberry" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          </div>
          <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white mt-4">
            Welcome to Rotaract NYC!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-3 max-w-md mx-auto">
            Let&apos;s set up your member profile. This will help other members get to know you and find common interests.
          </p>
          <Button size="lg" className="mt-8" onClick={() => setStep(1)}>
            Get Started
          </Button>
        </Card>
      )}

      {/* Step 1: Profile Info */}
      {step === 1 && (
        <Card padding="lg">
          <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-6">Your Profile</h2>
          <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-5">
              <Input label="First Name" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              <Input label="Last Name" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
            <Textarea label="Bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell us about yourself..." rows={3} />
            <div className="grid sm:grid-cols-2 gap-5">
              <Input label="Occupation" value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} />
              <Input label="Employer" value={form.employer} onChange={(e) => setForm({ ...form, employer: e.target.value })} />
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <Input label="Phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Input label="LinkedIn URL" type="url" value={form.linkedIn} onChange={(e) => setForm({ ...form, linkedIn: e.target.value })} />
            </div>
            {/* Member type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Membership Type</label>
              <div className="grid grid-cols-2 gap-3">
                {(['professional', 'student'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, memberType: t })}
                    className={`p-4 rounded-xl border-2 text-left transition-all capitalize ${
                      form.memberType === t
                        ? 'border-cranberry bg-cranberry-50/50 dark:bg-cranberry-900/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-cranberry'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-between mt-8">
            <Button variant="secondary" onClick={() => setStep(0)}>Back</Button>
            <Button onClick={() => setStep(2)}>Next</Button>
          </div>
        </Card>
      )}

      {/* Step 2: Interests */}
      {step === 2 && (
        <Card padding="lg">
          <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2">Your Interests</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Select areas you&apos;re interested in. This helps us match you with committees and projects.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {interestOptions.map((interest) => (
              <button
                key={interest}
                type="button"
                onClick={() => toggleInterest(interest)}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all ${
                  form.interests.includes(interest)
                    ? 'bg-cranberry text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-8">
            <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
            <Button loading={saving} onClick={handleSaveProfile}>Complete Setup</Button>
          </div>
        </Card>
      )}

      {/* Step 3: Done */}
      {step === 3 && (
        <Card padding="lg" className="text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white mt-4">
            You&apos;re All Set!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-3 max-w-md mx-auto">
            Your profile is ready. Explore the portal, RSVP to events, and connect with fellow Rotaractors!
          </p>
          <Button size="lg" className="mt-8" onClick={onComplete}>
            Go to Portal
          </Button>
        </Card>
      )}
    </div>
  );
}
