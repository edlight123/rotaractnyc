import { getStorage } from 'firebase-admin/storage'
import { getFirebaseAdminApp } from './admin'

export function getFirebaseAdminBucket() {
  return getStorage(getFirebaseAdminApp()).bucket()
}
