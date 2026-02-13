'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth as getAuth, db as getDb } from './client';
import type { Member } from '@/types';

interface AuthContextType {
  user: User | null;
  member: Member | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  member: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  // Handle redirect result (from signInWithRedirect fallback)
  useEffect(() => {
    getRedirectResult(getAuth()).catch(() => {});
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch or create member profile
        const memberRef = doc(getDb(), 'members', firebaseUser.uid);
        const memberSnap = await getDoc(memberRef);
        if (memberSnap.exists()) {
          setMember({ id: memberSnap.id, ...memberSnap.data() } as Member);
        } else {
          // Auto-create pending profile
          const newMember: Omit<Member, 'id'> = {
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
            firstName: firebaseUser.displayName?.split(' ')[0] || '',
            lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
            photoURL: firebaseUser.photoURL || '',
            role: 'member',
            status: 'pending',
            joinedAt: new Date().toISOString(),
          };
          await setDoc(memberRef, { ...newMember, createdAt: serverTimestamp() });
          setMember({ id: firebaseUser.uid, ...newMember });
        }
        // Set session cookie (non-blocking — portal still works via client auth)
        try {
          const idToken = await firebaseUser.getIdToken();
          const res = await fetch('/api/portal/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          });
          if (!res.ok) {
            console.warn('Session cookie creation returned', res.status, '— server-side auth may be limited');
          }
        } catch (err) {
          console.warn('Session cookie creation failed:', err);
        }
      } else {
        setMember(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(getAuth(), provider);
    } catch (err: any) {
      // If popup is blocked or fails, fall back to redirect
      if (
        err?.code === 'auth/popup-blocked' ||
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request'
      ) {
        console.warn('Popup blocked/closed, falling back to redirect');
        await signInWithRedirect(getAuth(), provider);
      } else {
        console.error('Google sign-in error:', err?.code, err?.message);
        throw err;
      }
    }
  };

  const signOut = async () => {
    await fetch('/api/portal/auth/session', { method: 'DELETE' });
    await firebaseSignOut(getAuth());
    setMember(null);
  };

  return (
    <AuthContext.Provider value={{ user, member, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
