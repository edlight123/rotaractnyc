'use client';

import { useState } from 'react';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send message. Please try again.');
        return;
      }

      setSent(true);
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-6">Send a Message</h2>
      {sent ? (
        <div role="status" className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl p-8 text-center border border-emerald-200 dark:border-emerald-800">
          <div className="text-4xl mb-3">✉️</div>
          <h3 className="font-display font-bold text-emerald-800 dark:text-emerald-300 mb-2">Message Sent!</h3>
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            Thank you for reaching out. We&apos;ll get back to you within 48 hours.
          </p>
          <Button variant="ghost" className="mt-4" onClick={() => setSent(false)}>
            Send another message
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div aria-live="assertive" aria-atomic="true">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4" role="alert">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <Input
              label="Name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your name"
            />
            <Input
              label="Email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
            />
          </div>
          <Input
            label="Subject"
            required
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="What is this about?"
          />
          <Textarea
            label="Message"
            required
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder="Your message..."
            rows={5}
          />
          <Button type="submit" loading={sending} size="lg" className="w-full sm:w-auto">
            Send Message
          </Button>
        </form>
      )}
    </div>
  );
}
