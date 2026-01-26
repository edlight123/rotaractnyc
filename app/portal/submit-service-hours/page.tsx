'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, orderBy, limit, Timestamp, addDoc } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getFirebaseClientApp } from '@/lib/firebase/client';
import { Event, ServiceHourSubmission } from '@/types/portal';

interface FormData {
  eventId: string;
  eventName: string;
  hours: number;
  date: Date;
  notes: string;
}

export default function SubmitServiceHoursPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [events, setEvents] = useState<Event[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<ServiceHourSubmission[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    eventId: '',
    eventName: '',
    hours: 2,
    date: new Date(),
    notes: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/portal/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      loadRecentEvents();
      loadRecentSubmissions();
    }
  }, [user]);

  const loadRecentEvents = async () => {
    const app = getFirebaseClientApp();
    if (!app) return;

    const db = getFirestore(app);
    
    try {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      
      const eventsRef = collection(db, 'events');
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

  const loadRecentSubmissions = async () => {
    if (!user) return;
    
    const app = getFirebaseClientApp();
    if (!app) return;

    const db = getFirestore(app);
    
    try {
      const hoursRef = collection(db, 'serviceHours');
      const hoursQuery = query(
        hoursRef,
        where('uid', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(3)
      );
      
      const snapshot = await getDocs(hoursQuery);
      const submissions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ServiceHourSubmission[];
      
      setRecentSubmissions(submissions);
    } catch (error) {
      console.error('Error loading recent submissions:', error);
    }
  };

  const handleEventSelect = (event: Event | null, isCustom: boolean = false) => {
    if (isCustom) {
      setFormData({
        ...formData,
        eventId: 'other',
        eventName: '',
        date: new Date(),
      });
    } else if (event) {
      setFormData({
        ...formData,
        eventId: event.id,
        eventName: event.title,
        date: event.startAt.toDate(),
      });
    }
    setStep(2);
  };

  const adjustHours = (delta: number) => {
    const newHours = Math.max(0.5, Math.min(24, formData.hours + delta));
    setFormData({ ...formData, hours: newHours });
  };

  const handleSubmit = async () => {
    if (!user || !formData.eventName || formData.hours <= 0) return;

    setSubmitting(true);
    
    try {
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

      // Success - redirect to portal
      router.push('/portal?submitted=true');
    } catch (error) {
      console.error('Error submitting service hours:', error);
      alert('Failed to submit service hours. Please try again.');
      setSubmitting(false);
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.push('/portal');
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return 'Which event did you attend?';
      case 2:
        return 'How many hours did you contribute?';
      case 3:
        return 'Review your submission';
      default:
        return '';
    }
  };

  const getStepName = () => {
    switch (step) {
      case 1:
        return 'Select Event';
      case 2:
        return 'Log Time';
      case 3:
        return 'Review';
      default:
        return '';
    }
  };

  const progressPercentage = (step / 3) * 100;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-20 bg-white dark:bg-[#1e1e1e] border-b border-gray-200 dark:border-[#2a2a2a] px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/portal')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Log Service Hours</h1>
          <button
            onClick={() => setShowSidebar(true)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300"
          >
            <span className="material-symbols-outlined">history</span>
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar: Recent Activity - Desktop */}
        <aside className="hidden lg:flex w-80 min-h-screen border-r border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] flex-col p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="size-10 bg-gradient-to-br from-primary to-primary-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined">volunteer_activism</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Service Hours</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Track your impact</p>
            </div>
          </div>
          
          <div className="flex-1">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
              Recent Submissions
            </h3>
            <div className="space-y-3">
              {recentSubmissions.length > 0 ? (
                recentSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="p-4 rounded-xl border border-gray-200 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#141414] hover:shadow-sm transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">
                        {submission.eventName}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          submission.status === 'approved'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : submission.status === 'rejected'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {submission.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {submission.date.toDate().toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      • <span className="font-semibold text-primary">{submission.hours}h</span>
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-6 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-center">
                  <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600 mb-2">history</span>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No submissions yet
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Your logged hours will appear here
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-auto pt-6 border-t border-gray-200 dark:border-[#2a2a2a] space-y-2">
            <button
              onClick={() => router.push('/portal')}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors"
            >
              <span className="material-symbols-outlined text-gray-500 dark:text-gray-400">
                dashboard
              </span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Back to Portal
              </span>
            </button>
            <button
              onClick={() => router.push('/portal/settings')}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors"
            >
              <span className="material-symbols-outlined text-gray-500 dark:text-gray-400">
                account_circle
              </span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                My Profile
              </span>
            </button>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {showSidebar && (
          <>
            <div 
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowSidebar(false)}
            />
            <div className="lg:hidden fixed inset-y-0 right-0 w-80 bg-white dark:bg-[#1e1e1e] z-50 p-6 overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Activity</h3>
                <button onClick={() => setShowSidebar(false)} className="text-gray-500">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="space-y-3">
                {recentSubmissions.length > 0 ? (
                  recentSubmissions.map((submission) => (
                    <div
                      key={submission.id}
                      className="p-4 rounded-xl border border-gray-200 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#141414]"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">
                          {submission.eventName}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            submission.status === 'approved'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : submission.status === 'rejected'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {submission.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {submission.date.toDate().toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        • <span className="font-semibold text-primary">{submission.hours}h</span>
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-6 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No submissions yet</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 min-h-[calc(100vh-57px)] lg:min-h-screen relative overflow-hidden">
          {/* Subtle background elements */}
          <div className="absolute top-[-10%] right-[-10%] size-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-[-10%] left-[-5%] size-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="w-full max-w-2xl z-10">
            {/* Progress Header */}
            <div className="mb-8 text-center">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-gray-900 dark:text-white">
                Log Your Impact
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base max-w-sm mx-auto">
                Every minute matters. Share your latest service contribution with the club.
              </p>
            </div>

            {/* Focus Card */}
            <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl border border-gray-200 dark:border-[#2a2a2a] p-6 sm:p-10">
              {/* Progress Bar */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">
                    Step {step} of 3
                  </span>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {getStepName()}
                  </span>
                </div>
                <div className="h-2 w-full bg-gray-100 dark:bg-[#2a2a2a] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary-400 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Step Content */}
              <div className="space-y-6">
                <h2 className="text-xl sm:text-2xl font-bold text-center text-gray-900 dark:text-white">
                  {getStepTitle()}
                </h2>

                {/* Step 1: Event Selection */}
                {step === 1 && (
                  <div className="grid grid-cols-1 gap-3">
                    {loadingEvents ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading events...</p>
                      </div>
                    ) : (
                      <>
                        {events.slice(0, 4).map((event) => (
                          <button
                            key={event.id}
                            onClick={() => handleEventSelect(event)}
                            className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                              formData.eventId === event.id
                                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                : 'border-gray-200 dark:border-[#2a2a2a] hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'
                            } group`}
                          >
                            <div
                              className={`size-12 rounded-xl flex items-center justify-center transition-colors ${
                                formData.eventId === event.id
                                  ? 'bg-primary text-white'
                                  : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-500 dark:text-gray-400 group-hover:bg-primary/10 group-hover:text-primary'
                              }`}
                            >
                              <span className="material-symbols-outlined">volunteer_activism</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 dark:text-white truncate">
                                {event.title}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {event.startAt.toDate().toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </p>
                            </div>
                            {formData.eventId === event.id && (
                              <span className="material-symbols-outlined text-primary">
                                check_circle
                              </span>
                            )}
                          </button>
                        ))}
                        
                        <button
                          onClick={() => handleEventSelect(null, true)}
                          className="flex items-center gap-4 p-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] text-left transition-all group"
                        >
                          <div className="size-12 rounded-xl bg-gray-100 dark:bg-[#2a2a2a] flex items-center justify-center text-gray-400 dark:text-gray-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <span className="material-symbols-outlined">add</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 dark:text-white">
                              Other Activity
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Enter event details manually
                            </p>
                          </div>
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Step 2: Log Hours */}
                {step === 2 && (
                  <div className="space-y-6">
                    {formData.eventId === 'other' && (
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                          Event Name
                        </label>
                        <input
                          type="text"
                          value={formData.eventName}
                          onChange={(e) =>
                            setFormData({ ...formData, eventName: e.target.value })
                          }
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#141414] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                          placeholder="e.g., Park Cleanup, Food Drive"
                        />
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                        Date of Service
                      </label>
                      <input
                        type="date"
                        value={formData.date.toISOString().split('T')[0]}
                        onChange={(e) =>
                          setFormData({ ...formData, date: new Date(e.target.value) })
                        }
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#141414] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
                        Hours Contributed
                      </label>
                      <div className="flex items-center justify-center gap-6 bg-gray-50 dark:bg-[#141414] p-6 rounded-2xl border border-gray-200 dark:border-[#2a2a2a]">
                        <button
                          onClick={() => adjustHours(-0.5)}
                          className="size-14 rounded-full bg-white dark:bg-[#2a2a2a] shadow-md border border-gray-200 dark:border-[#3a3a3a] flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] hover:scale-105 active:scale-95 transition-all"
                        >
                          <span className="material-symbols-outlined text-2xl">remove</span>
                        </button>
                        <div className="text-center min-w-[100px]">
                          <span className="text-5xl font-bold text-gray-900 dark:text-white">
                            {formData.hours}
                          </span>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                            {formData.hours === 1 ? 'Hour' : 'Hours'}
                          </p>
                        </div>
                        <button
                          onClick={() => adjustHours(0.5)}
                          className="size-14 rounded-full bg-white dark:bg-[#2a2a2a] shadow-md border border-gray-200 dark:border-[#3a3a3a] flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] hover:scale-105 active:scale-95 transition-all"
                        >
                          <span className="material-symbols-outlined text-2xl">add</span>
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">
                        Use +/- buttons to adjust in 30-minute increments
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 3: Review and Notes */}
                {step === 3 && (
                  <div className="space-y-6">
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 border border-primary/20">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Event</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2">
                            {formData.eventName}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {formData.date.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Hours</p>
                          <p className="text-2xl font-bold text-primary">
                            {formData.hours}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                        Additional Notes <span className="font-normal text-gray-400">(Optional)</span>
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData({ ...formData, notes: e.target.value })
                        }
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#141414] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none transition-all"
                        rows={3}
                        placeholder="Describe what you did, who you helped, or anything notable..."
                      />
                    </div>

                    <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
                      <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 flex-shrink-0">info</span>
                      <p className="text-sm text-amber-800 dark:text-amber-300">
                        Your submission will be reviewed by the Service Chair. You'll receive a notification once it's approved.
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={goBack}
                    disabled={submitting}
                    className="flex-1 h-12 sm:h-14 rounded-xl border-2 border-gray-200 dark:border-[#2a2a2a] font-semibold hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50"
                  >
                    {step === 1 ? 'Cancel' : 'Back'}
                  </button>
                  <button
                    onClick={() => {
                      if (step < 3) {
                        if (step === 2 && formData.eventId === 'other' && !formData.eventName) {
                          alert('Please enter an event name');
                          return;
                        }
                        setStep(step + 1);
                      } else {
                        handleSubmit();
                      }
                    }}
                    disabled={
                      submitting ||
                      (step === 1 && !formData.eventId) ||
                      (step === 2 && formData.eventId === 'other' && !formData.eventName)
                    }
                    className="flex-[2] h-12 sm:h-14 bg-primary hover:bg-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-lg"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        <span>Submitting...</span>
                      </>
                    ) : step === 3 ? (
                      <>
                        <span>Submit Hours</span>
                        <span className="material-symbols-outlined">check</span>
                      </>
                    ) : (
                      <>
                        <span>Continue</span>
                        <span className="material-symbols-outlined">arrow_forward</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Hint */}
            <p className="mt-6 text-center text-gray-400 dark:text-gray-500 text-sm">
              Questions? Contact the{' '}
              <a
                href="mailto:service@rotaractnyc.org"
                className="text-primary hover:underline font-medium"
              >
                Service Chair
              </a>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
