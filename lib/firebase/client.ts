import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  type Auth,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// Validate required Firebase config at initialization time.
// Important: use direct property access so Next.js can inline NEXT_PUBLIC_* values in client builds.
const firebaseEnv = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
} as const;

const missingVars = Object.entries(firebaseEnv)
  .filter(([, value]) => !value)
  .map(([key]) => key);
if (missingVars.length > 0) {
  console.error(
    `[Firebase] Missing required environment variables: ${missingVars.join(', ')}. ` +
    'Ensure all NEXT_PUBLIC_FIREBASE_* vars are set in your .env file or hosting provider.',
  );
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let _app: FirebaseApp | null = null;

function getFirebaseApp(): FirebaseApp {
  if (_app) return _app;
  _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return _app;
}

let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

export function getFirebaseAuth(): Auth {
  if (_auth) return _auth;
  const app = getFirebaseApp();
  // Prefer IndexedDB persistence (most durable in installed PWAs — the login
  // survives closing the app), falling back to localStorage. Explicit
  // initializeAuth also keeps popup/redirect Google sign-in working via the
  // provided resolver. Falls back to getAuth if auth is already initialized.
  try {
    _auth = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    _auth = getAuth(app);
  }
  return _auth;
}

export function getFirebaseDb(): Firestore {
  if (!_db) _db = getFirestore(getFirebaseApp());
  return _db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!_storage) _storage = getStorage(getFirebaseApp());
  return _storage;
}

// Re-export getters as lazy-evaluated module-level shims.
// Firebase SDK functions (doc, collection, etc.) do instanceof checks,
// so we cannot use Proxy – we must pass the real instance.
// These getters are safe to call at module scope in 'use client' files
// because they only run in the browser where env vars are available.
export {
  getFirebaseAuth as auth,
  getFirebaseDb as db,
  getFirebaseStorage as storage,
};
