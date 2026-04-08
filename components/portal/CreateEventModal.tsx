'use client';

import { useState, useEffect, type FormEvent } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import FileUpload from '@/components/ui/FileUpload';
import { apiPost, apiPatch } from '@/hooks/useFirestore';
import { uploadFile, validateFile } from '@/lib/firebase/upload';
import type { RotaractEvent, EventType, EventPricing, TicketTier, RecurrenceFrequency, RecurrenceRule } from '@/types';

interface CreateEventModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  event?: RotaractEvent | null; // Pass in for edit mode
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function formatTime12h(time24: string): string {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

function parseTo24h(time12: string): string {
  if (!time12) return '';
  // Handle time ranges like "09:00 - 12:00" or "9:00 AM - 12:00 PM" — take the first time
  const rangePart = time12.split(/\s*[–-]\s*/)[0].trim();
  // Already in 24h format
  if (/^\d{2}:\d{2}$/.test(rangePart)) return rangePart;
  const match = rangePart.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return rangePart;
  let h = parseInt(match[1]);
  const m = match[2];
  const period = match[3].toUpperCase();
  if (period === 'PM' && h < 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${h.toString().padStart(2, '0')}:${m}`;
}

function parseEndTimeTo24h(timeStr: string): string {
  if (!timeStr) return '';
  // If it's a range like "09:00 - 12:00", take the second time
  const parts = timeStr.split(/\s*[–-]\s*/);
  if (parts.length >= 2) return parseTo24h(parts[parts.length - 1].trim());
  return '';
}

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'free', label: 'Free' },
  { value: 'paid', label: 'Paid (Ticketed)' },
  { value: 'service', label: 'Service Project' },
  { value: 'hybrid', label: 'Hybrid (Free for members, paid for guests)' },
];

const EVENT_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'cancelled', label: 'Cancelled' },
];

const RECURRENCE_FREQUENCIES: { value: RecurrenceFrequency | 'none'; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const selectClass =
  'w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm transition-colors duration-150 ' +
  'focus:outline-none focus:ring-2 focus:ring-cranberry-500/20 focus:border-cranberry-500 ' +
  'dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100';

export default function CreateEventModal({ open, onClose, onSaved, event }: CreateEventModalProps) {
  const isEdit = !!event;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  // Steps configuration
  const STEPS = [
    { id: 'basics', label: 'Basics', icon: '📝' },
    { id: 'datetime', label: 'When', icon: '📅' },
    { id: 'location', label: 'Where', icon: '📍' },
    { id: 'details', label: 'Details', icon: '⚙️' },
  ];

  // Basic info
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [time, setTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Location
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');

  // Details
  const [type, setType] = useState<EventType>('free');
  const [imageURL, setImageURL] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [tags, setTags] = useState('');
  const [capacity, setCapacity] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [status, setStatus] = useState<'draft' | 'published' | 'cancelled'>('draft');

  // Pricing
  const [memberPrice, setMemberPrice] = useState('');
  const [guestPrice, setGuestPrice] = useState('');
  const [earlyBirdPrice, setEarlyBirdPrice] = useState('');
  const [earlyBirdDeadline, setEarlyBirdDeadline] = useState('');

  // Tier pricing
  const [useTiers, setUseTiers] = useState(false);
  const [tiers, setTiers] = useState<Array<{
    id: string; label: string; description: string;
    memberPrice: string; guestPrice: string;
    capacity: string; deadline: string;
  }>>([]);

  function addTier() {
    const idx = tiers.length + 1;
    const presets: Record<number, { id: string; label: string }> = {
      1: { id: 'early-bird', label: 'Early Bird' },
      2: { id: 'general', label: 'General Admission' },
      3: { id: 'vip', label: 'VIP' },
    };
    const preset = presets[idx] || { id: `tier-${idx}`, label: `Tier ${idx}` };
    setTiers((prev) => [...prev, {
      id: preset.id, label: preset.label, description: '',
      memberPrice: '', guestPrice: '', capacity: '', deadline: '',
    }]);
  }

  function removeTier(index: number) {
    setTiers((prev) => prev.filter((_, i) => i !== index));
  }

  function updateTier(index: number, field: string, value: string) {
    setTiers((prev) => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
  }

  // Recurrence
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency | 'none'>('none');
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [recurrenceOccurrences, setRecurrenceOccurrences] = useState('10');
  const [recurrenceEndType, setRecurrenceEndType] = useState<'occurrences' | 'date'>('occurrences');

  const showPricing = type === 'paid' || type === 'hybrid';
  const showRecurrence = !isEdit; // Only allow setting recurrence on new events

  // Populate for edit mode
  useEffect(() => {
    if (event && open) {
      setTitle(event.title || '');
      setSlug(event.slug || '');
      setDescription(event.description || '');
      setDate(event.date ? event.date.split('T')[0] : '');
      setEndDate(event.endDate ? event.endDate.split('T')[0] : '');
      setTime(event.time ? parseTo24h(event.time) : '');
      // If endTime is explicit use it; otherwise try to extract from a time range in event.time
      setEndTime(event.endTime ? parseTo24h(event.endTime) : parseEndTimeTo24h(event.time || ''));
      setLocation(event.location || '');
      setAddress(event.address || '');
      setType(event.type || 'free');
      setImageURL(event.imageURL || '');
      setImagePreview(event.imageURL || null);
      setImageFile(null);
      setUploadProgress(null);
      setTags(event.tags?.join(', ') || '');
      setCapacity(event.capacity ? String(event.capacity) : '');
      setIsPublic(event.isPublic ?? true);
      setStatus(event.status || 'draft');
      if (event.pricing) {
        setMemberPrice(String(event.pricing.memberPrice / 100));
        setGuestPrice(String(event.pricing.guestPrice / 100));
        setEarlyBirdPrice(
          event.pricing.earlyBirdPrice != null ? String(event.pricing.earlyBirdPrice / 100) : ''
        );
        setEarlyBirdDeadline(
          event.pricing.earlyBirdDeadline ? event.pricing.earlyBirdDeadline.split('T')[0] : ''
        );
        // Populate tier state
        if (event.pricing.tiers?.length) {
          setUseTiers(true);
          setTiers(event.pricing.tiers.map((t) => ({
            id: t.id, label: t.label, description: t.description || '',
            memberPrice: String(t.memberPrice / 100),
            guestPrice: String(t.guestPrice / 100),
            capacity: t.capacity ? String(t.capacity) : '',
            deadline: t.deadline ? t.deadline.split('T')[0] : '',
          })));
        } else {
          setUseTiers(false);
          setTiers([]);
        }
      } else {
        setMemberPrice('');
        setGuestPrice('');
        setEarlyBirdPrice('');
        setEarlyBirdDeadline('');
        setUseTiers(false);
        setTiers([]);
      }
      // Recurrence — display-only in edit mode
      if (event.recurrence) {
        setRecurrenceFrequency(event.recurrence.frequency);
        setRecurrenceDays(event.recurrence.daysOfWeek || []);
        setRecurrenceEndDate(event.recurrence.endDate ? event.recurrence.endDate.split('T')[0] : '');
        setRecurrenceOccurrences(event.recurrence.occurrences ? String(event.recurrence.occurrences) : '10');
      } else {
        setRecurrenceFrequency('none');
        setRecurrenceDays([]);
        setRecurrenceEndDate('');
        setRecurrenceOccurrences('10');
      }
    }
  }, [event, open]);

  // Auto-generate slug from title (create mode only)
  useEffect(() => {
    if (!isEdit && title) {
      setSlug(slugify(title));
    }
  }, [title, isEdit]);

  function resetForm() {
    setTitle('');
    setSlug('');
    setDescription('');
    setDate('');
    setEndDate('');
    setTime('');
    setEndTime('');
    setLocation('');
    setAddress('');
    setType('free');
    setImageURL('');
    setImageFile(null);
    setImagePreview(null);
    setUploadProgress(null);
    setTags('');
    setCapacity('');
    setIsPublic(true);
    setStatus('draft');
    setMemberPrice('');
    setGuestPrice('');
    setEarlyBirdPrice('');
    setEarlyBirdDeadline('');
    setUseTiers(false);
    setTiers([]);
    setRecurrenceFrequency('none');
    setRecurrenceDays([]);
    setRecurrenceEndDate('');
    setRecurrenceOccurrences('10');
    setRecurrenceEndType('occurrences');
    setError('');
    setSuccess(false);
    setActiveStep(0);
  }

  // ── Autosave draft to localStorage (create mode only) ──
  const DRAFT_KEY = 'rotaract_event_draft';

  // Save draft whenever form fields change (debounced via effect)
  useEffect(() => {
    if (isEdit || !open) return;
    // Only save if there's meaningful content
    if (!title && !description && !date) return;
    const draft = { title, slug, description, date, endDate, time, endTime, location, address, type, tags, capacity, isPublic, status: status, memberPrice, guestPrice, earlyBirdPrice, earlyBirdDeadline, recurrenceFrequency, recurrenceDays, recurrenceEndDate, recurrenceOccurrences, recurrenceEndType, savedAt: Date.now() };
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, date, time, location, type, tags, memberPrice, guestPrice, isEdit, open]);

  // Restore draft on mount (create mode only)
  useEffect(() => {
    if (isEdit || !open) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      // Only restore if less than 24 hours old
      if (Date.now() - (draft.savedAt || 0) > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(DRAFT_KEY);
        return;
      }
      if (draft.title) setTitle(draft.title);
      if (draft.slug) setSlug(draft.slug);
      if (draft.description) setDescription(draft.description);
      if (draft.date) setDate(draft.date);
      if (draft.endDate) setEndDate(draft.endDate);
      if (draft.time) setTime(draft.time);
      if (draft.endTime) setEndTime(draft.endTime);
      if (draft.location) setLocation(draft.location);
      if (draft.address) setAddress(draft.address);
      if (draft.type) setType(draft.type);
      if (draft.tags) setTags(draft.tags);
      if (draft.capacity) setCapacity(draft.capacity);
      if (draft.isPublic !== undefined) setIsPublic(draft.isPublic);
      if (draft.status) setStatus(draft.status);
      if (draft.memberPrice) setMemberPrice(draft.memberPrice);
      if (draft.guestPrice) setGuestPrice(draft.guestPrice);
      if (draft.earlyBirdPrice) setEarlyBirdPrice(draft.earlyBirdPrice);
      if (draft.earlyBirdDeadline) setEarlyBirdDeadline(draft.earlyBirdDeadline);
      if (draft.recurrenceFrequency) setRecurrenceFrequency(draft.recurrenceFrequency);
      if (draft.recurrenceDays) setRecurrenceDays(draft.recurrenceDays);
      if (draft.recurrenceEndDate) setRecurrenceEndDate(draft.recurrenceEndDate);
      if (draft.recurrenceOccurrences) setRecurrenceOccurrences(draft.recurrenceOccurrences);
      if (draft.recurrenceEndType) setRecurrenceEndType(draft.recurrenceEndType);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, open]);

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  }

  function handleClose() {
    // Don't clear draft on close (user can resume later) unless it was a successful save
    resetForm();
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    // Validation
    if (!title.trim()) return setError('Event title is required.');
    if (!date) return setError('Event date is required.');
    if (!time) return setError('Event start time is required.');
    if (!location.trim()) return setError('Location is required.');
    if (showPricing && !guestPrice) return setError('Guest price is required for paid/hybrid events.');

    setLoading(true);

    try {
      // Upload image if a new file was selected
      let finalImageURL = imageURL;
      if (imageFile) {
        const validationError = validateFile(imageFile, {
          maxSizeMB: 10,
          allowedTypes: ['image/'],
        });
        if (validationError) {
          setError(validationError);
          setLoading(false);
          return;
        }
        try {
          const result = await uploadFile(
            imageFile,
            'event-images',
            slug || slugify(title),
            (pct) => setUploadProgress(pct),
          );
          finalImageURL = result.url;
        } catch (uploadErr: any) {
          setError(uploadErr.message || 'Image upload failed');
          setLoading(false);
          return;
        }
        setUploadProgress(null);
      }

      // Build pricing object
      let pricing: EventPricing | undefined;
      if (showPricing) {
        if (useTiers && tiers.length > 0) {
          // Tier-based pricing
          const builtTiers: TicketTier[] = tiers.map((t, i) => ({
            id: t.id || `tier-${i}`,
            label: t.label,
            description: t.description || undefined,
            memberPrice: Math.round(parseFloat(t.memberPrice || '0') * 100),
            guestPrice: Math.round(parseFloat(t.guestPrice || '0') * 100),
            capacity: t.capacity ? parseInt(t.capacity) : undefined,
            deadline: t.deadline ? new Date(t.deadline + 'T23:59:59').toISOString() : undefined,
            sortOrder: i,
          }));
          // Set legacy fields from the first (cheapest) tier for backward compat
          pricing = {
            memberPrice: builtTiers[0].memberPrice,
            guestPrice: builtTiers[0].guestPrice,
            tiers: builtTiers,
          };
        } else {
          // Legacy flat pricing
          pricing = {
            memberPrice: Math.round(parseFloat(memberPrice || '0') * 100),
            guestPrice: Math.round(parseFloat(guestPrice || '0') * 100),
          };
          if (earlyBirdPrice) {
            pricing.earlyBirdPrice = Math.round(parseFloat(earlyBirdPrice) * 100);
          }
          if (earlyBirdDeadline) {
            pricing.earlyBirdDeadline = new Date(earlyBirdDeadline + 'T23:59:59').toISOString();
          }
        }
      }

      // Build date ISO
      const dateISO = new Date(`${date}T${time || '00:00'}`).toISOString();
      const formattedTime = formatTime12h(time);
      const formattedEndTime = endTime ? formatTime12h(endTime) : undefined;

      // Build recurrence rule
      let recurrence: RecurrenceRule | undefined;
      let isRecurring = false;
      if (showRecurrence && recurrenceFrequency !== 'none') {
        isRecurring = true;
        recurrence = {
          frequency: recurrenceFrequency,
        };
        if (recurrenceFrequency === 'weekly' || recurrenceFrequency === 'biweekly') {
          recurrence.daysOfWeek = recurrenceDays.length > 0 ? recurrenceDays : [new Date(`${date}T${time || '00:00'}`).getDay()];
        }
        if (recurrenceEndType === 'date' && recurrenceEndDate) {
          recurrence.endDate = new Date(`${recurrenceEndDate}T23:59:59`).toISOString();
        } else {
          recurrence.occurrences = parseInt(recurrenceOccurrences) || 10;
        }
      }

      const eventData = {
        title: title.trim(),
        slug: slug || slugify(title),
        description: description.trim(),
        date: dateISO,
        endDate: endDate ? new Date(`${endDate}T23:59:59`).toISOString() : undefined,
        time: formattedTime,
        endTime: formattedEndTime,
        location: location.trim(),
        address: address.trim() || undefined,
        type,
        pricing,
        imageURL: finalImageURL?.trim() || undefined,
        tags: tags
          ? tags
              .split(',')
              .map((t) => t.trim().toLowerCase())
              .filter(Boolean)
          : [],
        capacity: capacity ? parseInt(capacity) : undefined,
        isPublic,
        status,
        isRecurring,
        recurrence,
      };

      if (isEdit && event) {
        await apiPatch('/api/portal/events', { id: event.id, ...eventData });
      } else {
        await apiPost('/api/portal/events', eventData);
      }

      setSuccess(true);
      clearDraft();
      onSaved?.();
      setTimeout(() => handleClose(), 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to save event');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={isEdit ? 'Edit Event' : 'Create New Event'} size="xl">
      {success ? (
        <div className="flex flex-col items-center py-8 gap-3">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <svg aria-hidden="true" className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {isEdit ? 'Event Updated!' : 'Event Created!'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── Step Progress Indicator ── */}
          <div className="flex items-center justify-between px-1">
            {STEPS.map((step, i) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(i)}
                className="flex flex-col items-center gap-1 group"
              >
                <div className={`relative flex items-center justify-center w-9 h-9 rounded-full text-sm font-medium transition-all duration-300 ${
                  i === activeStep
                    ? 'bg-cranberry text-white shadow-md shadow-cranberry/25 scale-110'
                    : i < activeStep
                    ? 'bg-cranberry/10 text-cranberry dark:bg-cranberry-900/30 dark:text-cranberry-400'
                    : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                }`}>
                  {step.icon}
                </div>
                <span className={`text-[10px] font-medium transition-colors ${
                  i === activeStep ? 'text-cranberry' : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {step.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className="absolute w-[calc(100%/4-2rem)] h-0.5 top-[18px] left-[calc(50%+1.25rem)]" />
                )}
              </button>
            ))}
          </div>
          {/* Step progress bar */}
          <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden -mt-2">
            <div
              className="h-full bg-gradient-to-r from-cranberry to-cranberry-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((activeStep + 1) / STEPS.length) * 100}%` }}
            />
          </div>

          {/* Autosave indicator */}
          {!isEdit && (title || description || date) && (
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Draft auto-saved
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* ── Section: Basic Info ── */}
          <div className={activeStep === 0 ? 'animate-in fade-in slide-in-from-right-2 duration-300' : 'hidden'}>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Basic Information
            </h3>
            <div className="space-y-4">
              <Input
                label="Event Title"
                placeholder="e.g. Spring Networking Mixer"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="URL Slug"
                  placeholder="spring-networking-mixer"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  helperText="Auto-generated from title. Customize if needed."
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Event Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as EventType)}
                    className={selectClass}
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Textarea
                label="Description"
                placeholder="Full event description — include agenda, what to bring, dress code, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                required
              />
            </div>
          </div>

          {/* ── Section: Date & Time ── */}
          <div className={activeStep === 1 ? 'animate-in fade-in slide-in-from-right-2 duration-300' : 'hidden'}>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Date &amp; Time
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Input
                label="Start Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              <Input
                label="Start Time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
              <Input
                label="End Date (optional)"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <Input
                label="End Time (optional)"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* ── Section: Recurrence ── */}
          {showRecurrence && (
            <div className={activeStep === 1 ? 'animate-in fade-in slide-in-from-right-2 duration-300' : 'hidden'}>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Recurrence
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Repeat
                  </label>
                  <select
                    value={recurrenceFrequency}
                    onChange={(e) => setRecurrenceFrequency(e.target.value as RecurrenceFrequency | 'none')}
                    className={selectClass}
                  >
                    {RECURRENCE_FREQUENCIES.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                {recurrenceFrequency !== 'none' && (
                  <>
                    {/* Day picker for weekly / biweekly */}
                    {(recurrenceFrequency === 'weekly' || recurrenceFrequency === 'biweekly') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          On days
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {DAYS_OF_WEEK.map((d) => (
                            <button
                              key={d.value}
                              type="button"
                              onClick={() => {
                                setRecurrenceDays((prev) =>
                                  prev.includes(d.value)
                                    ? prev.filter((v) => v !== d.value)
                                    : [...prev, d.value].sort()
                                );
                              }}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                recurrenceDays.includes(d.value)
                                  ? 'bg-cranberry text-white shadow-sm'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                              }`}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                          Leave empty to use the start date&apos;s day of week.
                        </p>
                      </div>
                    )}

                    {/* End condition */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Ends
                      </label>
                      <div className="flex gap-4 mb-3">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="recurrenceEnd"
                            checked={recurrenceEndType === 'occurrences'}
                            onChange={() => setRecurrenceEndType('occurrences')}
                            className="text-cranberry-600 focus:ring-cranberry-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">After # occurrences</span>
                        </label>
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="recurrenceEnd"
                            checked={recurrenceEndType === 'date'}
                            onChange={() => setRecurrenceEndType('date')}
                            className="text-cranberry-600 focus:ring-cranberry-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">On date</span>
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {recurrenceEndType === 'occurrences' ? (
                          <Input
                            label="Number of occurrences"
                            type="number"
                            min="2"
                            max="52"
                            value={recurrenceOccurrences}
                            onChange={(e) => setRecurrenceOccurrences(e.target.value)}
                            helperText="Max 52"
                          />
                        ) : (
                          <Input
                            label="End by date"
                            type="date"
                            value={recurrenceEndDate}
                            onChange={(e) => setRecurrenceEndDate(e.target.value)}
                            helperText="Last occurrence on or before this date"
                          />
                        )}
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-blue-700 dark:text-blue-300">
                      <p className="font-medium">🔁 This will create multiple events:</p>
                      <p className="text-xs mt-1">
                        {recurrenceFrequency === 'daily' && 'One event per day'}
                        {recurrenceFrequency === 'weekly' && `Every week${recurrenceDays.length > 0 ? ` on ${recurrenceDays.map(d => DAYS_OF_WEEK[d].label).join(', ')}` : ''}`}
                        {recurrenceFrequency === 'biweekly' && `Every 2 weeks${recurrenceDays.length > 0 ? ` on ${recurrenceDays.map(d => DAYS_OF_WEEK[d].label).join(', ')}` : ''}`}
                        {recurrenceFrequency === 'monthly' && 'Once per month on the same day'}
                        {recurrenceEndType === 'occurrences'
                          ? `, ${recurrenceOccurrences} occurrence${parseInt(recurrenceOccurrences) !== 1 ? 's' : ''} total`
                          : recurrenceEndDate ? ` until ${new Date(recurrenceEndDate).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Section: Location ── */}
          <div className={activeStep === 2 ? 'animate-in fade-in slide-in-from-right-2 duration-300' : 'hidden'}>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Location
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Venue / Location Name"
                placeholder="e.g. The Roosevelt Hotel"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
              <Input
                label="Full Address (optional)"
                placeholder="e.g. 45 E 45th St, New York, NY 10017"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          {/* ── Section: Pricing (conditional) ── */}
          {showPricing && (
            <div className={activeStep === 3 ? 'animate-in fade-in slide-in-from-right-2 duration-300' : 'hidden'}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Pricing
                </h3>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{useTiers ? 'Tier Pricing' : 'Simple Pricing'}</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={useTiers}
                      onChange={(e) => {
                        setUseTiers(e.target.checked);
                        if (e.target.checked && tiers.length === 0) {
                          // Seed with 2 default tiers
                          setTiers([
                            { id: 'early-bird', label: 'Early Bird', description: '', memberPrice: '', guestPrice: '', capacity: '', deadline: '' },
                            { id: 'general', label: 'General Admission', description: '', memberPrice: '', guestPrice: '', capacity: '', deadline: '' },
                          ]);
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cranberry-500/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-cranberry-600" />
                  </div>
                </label>
              </div>

              {useTiers ? (
                /* ── Tier Builder ── */
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Create multiple pricing tiers (e.g. Early Bird, General, VIP). Each tier can have its own price, capacity, and deadline.
                  </p>

                  {tiers.map((tier, i) => (
                    <div key={i} className="relative border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3 bg-gray-50/50 dark:bg-gray-800/30">
                      {/* Tier header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cranberry-100 dark:bg-cranberry-900/40 text-cranberry text-xs font-bold">
                            {i + 1}
                          </span>
                          <input
                            type="text"
                            value={tier.label}
                            onChange={(e) => updateTier(i, 'label', e.target.value)}
                            placeholder="Tier name"
                            className="text-sm font-semibold bg-transparent border-none focus:outline-none text-gray-900 dark:text-white placeholder:text-gray-400 w-40"
                          />
                        </div>
                        {tiers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTier(i)}
                            className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Remove tier"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>

                      {/* Tier ID + Description */}
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="Tier ID"
                          placeholder="early-bird"
                          value={tier.id}
                          onChange={(e) => updateTier(i, 'id', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                          helperText="Unique identifier"
                        />
                        <Input
                          label="Description"
                          placeholder="Includes priority seating"
                          value={tier.description}
                          onChange={(e) => updateTier(i, 'description', e.target.value)}
                          helperText="Optional perks"
                        />
                      </div>

                      {/* Prices */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <Input
                          label="Member ($)"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={tier.memberPrice}
                          onChange={(e) => updateTier(i, 'memberPrice', e.target.value)}
                          required
                        />
                        <Input
                          label="Guest ($)"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="25.00"
                          value={tier.guestPrice}
                          onChange={(e) => updateTier(i, 'guestPrice', e.target.value)}
                          required
                        />
                        <Input
                          label="Capacity"
                          type="number"
                          min="1"
                          placeholder="∞"
                          value={tier.capacity}
                          onChange={(e) => updateTier(i, 'capacity', e.target.value)}
                          helperText="Per-tier cap"
                        />
                        <Input
                          label="Deadline"
                          type="date"
                          value={tier.deadline}
                          onChange={(e) => updateTier(i, 'deadline', e.target.value)}
                          helperText="Auto-closes after"
                        />
                      </div>
                    </div>
                  ))}

                  {/* Add tier button */}
                  <button
                    type="button"
                    onClick={addTier}
                    className="w-full py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:border-cranberry hover:text-cranberry transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Tier
                  </button>

                  {/* Tier preview */}
                  {tiers.some((t) => t.memberPrice || t.guestPrice) && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm">
                      <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">Tier Preview:</p>
                      <div className="space-y-1.5">
                        {tiers.map((t, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-gray-600 dark:text-gray-400">{t.label || `Tier ${i + 1}`}</span>
                            <div className="flex gap-3">
                              <span className="text-cranberry-700 dark:text-cranberry-300">
                                {parseFloat(t.memberPrice || '0') === 0 ? 'Free' : `$${parseFloat(t.memberPrice || '0').toFixed(2)}`} member
                              </span>
                              <span className="text-gray-500">
                                ${parseFloat(t.guestPrice || '0').toFixed(2)} guest
                              </span>
                              {t.capacity && <span className="text-gray-400">{t.capacity} spots</span>}
                              {t.deadline && <span className="text-gray-400">until {new Date(t.deadline).toLocaleDateString()}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ── Legacy Simple Pricing ── */
                <>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Enter prices in dollars (e.g. 15.00). Set member price to 0 for free member admission.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Input
                      label="Member Price ($)"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={memberPrice}
                      onChange={(e) => setMemberPrice(e.target.value)}
                      helperText={type === 'hybrid' ? 'Usually $0 for hybrid' : undefined}
                    />
                    <Input
                      label="Guest Price ($)"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="25.00"
                      value={guestPrice}
                      onChange={(e) => setGuestPrice(e.target.value)}
                      required
                    />
                    <Input
                      label="Early Bird Price ($)"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="10.00"
                      value={earlyBirdPrice}
                      onChange={(e) => setEarlyBirdPrice(e.target.value)}
                      helperText="Optional discount"
                    />
                    <Input
                      label="Early Bird Deadline"
                      type="date"
                      value={earlyBirdDeadline}
                      onChange={(e) => setEarlyBirdDeadline(e.target.value)}
                      helperText="When early bird ends"
                    />
                  </div>

                  {/* Pricing preview */}
                  {(memberPrice || guestPrice) && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm">
                      <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Pricing Preview:</p>
                      <div className="flex flex-wrap gap-3 text-xs">
                        <span className="bg-cranberry-50 dark:bg-cranberry-900/20 text-cranberry-700 dark:text-cranberry-300 px-2 py-1 rounded-lg font-semibold">
                          {parseFloat(memberPrice || '0') === 0 ? 'Free' : `$${parseFloat(memberPrice || '0').toFixed(2)}`} member
                        </span>
                        <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-lg font-semibold">
                          ${parseFloat(guestPrice || '0').toFixed(2)} guest
                        </span>
                        {earlyBirdPrice && (
                          <span className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-1 rounded-lg font-semibold">
                            Early bird ${parseFloat(earlyBirdPrice).toFixed(2)} early bird
                            {earlyBirdDeadline && ` (until ${new Date(earlyBirdDeadline).toLocaleDateString()})`}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Section: Additional Details ── */}
          <div className={activeStep === 3 ? 'animate-in fade-in slide-in-from-right-2 duration-300' : 'hidden'}>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Additional Details
            </h3>
            <div className="space-y-4">
              {/* Cover Image Upload */}
              <div>
                <FileUpload
                  label="Cover Image (optional)"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  maxSizeMB={10}
                  onChange={(files) => {
                    if (files[0]) {
                      setImageFile(files[0]);
                      setImagePreview(URL.createObjectURL(files[0]));
                    }
                  }}
                  helperText="JPG, PNG, WebP, or GIF. Max 10MB."
                />
                {imagePreview && (
                  <div className="mt-3 relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="Cover preview"
                      className="w-full h-40 object-cover rounded-xl border border-gray-200 dark:border-gray-700"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                        setImageURL('');
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-black/70"
                      aria-label="Remove image"
                    >
                      <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    {uploadProgress !== null && (
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-b-xl overflow-hidden">
                        <div
                          className="h-full bg-cranberry transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Input
                label="Capacity (optional)"
                type="number"
                min="1"
                placeholder="e.g. 50"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                helperText="Leave empty for unlimited"
              />

              <Input
                label="Tags"
                placeholder="networking, social, professional (comma-separated)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                helperText="Comma-separated tags for filtering"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'draft' | 'published' | 'cancelled')}
                    className={selectClass}
                  >
                    {EVENT_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    Only published events appear on the public site.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cranberry-500/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-cranberry-600" />
                  </label>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Public Event</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Visible on the public website</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
            <div>
              {activeStep > 0 && (
                <Button type="button" variant="ghost" onClick={() => setActiveStep((s) => s - 1)}>
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </Button>
              )}
              {activeStep === 0 && (
                <Button type="button" variant="ghost" onClick={handleClose}>
                  Cancel
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <p className="text-[10px] text-gray-400 hidden sm:block">
                {showPricing ? 'Stripe checkout for paid tickets' : 'Free — direct RSVP'}
              </p>
              {activeStep < STEPS.length - 1 ? (
                <Button type="button" onClick={() => setActiveStep((s) => s + 1)}>
                  Next
                  <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              ) : (
                <Button type="submit" loading={loading}>
                  {isEdit ? 'Update Event' : 'Create Event'}
                </Button>
              )}
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
