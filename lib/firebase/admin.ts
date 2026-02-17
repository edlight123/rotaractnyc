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
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
  if (saJson) {
    const serviceAccount = JSON.parse(saJson) as ServiceAccount;
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

// ─── Serialization helper ───

/**
 * Recursively convert Firestore admin Timestamp fields to ISO strings
 * so they can safely be returned via NextResponse.json().
 */
export function serializeDoc(data: Record<string, any>): Record<string, any> {
  if (!data || typeof data !== 'object') return data;
  const out: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val == null) {
      out[key] = val;
    } else if (typeof val.toDate === 'function') {
      // Firestore Timestamp or FieldValue sentinel with toDate()
      out[key] = val.toDate().toISOString();
    } else if (val._seconds !== undefined && val._nanoseconds !== undefined) {
      // Already-serialized admin Timestamp object {_seconds, _nanoseconds}
      out[key] = new Date(val._seconds * 1000 + val._nanoseconds / 1e6).toISOString();
    } else if (Array.isArray(val)) {
      out[key] = val.map((v) =>
        v && typeof v === 'object' && !Array.isArray(v) ? serializeDoc(v) : v,
      );
    } else if (typeof val === 'object' && !(val instanceof Date)) {
      out[key] = serializeDoc(val);
    } else {
      out[key] = val;
    }
  }
  return out;
}
