'use client';

import { useState } from 'react';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';

export default function MembershipInterestForm() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    age: '',
    occupation: '',
    reason: '',
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/membership-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to submit. Please try again.');
        return;
      }
      setSent(true);
      setForm({ firstName: '', lastName: '', email: '', age: '', occupation: '', reason: '' });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl p-8 text-center border border-emerald-200 dark:border-emerald-800">
        <div className="text-4xl mb-3">🎉</div>
        <h3 className="font-display font-bold text-emerald-800 dark:text-emerald-300 mb-2">
          We&apos;ve Got Your Info!
        </h3>
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          Thanks for your interest in Rotaract NYC. A board member will reach out within a few days
          with next steps.
        </p>
        <Button variant="ghost" className="mt-4" onClick={() => setSent(false)}>
          Submit another
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-left">
      <div className="grid sm:grid-cols-2 gap-5">
        <Input
          label="First Name"
          required
          value={form.firstName}
          onChange={(e) => setForm({ ...form, firstName: e.target.value })}
        />
        <Input
          label="Last Name"
          value={form.lastName}
          onChange={(e) => setForm({ ...form, lastName: e.target.value })}
        />
      </div>
      <Input
        label="Email"
        type="email"
        required
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />
      <div className="grid sm:grid-cols-2 gap-5">
        <Input
          label="Age"
          type="number"
          min="16"
          max="40"
          value={form.age}
          onChange={(e) => setForm({ ...form, age: e.target.value })}
        />
        <Input
          label="Occupation / School"
          value={form.occupation}
          onChange={(e) => setForm({ ...form, occupation: e.target.value })}
        />
      </div>
      <Textarea
        label="Why do you want to join Rotaract?"
        rows={3}
        value={form.reason}
        onChange={(e) => setForm({ ...form, reason: e.target.value })}
      />

      {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

      <Button type="submit" variant="primary" size="lg" disabled={sending} className="w-full">
        {sending ? 'Submitting…' : 'Express Interest'}
      </Button>
    </form>
  );
}
