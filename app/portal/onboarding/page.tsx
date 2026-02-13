'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { apiPatch } from '@/hooks/useFirestore';
import { useToast } from '@/components/ui/Toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { useRouter } from 'next/navigation';

const steps = [
  { id: 1, title: 'Personal Info' },
  { id: 2, title: 'About You' },
  { id: 3, title: 'Finish Up' },
];

const interestOptions = [
  'Community Service', 'Professional Development', 'International Service',
  'Social Events', 'Fundraising', 'Youth Mentoring', 'Environmental Projects',
];

export default function OnboardingPage() {
  const { member } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    firstName: member?.firstName || '',
    lastName: member?.lastName || '',
    phone: '',
    bio: '',
    occupation: '',
    employer: '',
    memberType: 'professional' as 'professional' | 'student',
    interests: [] as string[],
    hearAbout: '',
  });

  const toggleInterest = (interest: string) => {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(interest)
        ? f.interests.filter((i) => i !== interest)
        : [...f.interests, interest],
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await apiPatch('/api/portal/profile', {
        firstName: form.firstName,
        lastName: form.lastName,
        displayName: `${form.firstName} ${form.lastName}`.trim(),
        phone: form.phone,
        bio: form.bio,
        occupation: form.occupation,
        employer: form.employer,
        memberType: form.memberType,
        interests: form.interests,
        onboardingComplete: true,
      });
      toast('Welcome to Rotaract NYC! 🎉');
      router.push('/portal');
    } catch (err: any) {
      toast(err.message || 'Failed to save profile', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Welcome to Rotaract NYC! 🎉</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Let&apos;s get your profile set up in just a few steps.</p>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((s) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= s.id ? 'bg-cranberry text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
              {step > s.id ? '✓' : s.id}
            </div>
            <span className={`text-sm font-medium hidden sm:inline ${step >= s.id ? 'text-cranberry' : 'text-gray-400'}`}>{s.title}</span>
            {s.id < steps.length && <div className={`w-8 h-0.5 ${step > s.id ? 'bg-cranberry' : 'bg-gray-200 dark:bg-gray-700'}`} />}
          </div>
        ))}
      </div>

      <Card padding="lg">
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="font-display font-bold text-gray-900 dark:text-white">Personal Information</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              <Input label="First Name" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              <Input label="Last Name" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
            <Input label="Phone Number" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 (555) 000-0000" />
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
            <div className="flex justify-end"><Button onClick={() => setStep(2)}>Continue</Button></div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="font-display font-bold text-gray-900 dark:text-white">About You</h2>
            <Input label="Occupation" value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} placeholder="e.g., Software Engineer, Student" />
            <Input label="Employer / School" value={form.employer} onChange={(e) => setForm({ ...form, employer: e.target.value })} placeholder="e.g., Google, NYU" />
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
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)}>Continue</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="font-display font-bold text-gray-900 dark:text-white">Almost Done!</h2>
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
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2 text-sm">
              <p className="font-semibold text-gray-900 dark:text-white">Review your info:</p>
              <p><span className="text-gray-500">Name:</span> {form.firstName} {form.lastName}</p>
              <p><span className="text-gray-500">Type:</span> {form.memberType}</p>
              <p><span className="text-gray-500">Occupation:</span> {form.occupation || '—'}</p>
              <p><span className="text-gray-500">Interests:</span> {form.interests.join(', ') || '—'}</p>
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={handleSubmit} loading={submitting}>Complete Setup</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
