'use client';

import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useAuth } from '@/lib/firebase/auth';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getFirebaseClientApp } from '@/lib/firebase/client';
import { Event } from '@/types/portal';

interface LogServiceHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormData {
  eventId: string;
  eventName: string;
  hours: number;
  date: Date;
  notes: string;
}

export default function LogServiceHoursModal({ isOpen, onClose, onSuccess }: LogServiceHoursModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    eventId: '',
    eventName: '',
    hours: 2,
    date: new Date(),
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadRecentEvents();
    } else {
      // Reset form when modal closes
      setStep(1);
      setFormData({
        eventId: '',
        eventName: '',
        hours: 2,
        date: new Date(),
        notes: '',
      });
    }
  }, [isOpen]);

  const loadRecentEvents = async () => {
    setLoadingEvents(true);
    const app = getFirebaseClientApp();
    if (!app) return;

    const db = getFirestore(app);
    
    try {
      // Get events from the past 60 days (from portalEvents collection)
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      
      const eventsRef = collection(db, 'portalEvents');
      const eventsQuery = query(
        eventsRef,
        where('startAt', '>=', Timestamp.fromDate(sixtyDaysAgo)),
        orderBy('startAt', 'desc'),
        limit(10)
      );
      
      const snapshot = await getDocs(eventsQuery);
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Event[];
      
      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleEventSelect = (event: Event | null) => {
    if (event) {
      setFormData({
        ...formData,
        eventId: event.id,
        eventName: event.title,
        date: event.startAt.toDate(),
      });
    } else {
      // "Other" option
      setFormData({
        ...formData,
        eventId: 'other',
        eventName: '',
        date: new Date(),
      });
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!user || !formData.eventName || formData.hours <= 0) return;

    setSubmitting(true);
    
    try {
      // Get the user's ID token
      const token = await user.getIdToken();
      
      const response = await fetch('/api/portal/service-hours', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventId: formData.eventId,
          eventName: formData.eventName,
          hours: formData.hours,
          date: formData.date.toISOString(),
          notes: formData.notes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit service hours');
      }

      // Success!
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error) {
      console.error('Error submitting service hours:', error);
      alert('Failed to submit service hours. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const getEventIcon = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('food') || lowerTitle.includes('kitchen')) return 'restaurant';
    if (lowerTitle.includes('park') || lowerTitle.includes('clean')) return 'nature_people';
    if (lowerTitle.includes('school') || lowerTitle.includes('mentor') || lowerTitle.includes('education')) return 'school';
    if (lowerTitle.includes('fundrais')) return 'volunteer_activism';
    return 'event';
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-[#1c222b] shadow-2xl transition-all">
                {/* Header */}
                <div className="border-b border-gray-100 dark:border-white/5 px-8 py-6">
                  <Dialog.Title className="text-2xl font-extrabold text-[#141414] dark:text-white">
                    Log Your Impact
                  </Dialog.Title>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Every minute matters. Share your latest service contribution.
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="px-8 pt-6 pb-2">
                  <div className="flex justify-between items-center mb-3 text-xs font-bold uppercase tracking-wider text-primary">
                    <span>Step {step} of 3</span>
                    <span>
                      {step === 1 && 'Select Event'}
                      {step === 2 && 'Log Time'}
                      {step === 3 && 'Add Details'}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${(step / 3) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="px-8 py-6 min-h-[400px]">
                  {/* Step 1: Event Selection */}
                  {step === 1 && (
                    <div className="space-y-6">
                      <h2 className="text-xl font-bold text-center text-[#141414] dark:text-white">
                        Which event did you attend?
                      </h2>
                      
                      {loadingEvents ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2">
                          {events.map((event) => (
                            <button
                              key={event.id}
                              onClick={() => handleEventSelect(event)}
                              className="flex items-center gap-4 p-5 rounded-xl border-2 border-gray-100 dark:border-white/10 hover:border-primary/50 dark:hover:border-primary/50 text-left transition-all group bg-white dark:bg-transparent"
                            >
                              <div className="size-12 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-white/60 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                <span className="material-symbols-outlined">{getEventIcon(event.title)}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-[#141414] dark:text-white truncate">{event.title}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatDate(event.startAt.toDate())}
                                </p>
                              </div>
                              <span className="material-symbols-outlined text-gray-300 dark:text-white/20 group-hover:text-primary transition-colors">
                                arrow_forward
                              </span>
                            </button>
                          ))}
                          
                          {/* Other Option */}
                          <button
                            onClick={() => handleEventSelect(null)}
                            className="flex items-center gap-4 p-5 rounded-xl border-2 border-gray-100 dark:border-white/10 hover:border-primary/50 dark:hover:border-primary/50 text-left transition-all group bg-white dark:bg-transparent"
                          >
                            <div className="size-12 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-white/60 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                              <span className="material-symbols-outlined">more_horiz</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-[#141414] dark:text-white">Other Activity</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Specify event name</p>
                            </div>
                            <span className="material-symbols-outlined text-gray-300 dark:text-white/20 group-hover:text-primary transition-colors">
                              arrow_forward
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 2: Log Time */}
                  {step === 2 && (
                    <div className="space-y-8">
                      <h2 className="text-xl font-bold text-center text-[#141414] dark:text-white">
                        How many hours did you contribute?
                      </h2>
                      
                      {/* Event Name Input (if "Other" selected) */}
                      {formData.eventId === 'other' && (
                        <div>
                          <label className="block text-sm font-bold text-[#141414] dark:text-white mb-2">
                            Event Name *
                          </label>
                          <input
                            type="text"
                            value={formData.eventName}
                            onChange={(e) => setFormData({ ...formData, eventName: e.target.value })}
                            placeholder="e.g., Community Food Drive"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-[#141414] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            required
                          />
                        </div>
                      )}

                      {/* Date Picker */}
                      <div>
                        <label className="block text-sm font-bold text-[#141414] dark:text-white mb-2">
                          Event Date
                        </label>
                        <input
                          type="date"
                          value={formData.date.toISOString().split('T')[0]}
                          onChange={(e) => setFormData({ ...formData, date: new Date(e.target.value) })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-[#141414] dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>

                      {/* Hours Picker */}
                      <div className="flex items-center justify-center bg-gray-50 dark:bg-white/5 p-8 rounded-2xl">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, hours: Math.max(0.5, formData.hours - 0.5) })}
                          className="size-14 rounded-full bg-white dark:bg-[#2a2a2a] shadow-sm flex items-center justify-center text-[#141414] dark:text-white hover:bg-gray-50 dark:hover:bg-[#333] transition-colors border border-gray-200 dark:border-white/10"
                        >
                          <span className="material-symbols-outlined">remove</span>
                        </button>
                        
                        <div className="mx-8 text-center min-w-[120px]">
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            value={formData.hours}
                            onChange={(e) => setFormData({ ...formData, hours: Math.max(0.5, parseFloat(e.target.value) || 0.5) })}
                            className="text-5xl font-black text-[#141414] dark:text-white bg-transparent text-center w-full focus:outline-none"
                          />
                          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-white/40 mt-1">
                            Hours
                          </p>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, hours: formData.hours + 0.5 })}
                          className="size-14 rounded-full bg-white dark:bg-[#2a2a2a] shadow-sm flex items-center justify-center text-[#141414] dark:text-white hover:bg-gray-50 dark:hover:bg-[#333] transition-colors border border-gray-200 dark:border-white/10"
                        >
                          <span className="material-symbols-outlined">add</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Notes */}
                  {step === 3 && (
                    <div className="space-y-6">
                      <h2 className="text-xl font-bold text-center text-[#141414] dark:text-white">
                        Tell us about your experience
                      </h2>
                      
                      {/* Summary Card */}
                      <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-5 border border-gray-100 dark:border-white/10">
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Event</p>
                            <p className="text-lg font-bold text-[#141414] dark:text-white mt-1">{formData.eventName}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Hours</p>
                            <p className="text-lg font-bold text-primary mt-1">{formData.hours}</p>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/10">
                          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Date</p>
                          <p className="text-sm font-medium text-[#141414] dark:text-white mt-1">{formatDate(formData.date)}</p>
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-bold text-[#141414] dark:text-white mb-2">
                          Notes (Optional)
                        </label>
                        <textarea
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="Share any highlights, learnings, or reflections from your service..."
                          rows={6}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-[#141414] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                        />
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          Your notes will be reviewed by the Service Chair before approval.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="border-t border-gray-100 dark:border-white/5 px-8 py-6">
                  <div className="flex gap-4">
                    {step > 1 && (
                      <button
                        onClick={() => setStep(step - 1)}
                        disabled={submitting}
                        className="flex-1 h-12 rounded-xl border-2 border-gray-200 dark:border-white/10 font-bold text-[#141414] dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Back
                      </button>
                    )}
                    
                    {step < 3 ? (
                      <button
                        onClick={() => setStep(step + 1)}
                        disabled={step === 2 && formData.eventId === 'other' && !formData.eventName}
                        className="flex-[2] h-12 bg-primary text-white font-extrabold rounded-xl shadow-lg shadow-primary/20 hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
                      >
                        Next Step
                        <span className="material-symbols-outlined">arrow_forward</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleSubmit}
                        disabled={submitting || !formData.eventName || formData.hours <= 0}
                        className="flex-[2] h-12 bg-primary text-white font-extrabold rounded-xl shadow-lg shadow-primary/20 hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
                      >
                        {submitting ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            Submitting...
                          </>
                        ) : (
                          <>
                            Submit for Review
                            <span className="material-symbols-outlined">check_circle</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  
                  {step === 1 && (
                    <button
                      onClick={onClose}
                      className="w-full mt-3 h-12 rounded-xl font-bold text-gray-600 dark:text-gray-400 hover:text-[#141414] dark:hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
