'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth as getAuth, db as getDb } from './client';
import type { Account, Member } from '@/types';

// localStorage key used to remember the email between requesting a magic link
// and completing sign-in on the same device (Firebase email-link requirement).
const MAGIC_LINK_EMAIL_KEY = 'rotaract_emailForSignIn';

interface AuthContextType {
  user: User | null;
  account: Account | null;
  member: Member | null;
  loading: boolean;
  sessionReady: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  sendMagicLink: (email: string, redirectPath?: string) => Promise<void>;
  completeMagicLink: (emailOverride?: string) => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  account: null,
  member: null,
  loading: true,
  sessionReady: false,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  sendMagicLink: async () => {},
  completeMagicLink: async () => false,
  sendPasswordReset: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);

  // Handle redirect result (from signInWithRedirect fallback)
  useEffect(() => {
    getRedirectResult(getAuth()).catch(() => {});
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        let resolvedMember: Member | null = null;
        let resolvedAccount: Account | null = null;
        let idToken: string | null = null;

        // Step 1: Get the ID token (we'll need it for the session cookie)
        try {
          idToken = await firebaseUser.getIdToken();
        } catch (err) {
          console.error('Auth: Failed to fetch ID token:', err);
          setMember(null);
          setLoading(false);
          return;
        }

        // Step 2: Establish the session cookie FIRST. The server uses the
        // Admin SDK to (a) auto-approve admin-allowlisted emails, and
        // (b) migrate any board-created "invited" member doc — which lives
        // under an auto-generated id keyed by email — to be keyed by the
        // user's uid with status='active'. Firestore rules prevent the
        // client from doing this migration itself, so it must happen here
        // before we attempt to read or create the user's member doc.
        let serverAutoApproved = false;
        if (idToken) {
          try {
            const res = await fetch('/api/portal/auth/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken }),
            });
            if (res.ok) {
              setSessionReady(true);
              const data = await res.json().catch(() => null);
              serverAutoApproved = !!(data?.autoApproved || data?.migratedFromInvite);
            } else {
              console.error('Auth: Session cookie creation returned', res.status);
              setSessionReady(false);
            }
          } catch (err) {
            console.error('Auth: Session cookie creation failed:', err);
            setSessionReady(false);
          }
        }

        // Step 3: Fetch the member profile (now that any invite migration
        // has been applied server-side). Supporters have no member doc — that
        // is expected, and `member` stays null for them.
        try {
          const memberRef = doc(getDb(), 'members', firebaseUser.uid);
          const memberSnap = await getDoc(memberRef);
          if (memberSnap.exists()) {
            resolvedMember = { id: memberSnap.id, ...memberSnap.data() } as Member;
          }
        } catch (err) {
          console.error('Auth: Failed to fetch member profile:', err);
        }

        // Step 4: If the server flipped the user's status (admin auto-approve
        // or invite migration), make sure we have the freshest member copy.
        if (serverAutoApproved) {
          try {
            const memberRef = doc(getDb(), 'members', firebaseUser.uid);
            const freshSnap = await getDoc(memberRef);
            if (freshSnap.exists()) {
              resolvedMember = { id: freshSnap.id, ...freshSnap.data() } as Member;
            }
          } catch (err) {
            console.warn('Auth: Failed to refresh member after auto-approval:', err);
          }
        }

        // Step 5: Fetch the account identity doc. The session route ensures an
        // `accounts/{uid}` doc exists for every signed-in user (supporter or
        // member), so this should be present. Supporters live entirely in this
        // collection; members additionally have a `members/{uid}` doc.
        try {
          const accountRef = doc(getDb(), 'accounts', firebaseUser.uid);
          const accountSnap = await getDoc(accountRef);
          if (accountSnap.exists()) {
            resolvedAccount = { id: accountSnap.id, ...accountSnap.data() } as Account;
          }
        } catch (err) {
          console.error('Auth: Failed to fetch account profile:', err);
        }

        setMember(resolvedMember);
        setAccount(resolvedAccount);
        setLoading(false);
      } else {
        setMember(null);
        setAccount(null);
        setSessionReady(false);
        setLoading(false);
      }
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

  // ── Email + password ──────────────────────────────────────────────────
  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(getAuth(), email, password);
    // onAuthStateChanged establishes the session cookie + account doc.
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(getAuth(), email, password);
    const displayName = name.trim();
    if (displayName) {
      try {
        await updateProfile(cred.user, { displayName });
      } catch (err) {
        console.warn('Auth: updateProfile after signup failed:', err);
      }
    }
    // Re-establish the session with a fresh token that now carries the
    // displayName, so the server-side account doc is created/backfilled with
    // the correct name (the automatic onAuthStateChanged POST may have fired
    // before updateProfile resolved). The session route is idempotent.
    try {
      const freshToken = await cred.user.getIdToken(true);
      await fetch('/api/portal/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: freshToken }),
      });
    } catch (err) {
      console.warn('Auth: session refresh after signup failed:', err);
    }
    // Fire-and-forget verification email (non-blocking).
    try {
      await sendEmailVerification(cred.user, {
        url: `${window.location.origin}/account?verified=1`,
      });
    } catch (err) {
      console.warn('Auth: verification email failed:', err);
    }
  };

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(getAuth(), email, {
      url: `${window.location.origin}/account/login`,
    });
  };

  // ── Passwordless email link (magic link) ──────────────────────────────
  const sendMagicLink = async (email: string, redirectPath?: string) => {
    const verifyUrl = new URL('/account/verify', window.location.origin);
    if (redirectPath && redirectPath !== '/account') {
      verifyUrl.searchParams.set('redirect', redirectPath);
    }
    await sendSignInLinkToEmail(getAuth(), email, {
      url: verifyUrl.toString(),
      handleCodeInApp: true,
    });
    try {
      window.localStorage.setItem(MAGIC_LINK_EMAIL_KEY, email);
    } catch {
      /* localStorage unavailable — verify page will prompt for the email */
    }
  };

  /**
   * Completes a magic-link sign-in if the current URL is a Firebase email
   * sign-in link. Returns true when sign-in was initiated, false when the URL
   * is not a sign-in link. Throws `Error('EMAIL_REQUIRED')` when the email
   * cannot be recovered from storage and the caller must prompt for it.
   */
  const completeMagicLink = async (emailOverride?: string): Promise<boolean> => {
    const auth = getAuth();
    if (!isSignInWithEmailLink(auth, window.location.href)) return false;
    let email = emailOverride?.trim() || null;
    if (!email) {
      try {
        email = window.localStorage.getItem(MAGIC_LINK_EMAIL_KEY);
      } catch {
        email = null;
      }
    }
    if (!email) throw new Error('EMAIL_REQUIRED');
    await signInWithEmailLink(auth, email, window.location.href);
    try {
      window.localStorage.removeItem(MAGIC_LINK_EMAIL_KEY);
    } catch {
      /* ignore */
    }
    return true;
  };

  const signOut = async () => {
    await fetch('/api/portal/auth/session', { method: 'DELETE' });
    await firebaseSignOut(getAuth());
    setMember(null);
    setAccount(null);
    setSessionReady(false);
  };

  return (
    <AuthContext.Provider value={{ user, account, member, loading, sessionReady, signInWithGoogle, signInWithEmail, signUpWithEmail, sendMagicLink, completeMagicLink, sendPasswordReset, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
