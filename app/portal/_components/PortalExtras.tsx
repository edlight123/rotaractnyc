'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getFirebaseClientApp } from '@/lib/firebase/client';
import { Event } from '@/types/portal';

export default function PortalExtras() {
  const [nextEvent, setNextEvent] = useState<Event | null>(null);

  useEffect(() => {
    loadNextEvent();
  }, []);

  const loadNextEvent = async () => {
    const app = getFirebaseClientApp();
    if (!app) return;

    const db = getFirestore(app);
    
    try {
      const eventsRef = collection(db, 'events');
      const now = Timestamp.now();
      const nextEventQuery = query(
        eventsRef,
        where('visibility', '==', 'member'),
        where('startAt', '>=', now),
        orderBy('startAt', 'asc'),
        limit(1)
      );
      const snapshot = await getDocs(nextEventQuery);
      const doc = snapshot.docs[0];

      if (doc) {
        setNextEvent({ id: doc.id, ...doc.data() } as Event);
      } else {
        setNextEvent(null);
      }
    } catch (err) {
      console.error('Error loading next event:', err);
    }
  };

  const getTimeUntilEvent = (startAt: Timestamp) => {
    const now = Date.now();
    const eventTime = startAt.toDate().getTime();
    const diffDays = Math.ceil((eventTime - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} Days`;
  };

  return (
    <aside className="hidden lg:block w-[320px] shrink-0 sticky top-24 space-y-6">
      {/* Member of the Month Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 relative overflow-hidden group">
        {/* Badge */}
        <div className="absolute top-0 right-0 bg-[#17b0cf] text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-lg z-10">
          Member of the Month
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4 mt-2">
            <div className="absolute inset-0 bg-[#17b0cf]/20 rounded-full blur-xl transform group-hover:scale-110 transition-transform duration-500" />
            <div 
              className="size-24 rounded-full bg-cover bg-center border-4 border-white dark:border-gray-800 shadow-md relative z-10" 
              style={{ backgroundImage: 'url(https://lh3.googleusercontent.com/aida-public/AB6AXuCG-KVViibHBCniL4SvgqfNEvetmQoWED5rN7SV89Nw5HCwnoeeX-Ny26wPvsTwHshDjqmPF2tzSP5gvJvxN3bYnALawgl1swUKBAUJ3Wwr7F0peTcB00BChAVFz9qV6Iy2rXdycfBv0Bb2K2yqjxKQLpjjC-t5d-uj8r0XkgO__dDfvHGaJoQppVYAkNez-F79qefPolGQ-aMWxVH7Wh40PDUGOXufpPueuufSBsU5O2KrJZkjZIPUyIA82zKvB1AuUu1jgA2qZR4)' }}
            />
            <div className="absolute bottom-0 right-0 bg-[#FCCE10] text-amber-900 p-1.5 rounded-full border-2 border-white dark:border-gray-800 z-20 flex items-center justify-center">
              <span className="material-symbols-filled text-[14px]">star</span>
            </div>
          </div>
          <h3 className="text-lg font-black text-gray-900 dark:text-white">Alex Johnson</h3>
          <p className="text-sm text-[#17b0cf] font-medium mb-3">Community Lead</p>
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 w-full mb-3">
            <p className="text-xs italic text-gray-600 dark:text-gray-400">
              "Alex organized the entire winter food drive single-handedly, collecting over 500lbs of food!"
            </p>
          </div>
          <Link 
            href="/portal/directory"
            className="text-xs font-bold text-gray-500 hover:text-[#17b0cf] transition-colors flex items-center gap-1"
          >
            View Profile <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </div>
      </div>

      {/* Celebrations Module */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#EE8899]">cake</span> Celebrations
        </h3>
        <div className="flex flex-col gap-4">
          {/* Birthday Item */}
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#EE8899]/10 flex items-center justify-center text-[#EE8899] shrink-0">
              <span className="material-symbols-filled text-[18px]">cake</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Sarah's Birthday</p>
              <p className="text-xs text-gray-500">Turning 26 • Tomorrow</p>
            </div>
            <button className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded hover:bg-[#EE8899] hover:text-white transition-colors">
              Gift
            </button>
          </div>
          
          {/* Anniversary Item */}
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center text-purple-500 shrink-0">
              <span className="material-symbols-filled text-[18px]">verified</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Mike's Anniversary</p>
              <p className="text-xs text-gray-500">3 Years in Club • Friday</p>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
          <Link href="/portal/events" className="text-xs font-bold text-[#17b0cf] hover:text-cyan-600">
            View All Events
          </Link>
        </div>
      </div>

      {/* Mini Calendar Widget */}
      {nextEvent ? (
        <div className="bg-[#17b0cf]/5 rounded-xl p-5 border border-[#17b0cf]/10">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[#17b0cf] font-bold text-sm">Next Meetup</h3>
            <span className="text-xs bg-white dark:bg-gray-800 text-[#17b0cf] px-2 py-0.5 rounded shadow-sm font-bold">
              {getTimeUntilEvent(nextEvent.startAt)}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-black text-gray-900 dark:text-white leading-tight">
              {nextEvent.title}
            </p>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">location_on</span>
              {nextEvent.location}
            </p>
          </div>
          <Link 
            href={`/portal/events/${nextEvent.id}`}
            className="mt-3 w-full bg-[#17b0cf] text-white text-xs font-bold py-2 rounded-lg shadow-md shadow-[#17b0cf]/20 hover:bg-cyan-600 transition-colors block text-center"
          >
            RSVP Now
          </Link>
        </div>
      ) : (
        <div className="bg-[#17b0cf]/5 rounded-xl p-5 border border-[#17b0cf]/10">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[#17b0cf] font-bold text-sm">Next Meetup</h3>
          </div>
          <p className="text-sm text-gray-500">No upcoming events</p>
          <Link 
            href="/portal/events"
            className="mt-3 w-full bg-[#17b0cf] text-white text-xs font-bold py-2 rounded-lg shadow-md shadow-[#17b0cf]/20 hover:bg-cyan-600 transition-colors block text-center"
          >
            View All Events
          </Link>
        </div>
      )}
    </aside>
  );
}
