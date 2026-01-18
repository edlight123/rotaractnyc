'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getFirebaseClientApp } from '@/lib/firebase/client';
import { Event, User } from '@/types/portal';

export default function PortalExtras() {
  const [nextEvent, setNextEvent] = useState<Event | null>(null);
  const [memberOfMonth, setMemberOfMonth] = useState<User | null>(null);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<Array<{user: User, daysUntil: number}>>([]);

  useEffect(() => {
    loadNextEvent();
    loadMemberOfMonth();
    loadUpcomingBirthdays();
  }, []);

  const loadNextEvent = async () => {
    const app = getFirebaseClientApp();
    if (!app) return;

    const db = getFirestore(app);
    
    try {
      const eventsRef = collection(db, 'portalEvents');
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

  const loadMemberOfMonth = async () => {
    const app = getFirebaseClientApp();
    if (!app) return;

    const db = getFirestore(app);
    
    try {
      // First try to find a featured member
      const featuredQuery = query(
        collection(db, 'users'),
        where('status', '==', 'active'),
        where('featured', '==', true),
        limit(1)
      );
      
      const featuredSnapshot = await getDocs(featuredQuery);
      
      if (!featuredSnapshot.empty) {
        const doc = featuredSnapshot.docs[0];
        const data = doc.data();
        setMemberOfMonth({ ...data, uid: doc.id } as User);
      } else {
        // If no featured member, get a random active member
        const usersQuery = query(
          collection(db, 'users'),
          where('status', '==', 'active'),
          limit(25)
        );
        
        const snapshot = await getDocs(usersQuery);
        if (!snapshot.empty) {
          const users: User[] = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            users.push({ ...data, uid: doc.id } as User);
          });
          
          const randomUser = users[Math.floor(Math.random() * users.length)];
          setMemberOfMonth(randomUser);
        }
      }
    } catch (error) {
      console.error('Error loading member of month:', error);
    }
  };

  const loadUpcomingBirthdays = async () => {
    const app = getFirebaseClientApp();
    if (!app) return;

    const db = getFirestore(app);
    
    try {
      // Get all active members with birthdays
      const usersQuery = query(
        collection(db, 'users'),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(usersQuery);
      const today = new Date();
      
      const upcomingBirthdays: Array<{user: User, daysUntil: number}> = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const user = { ...data, uid: doc.id } as User;
        
        if (user.birthday) {
          // Parse birthday (expected format: MM/DD or MM-DD or full date)
          let birthMonth: number, birthDay: number;
          
          if (user.birthday instanceof Date) {
            birthMonth = user.birthday.getMonth();
            birthDay = user.birthday.getDate();
          } else if (typeof user.birthday === 'string') {
            const parts = user.birthday.split(/[-/]/);
            if (parts.length >= 2) {
              birthMonth = parseInt(parts[0]) - 1; // Month is 0-indexed
              birthDay = parseInt(parts[1]);
            } else {
              return;
            }
          } else {
            return;
          }
          
          // Calculate days until birthday this year
          const birthdayThisYear = new Date(today.getFullYear(), birthMonth, birthDay);
          let daysUntil = Math.ceil((birthdayThisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          // If birthday already passed this year, calculate for next year
          if (daysUntil < 0) {
            const birthdayNextYear = new Date(today.getFullYear() + 1, birthMonth, birthDay);
            daysUntil = Math.ceil((birthdayNextYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          }
          
          // Include birthdays within next 30 days
          if (daysUntil >= 0 && daysUntil <= 30) {
            upcomingBirthdays.push({ user, daysUntil });
          }
        }
      });
      
      // Sort by days until birthday
      upcomingBirthdays.sort((a, b) => a.daysUntil - b.daysUntil);
      
      // Take top 3
      setUpcomingBirthdays(upcomingBirthdays.slice(0, 3));
    } catch (error) {
      console.error('Error loading birthdays:', error);
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

  const getBirthdayText = (daysUntil: number) => {
    if (daysUntil === 0) return 'Today';
    if (daysUntil === 1) return 'Tomorrow';
    if (daysUntil <= 7) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const date = new Date();
      date.setDate(date.getDate() + daysUntil);
      return days[date.getDay()];
    }
    return `In ${daysUntil} days`;
  };

  return (
    <aside className="hidden lg:block w-[320px] shrink-0 sticky top-24 space-y-6">
      {/* Member of the Month Card */}
      {memberOfMonth && (
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
                style={{ backgroundImage: `url(${memberOfMonth.photoURL || '/assets/images/default-avatar.png'})` }}
              />
              <div className="absolute bottom-0 right-0 bg-[#FCCE10] text-amber-900 p-1.5 rounded-full border-2 border-white dark:border-gray-800 z-20 flex items-center justify-center">
                <span className="material-symbols-filled text-[14px]">star</span>
              </div>
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white">{memberOfMonth.name}</h3>
            <p className="text-sm text-[#17b0cf] font-medium mb-3">{memberOfMonth.role || 'Member'}</p>
            {memberOfMonth.bio && (
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 w-full mb-3">
                <p className="text-xs italic text-gray-600 dark:text-gray-400">
                  {memberOfMonth.bio}
                </p>
              </div>
            )}
            <Link 
              href="/portal/directory"
              className="text-xs font-bold text-gray-500 hover:text-[#17b0cf] transition-colors flex items-center gap-1"
            >
              View Profile <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      )}

      {/* Celebrations Module */}
      {upcomingBirthdays.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#EE8899]">cake</span> Celebrations
          </h3>
          <div className="flex flex-col gap-4">
            {upcomingBirthdays.map((birthday, index) => (
              <div key={birthday.user.uid} className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-[#EE8899]/10 flex items-center justify-center text-[#EE8899] shrink-0">
                  <span className="material-symbols-filled text-[18px]">cake</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{birthday.user.name}</p>
                  <p className="text-xs text-gray-500">Birthday • {getBirthdayText(birthday.daysUntil)}</p>
                </div>
                <Link
                  href="/portal/directory"
                  className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded hover:bg-[#EE8899] hover:text-white transition-colors"
                >
                  Wish
                </Link>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
            <Link href="/portal/directory" className="text-xs font-bold text-[#17b0cf] hover:text-cyan-600">
              View Directory
            </Link>
          </div>
        </div>
      )}

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
