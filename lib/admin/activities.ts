/**
 * Activity logging utility for admin actions
 * Tracks all significant actions in the system
 */

import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

export type ActivityType = 'member' | 'event' | 'post' | 'gallery' | 'message' | 'settings' | 'page'

export interface Activity {
  id?: string
  type: ActivityType
  action: string // e.g., 'created', 'updated', 'deleted', 'published'
  title: string
  description: string
  userId?: string
  userName?: string
  userEmail?: string
  metadata?: Record<string, any> // Additional data like event ID, post ID, etc.
  createdAt: any // Firestore Timestamp
}

/**
 * Log an activity to Firestore
 */
export async function logActivity(activity: Omit<Activity, 'id' | 'createdAt'>) {
  try {
    const db = getFirebaseAdminDb()
    const activitiesRef = db.collection('activities')
    
    const activityData = {
      ...activity,
      createdAt: FieldValue.serverTimestamp(),
    }
    
    await activitiesRef.add(activityData)
    return { success: true }
  } catch (error) {
    console.error('Failed to log activity:', error)
    return { success: false, error }
  }
}

/**
 * Get recent activities with optional filtering
 */
export async function getActivities(options?: {
  limit?: number
  type?: ActivityType
  startAfter?: any
}) {
  const db = getFirebaseAdminDb()
  let query = db.collection('activities').orderBy('createdAt', 'desc')
  
  if (options?.type) {
    query = query.where('type', '==', options.type) as any
  }
  
  if (options?.startAfter) {
    query = query.startAfter(options.startAfter) as any
  }
  
  if (options?.limit) {
    query = query.limit(options.limit) as any
  }
  
  const snapshot = await query.get()
  
  const activities = snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    }
  })
  
  return {
    activities,
    lastDoc: snapshot.docs[snapshot.docs.length - 1],
    hasMore: snapshot.docs.length === (options?.limit || 20),
  }
}

/**
 * Get activity counts by type for stats
 */
export async function getActivityStats(days = 30) {
  const db = getFirebaseAdminDb()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  const snapshot = await db
    .collection('activities')
    .where('createdAt', '>=', startDate)
    .get()
  
  const stats: Record<ActivityType, number> = {
    member: 0,
    event: 0,
    post: 0,
    gallery: 0,
    message: 0,
    settings: 0,
    page: 0,
  }
  
  snapshot.docs.forEach((doc) => {
    const data = doc.data()
    if (data.type && stats[data.type as ActivityType] !== undefined) {
      stats[data.type as ActivityType]++
    }
  })
  
  return stats
}
