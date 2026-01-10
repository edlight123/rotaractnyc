import { cert, getApps, initializeApp, App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function normalizePrivateKey(key: string) {
  return key.replace(/\\n/g, '\n')
}

function parseServiceAccount() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64

  if (json) {
    try {
      return JSON.parse(json)
    } catch {
      return null
    }
  }

  if (base64) {
    try {
      const decoded = Buffer.from(base64, 'base64').toString('utf8')
      return JSON.parse(decoded)
    } catch {
      return null
    }
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY

  if (projectId && clientEmail && privateKey) {
    return {
      project_id: projectId,
      client_email: clientEmail,
      private_key: normalizePrivateKey(privateKey),
    }
  }

  return null
}

export function getFirebaseAdminConfigStatus():
  | { ok: true; source: 'json' | 'base64' | 'split' }
  | { ok: false; error: string } {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT
  if (json) {
    try {
      JSON.parse(json)
      return { ok: true, source: 'json' }
    } catch {
      return {
        ok: false,
        error:
          'FIREBASE_SERVICE_ACCOUNT is set but is not valid JSON. In Vercel, paste the full JSON with no extra quotes or trailing commas; or use FIREBASE_SERVICE_ACCOUNT_BASE64 instead.',
      }
    }
  }

  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
  if (base64) {
    try {
      const decoded = Buffer.from(base64, 'base64').toString('utf8')
      JSON.parse(decoded)
      return { ok: true, source: 'base64' }
    } catch {
      return {
        ok: false,
        error:
          'FIREBASE_SERVICE_ACCOUNT_BASE64 is set but could not be decoded/parsed as JSON. Recreate it from the service account JSON and ensure you paste only the base64 string (no quotes).',
      }
    }
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY

  if (projectId || clientEmail || privateKey) {
    const missing = [
      !projectId ? 'FIREBASE_ADMIN_PROJECT_ID' : null,
      !clientEmail ? 'FIREBASE_ADMIN_CLIENT_EMAIL' : null,
      !privateKey ? 'FIREBASE_ADMIN_PRIVATE_KEY' : null,
    ].filter(Boolean)

    if (missing.length) {
      return { ok: false, error: `Missing required Firebase Admin env vars: ${missing.join(', ')}` }
    }

    return { ok: true, source: 'split' }
  }

  return {
    ok: false,
    error:
      'Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT (JSON) or FIREBASE_SERVICE_ACCOUNT_BASE64 or the split vars (FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY).',
  }
}

export function isFirebaseAdminConfigured() {
  return getFirebaseAdminConfigStatus().ok
}

export function getFirebaseAdminApp(): App {
  const existing = getApps()[0]
  if (existing) return existing

  const serviceAccount = parseServiceAccount()
  if (!serviceAccount) {
    const status = getFirebaseAdminConfigStatus()
    throw new Error(
      status.ok
        ? 'Firebase Admin is not configured.'
        : `Firebase Admin is not configured: ${status.error}`
    )
  }

  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET

  return initializeApp({
    credential: cert(serviceAccount),
    ...(storageBucket ? { storageBucket } : {}),
  })
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp())
}

export function getFirebaseAdminDb() {
  return getFirestore(getFirebaseAdminApp())
}
