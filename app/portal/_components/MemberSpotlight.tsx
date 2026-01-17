'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getFirebaseClientApp } from '@/lib/firebase/client';
import { User } from '@/types/portal';

export default function MemberSpotlight() {
  const [member, setMember] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const app = getFirebaseClientApp();
      if (!app) return;
      const db = getFirestore(app);

      try {
        const usersRef = collection(db, 'users');
        const usersQuery = query(
          usersRef,
          where('status', '==', 'active'),
          orderBy('name', 'asc'),
          limit(25)
        );
        const snapshot = await getDocs(usersQuery);
        const rows = snapshot.docs.map((d) => ({ uid: d.id, ...d.data() })) as User[];
        if (cancelled) return;

        if (rows.length === 0) {
          setMember(null);
          return;
        }

        const picked = rows[Math.floor(Math.random() * rows.length)];
        setMember(picked);
      } catch (err) {
        console.error('Error loading member spotlight:', err);
        if (!cancelled) setMember(null);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const spotlightMember = useMemo(() => {
    if (member) {
      return {
        name: member.name,
        role:
          member.role === 'BOARD'
            ? 'Board Member'
            : member.role === 'TREASURER'
            ? 'Treasurer'
            : member.role === 'ADMIN'
            ? 'Administrator'
            : 'Member',
        photoURL:
          member.photoURL ||
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
        quote:
          (member as unknown as { spotlightQuote?: string }).spotlightQuote ||
          'Proud to be part of Rotaract NYC!',
        email: member.email,
      };
    }

    return {
      name: 'Member',
      role: 'Rotaract NYC',
      photoURL:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
      quote: 'Welcome to the members portal.',
      email: null,
    };
  }, [member]);

  return (
    <div className="bg-gradient-to-br from-rotaract-blue to-[#004280] rounded-xl shadow-md p-5 text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10"></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest opacity-80">
            Member Spotlight
          </h3>
          <span className="material-symbols-outlined opacity-80 text-[18px]">star</span>
        </div>
        <div className="flex items-center gap-4 mb-3">
          <div 
            className="w-14 h-14 rounded-full border-2 border-white/30 bg-white/10 bg-cover bg-center"
            style={{ backgroundImage: `url(${spotlightMember.photoURL})` }}
          />
          <div>
            <p className="font-bold text-lg leading-tight">{spotlightMember.name}</p>
            <p className="text-sm opacity-80">{spotlightMember.role}</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed opacity-90 mb-4">
          "{spotlightMember.quote}"
        </p>
        <button
          onClick={() => {
            if (spotlightMember.email) {
              window.location.href = `mailto:${spotlightMember.email}`;
            } else {
              window.location.href = '/portal/directory';
            }
          }}
          className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-colors backdrop-blur-sm"
        >
          Say Hello
        </button>
      </div>
    </div>
  );
}
