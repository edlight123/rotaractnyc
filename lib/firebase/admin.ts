import { initializeApp, getApps, cert, type ServiceAccount, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';

let _app: App | null = null;

function getAdminApp(): App {
  if (_app) return _app;
  if (getApps().length) {
    _app = getApps()[0];
    return _app;
  }

  let credential;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) as ServiceAccount;
    credential = cert(serviceAccount);
  } else if (process.env.FIREBASE_PROJECT_ID) {
    credential = cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    } as ServiceAccount);
  } else {
    throw new Error('Firebase Admin credentials not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_PROJECT_ID env vars.');
  }

  _app = initializeApp({ credential });
  return _app;
}

// Lazy getters — only initialise when first accessed at runtime, not at build time
export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminStorage(): Storage {
  return getStorage(getAdminApp());
}

// Convenience aliases (lazy)
// IMPORTANT: We must bind returned functions to the real instance so that
// `this` inside Firebase Admin methods (e.g. createSessionCookie) points
// to the real Auth/Firestore/Storage object, not the Proxy target.
function lazyProxy<T extends object>(getter: () => T): T {
  return new Proxy({} as T, {
    get(_, prop) {
      const target = getter();
      const value = (target as any)[prop];
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

export const adminAuth = lazyProxy(getAdminAuth);
export const adminDb = lazyProxy(getAdminDb);
export const adminStorage = lazyProxy(getAdminStorage);
