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
    return JSON.parse(json)
  }

  if (base64) {
    const decoded = Buffer.from(base64, 'base64').toString('utf8')
    return JSON.parse(decoded)
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

export function isFirebaseAdminConfigured() {
  return parseServiceAccount() !== null
}

export function getFirebaseAdminApp(): App {
  const existing = getApps()[0]
  if (existing) return existing

  const serviceAccount = parseServiceAccount()
  if (!serviceAccount) {
    throw new Error(
      'Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT (JSON) or FIREBASE_SERVICE_ACCOUNT_BASE64 or (FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY).'
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
