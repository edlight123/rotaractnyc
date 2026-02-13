'use client';

import { useState } from 'react';
import HeroSection from '@/components/public/HeroSection';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import { SITE } from '@/lib/constants';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setSent(true);
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch {
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <HeroSection title="Contact Us" subtitle="We'd love to hear from you. Reach out with questions, ideas, or just to say hello." size="sm" />

      <section className="section-padding bg-white dark:bg-gray-950">
        <div className="container-page">
          <div className="grid lg:grid-cols-2 gap-16 max-w-5xl mx-auto">
            {/* Form */}
            <div>
              <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-6">Send a Message</h2>
              {sent ? (
                <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl p-8 text-center border border-emerald-200 dark:border-emerald-800">
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
                <form onSubmit={handleSubmit} className="space-y-5">
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

            {/* Contact Info */}
            <div>
              <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-6">Get in Touch</h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-cranberry-50 dark:bg-cranberry-900/20 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-cranberry" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Address</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{SITE.address}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-cranberry-50 dark:bg-cranberry-900/20 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-cranberry" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Email</p>
                    <a href={`mailto:${SITE.email}`} className="text-sm text-cranberry hover:text-cranberry-800 transition-colors">
                      {SITE.email}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-cranberry-50 dark:bg-cranberry-900/20 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-cranberry" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Meetings</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{SITE.meetingSchedule}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-cranberry-50 dark:bg-cranberry-900/20 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-cranberry" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Social Media</p>
                    <div className="flex gap-3 mt-2">
                      <a href={SITE.social.instagram} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-cranberry transition-colors">Instagram</a>
                      <a href={SITE.social.linkedin} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-cranberry transition-colors">LinkedIn</a>
                      <a href={SITE.social.facebook} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-cranberry transition-colors">Facebook</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
