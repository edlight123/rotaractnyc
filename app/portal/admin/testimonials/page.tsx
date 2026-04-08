'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import type { Testimonial } from '@/types';

const ADMIN_ROLES = ['board', 'president', 'treasurer'];

const emptyForm = {
  quote: '',
  name: '',
  title: '',
  photoURL: '',
  isActive: true,
};

export default function TestimonialsAdminPage() {
  const { member, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const hasAccess = member && ADMIN_ROLES.includes(member.role);

  // ─── Fetch testimonials ───

  const fetchTestimonials = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/portal/testimonials');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setTestimonials(data.testimonials || []);
    } catch {
      toast('Failed to load testimonials.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (hasAccess) fetchTestimonials();
  }, [hasAccess, fetchTestimonials]);

  // ─── Save (create / update) ───

  const handleSave = async () => {
    if (!form.quote.trim() || !form.name.trim() || !form.title.trim()) {
      toast('Quote, name, and title are required.', 'error');
      return;
    }

    setSaving(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { id: editingId, ...form } : form;

      const res = await fetch('/api/portal/testimonials', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      toast(editingId ? 'Testimonial updated!' : 'Testimonial added!', 'success');
      resetForm();
      fetchTestimonials();
    } catch (err: any) {
      toast(err.message || 'Failed to save testimonial.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ───

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/portal/testimonials?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast('Testimonial deleted.', 'success');
      setDeleteConfirm(null);
      fetchTestimonials();
    } catch {
      toast('Failed to delete testimonial.', 'error');
    }
  };

  // ─── Toggle active ───

  const handleToggleActive = async (t: Testimonial) => {
    try {
      const res = await fetch('/api/portal/testimonials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: t.id, isActive: !t.isActive }),
      });
      if (!res.ok) throw new Error('Failed to update');
      toast(`Testimonial ${t.isActive ? 'hidden' : 'shown'} on homepage.`, 'success');
      fetchTestimonials();
    } catch {
      toast('Failed to update testimonial.', 'error');
    }
  };

  // ─── Edit ───

  const handleEdit = (t: Testimonial) => {
    setEditingId(t.id);
    setForm({
      quote: t.quote,
      name: t.name,
      title: t.title,
      photoURL: t.photoURL || '',
      isActive: t.isActive,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(false);
  };

  // ─── Auth guard ───

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8">
          <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Only board members can manage testimonials.
          </p>
        </div>
      </div>
    );
  }

  // ─── Render ───

  return (
    <div className="max-w-4xl mx-auto space-y-8 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
            Testimonials
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage member quotes displayed on the homepage.
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            + Add Testimonial
          </Button>
        )}
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editingId ? 'Edit Testimonial' : 'New Testimonial'}
          </h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="testimonial-quote" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quote *
              </label>
              <textarea
                id="testimonial-quote"
                rows={4}
                value={form.quote}
                onChange={(e) => setForm((f) => ({ ...f, quote: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-cranberry focus:border-transparent"
                placeholder="Joining Rotaract NYC was the best decision..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="testimonial-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  id="testimonial-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-cranberry focus:border-transparent"
                  placeholder="Sarah Chen"
                />
              </div>
              <div>
                <label htmlFor="testimonial-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title / Role *
                </label>
                <input
                  id="testimonial-title"
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-cranberry focus:border-transparent"
                  placeholder="Past President"
                />
              </div>
            </div>

            <div>
              <label htmlFor="testimonial-photo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Photo URL <span className="text-gray-400">(optional)</span>
              </label>
              <input
                id="testimonial-photo"
                type="url"
                value={form.photoURL}
                onChange={(e) => setForm((f) => ({ ...f, photoURL: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-cranberry focus:border-transparent"
                placeholder="https://..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="testimonial-active"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="rounded border-gray-300 text-cranberry focus:ring-cranberry"
              />
              <label htmlFor="testimonial-active" className="text-sm text-gray-700 dark:text-gray-300">
                Show on homepage
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} loading={saving}>
              {editingId ? 'Update' : 'Add'} Testimonial
            </Button>
            <Button variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </section>
      )}

      {/* Testimonials List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : testimonials.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No testimonials yet. Add one to display on the homepage.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {testimonials.map((t) => (
            <div
              key={t.id}
              className={`rounded-2xl border bg-white dark:bg-gray-900 p-6 transition-colors ${
                t.isActive
                  ? 'border-gray-200 dark:border-gray-800'
                  : 'border-dashed border-gray-300 dark:border-gray-700 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <blockquote className="text-gray-700 dark:text-gray-300 italic leading-relaxed">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <div className="mt-3 flex items-center gap-3">
                    {t.photoURL && (
                      <img
                        src={t.photoURL}
                        alt={t.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">
                        {t.name}
                      </p>
                      <p className="text-xs text-gray-500">{t.title}</p>
                    </div>
                    <span
                      className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                        t.isActive
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {t.isActive ? 'Visible' : 'Hidden'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <Button size="sm" variant="ghost" onClick={() => handleEdit(t)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleToggleActive(t)}
                >
                  {t.isActive ? 'Hide' : 'Show'}
                </Button>
                {deleteConfirm === t.id ? (
                  <>
                    <span className="text-xs text-red-600 dark:text-red-400 ml-2">Are you sure?</span>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(t.id)}>
                      Confirm
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(null)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 dark:text-red-400"
                    onClick={() => setDeleteConfirm(t.id)}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
