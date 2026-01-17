'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth';
import { getFirebaseClientApp } from '@/lib/firebase/client';
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { Event, RSVPStatus } from '@/types/portal';

export default function PortalEventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [rsvp, setRsvp] = useState<RSVPStatus | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      void load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, id]);

  const load = async () => {
    const app = getFirebaseClientApp();
    if (!app || !user) return;
    const db = getFirestore(app);

    setLoadingData(true);
    try {
      const eventRef = doc(db, 'portalEvents', String(id));
      const snap = await getDoc(eventRef);
      if (!snap.exists()) {
        setEvent(null);
        return;
      }
      setEvent({ id: snap.id, ...(snap.data() as any) } as Event);

      const rsvpRef = doc(db, 'portalEvents', String(id), 'rsvps', user.uid);
      const rsvpSnap = await getDoc(rsvpRef);
      setRsvp(rsvpSnap.exists() ? ((rsvpSnap.data() as any).status as RSVPStatus) : null);
    } catch (e) {
      console.error('Error loading event detail:', e);
      setEvent(null);
    } finally {
      setLoadingData(false);
    }
  };

  const setRsvpStatus = async (status: RSVPStatus) => {
    if (!user) return;
    const app = getFirebaseClientApp();
    if (!app) return;
    const db = getFirestore(app);

    setSaving(true);
    try {
      await setDoc(
        doc(db, 'portalEvents', String(id), 'rsvps', user.uid),
        {
          uid: user.uid,
          eventId: String(id),
          status,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setRsvp(status);
    } catch (e) {
      console.error('Error updating RSVP:', e);
      alert('Failed to update RSVP. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const when = useMemo(() => {
    if (!event?.startAt) return '';
    const start = (event.startAt as unknown as Timestamp).toDate?.()
      ? (event.startAt as unknown as Timestamp).toDate()
      : new Date();
    return start.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [event?.startAt]);

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white dark:bg-[#1e1e1e] rounded-xl border border-gray-200 dark:border-[#2a2a2a] p-6">
          <h1 className="text-xl font-bold">Event not found</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            This event may have been removed.
          </p>
          <button
            onClick={() => router.push('/portal/events')}
            className="mt-4 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold"
          >
            Back to events
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white dark:bg-[#1e1e1e] rounded-xl border border-gray-200 dark:border-[#2a2a2a] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-primary dark:text-white">{event.title}</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{when}</p>
            {event.location ? (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{event.location}</p>
            ) : null}
          </div>
          <button
            onClick={() => router.push('/portal/events')}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-[#2a2a2a] text-sm font-semibold"
          >
            Back
          </button>
        </div>

        {event.description ? (
          <p className="mt-5 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{event.description}</p>
        ) : null}

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-[#2a2a2a]">
          <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">RSVP</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setRsvpStatus('going')}
              disabled={saving}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                rsvp === 'going'
                  ? 'bg-primary text-white border-primary'
                  : 'border-gray-200 dark:border-[#2a2a2a]'
              }`}
            >
              Going
            </button>
            <button
              onClick={() => setRsvpStatus('maybe')}
              disabled={saving}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                rsvp === 'maybe'
                  ? 'bg-primary text-white border-primary'
                  : 'border-gray-200 dark:border-[#2a2a2a]'
              }`}
            >
              Maybe
            </button>
            <button
              onClick={() => setRsvpStatus('not')}
              disabled={saving}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                rsvp === 'not'
                  ? 'bg-primary text-white border-primary'
                  : 'border-gray-200 dark:border-[#2a2a2a]'
              }`}
            >
              Can't go
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
