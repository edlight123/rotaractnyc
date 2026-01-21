import { NextRequest, NextResponse } from 'next/server'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { requireAdmin } from '@/app/api/admin/_utils'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { logActivity } from '@/lib/admin/activities'

export type EventDoc = {
  title: string
  description: string
  startAt: Timestamp
  endAt: Timestamp
  location: string
  visibility: 'public' | 'member' | 'board'
  createdBy?: string
  createdAt?: unknown
  updatedAt?: unknown
  // Legacy fields for backward compatibility with admin UI
  date?: string
  time?: string
  startDate?: string
  startTime?: string
  endTime?: string
  timezone?: string
  category?: 'upcoming' | 'past'
  order?: number
  status?: 'published' | 'draft' | 'cancelled'
  attendees?: number
  imageUrl?: string
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status })

  try {
    const db = getFirebaseAdminDb()
    const snap = await db.collection('portalEvents').get()

    const events = snap.docs.map((d) => {
      const data = d.data() as EventDoc
      const startAt = data.startAt
      const endAt = data.endAt
      
      // Convert Timestamp to legacy format for admin UI
      const startDate = startAt ? new Date(startAt.toDate()) : new Date()
      const endDate = endAt ? new Date(endAt.toDate()) : startDate
      
      const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }
      
      const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      }
      
      const formatISODate = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
      
      const formatISOTime = (date: Date) => {
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        return `${hours}:${minutes}`
      }
      
      // Determine category based on date
      const now = new Date()
      const category = startDate < now ? 'past' : 'upcoming'
      
      return {
        id: d.id,
        title: data.title,
        description: data.description,
        location: data.location,
        visibility: data.visibility,
        date: formatDate(startDate),
        time: formatTime(startDate),
        startDate: formatISODate(startDate),
        startTime: formatISOTime(startDate),
        endTime: formatISOTime(endDate),
        timezone: 'America/New_York',
        category,
        order: data.order || 1,
        status: (data.status || 'published') as 'published' | 'draft' | 'cancelled',
        attendees: data.attendees || 0,
        imageUrl: data.imageUrl || '',
        createdBy: data.createdBy,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      }
    })
    
    events.sort((a, b) => {
      const cat = String(a.category ?? '').localeCompare(String(b.category ?? ''))
      if (cat !== 0) return cat
      const ao = Number.isFinite(a.order as number) ? Number(a.order) : 0
      const bo = Number.isFinite(b.order as number) ? Number(b.order) : 0
      return ao - bo
    })

    return NextResponse.json({ events })
  } catch (err) {
    const e = err as { message?: string; code?: string }
    return NextResponse.json(
      { error: 'Failed to load events', details: e?.message || String(err), code: e?.code },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status })

  const body = (await req.json().catch(() => null)) as Partial<EventDoc> & { id?: string } | null
  if (!body?.title || !body.description) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const db = getFirebaseAdminDb()
  const id = body.id || undefined

  // Parse date/time from admin UI format to Timestamp
  let startAt: Timestamp
  let endAt: Timestamp
  
  if (body.startDate && body.startTime) {
    // Use ISO date and time from admin UI
    const [year, month, day] = body.startDate.split('-').map(Number)
    const [hours, minutes] = body.startTime.split(':').map(Number)
    const startDate = new Date(year, month - 1, day, hours, minutes)
    startAt = Timestamp.fromDate(startDate)
    
    if (body.endTime) {
      const [endHours, endMinutes] = body.endTime.split(':').map(Number)
      const endDate = new Date(year, month - 1, day, endHours, endMinutes)
      endAt = Timestamp.fromDate(endDate)
    } else {
      // Default to 2 hours after start
      const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000)
      endAt = Timestamp.fromDate(endDate)
    }
  } else {
    // Fallback: use current date/time
    const now = new Date()
    startAt = Timestamp.fromDate(now)
    const later = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    endAt = Timestamp.fromDate(later)
  }

  const doc: EventDoc = {
    title: body.title,
    description: body.description,
    startAt,
    endAt,
    location: body.location || '',
    visibility: (body.visibility as 'public' | 'member' | 'board') || 'member',
    createdBy: admin.uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    // Keep legacy fields for admin UI compatibility
    order: Number.isFinite(body.order as number) ? Number(body.order) : 1,
    status: (body.status as 'published' | 'draft' | 'cancelled') || 'published',
    imageUrl: body.imageUrl || '',
  }

  const ref = id ? db.collection('portalEvents').doc(id) : db.collection('portalEvents').doc()
  await ref.set(doc, { merge: true })
  
  // Log activity
  await logActivity({
    type: 'event',
    action: id ? 'updated' : 'created',
    title: id ? 'Event updated' : 'Event created',
    description: `${body.title} is now ${doc.status}`,
    userId: admin.uid,
    userName: admin.email || 'Admin',
    metadata: { eventId: ref.id, eventTitle: body.title },
  })
  
  return NextResponse.json({ ok: true, id: ref.id })
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status })

  const body = (await req.json().catch(() => null)) as (Partial<EventDoc> & { id?: string }) | null
  if (!body?.id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const db = getFirebaseAdminDb()
  const updates: Partial<EventDoc> = {
    updatedAt: FieldValue.serverTimestamp(),
  }

  // Update title and description
  if (body.title !== undefined) updates.title = body.title
  if (body.description !== undefined) updates.description = body.description
  if (body.location !== undefined) updates.location = body.location
  if (body.visibility !== undefined) updates.visibility = body.visibility as 'public' | 'member' | 'board'
  
  // Update timestamps if date/time changed
  if (body.startDate && body.startTime) {
    const [year, month, day] = body.startDate.split('-').map(Number)
    const [hours, minutes] = body.startTime.split(':').map(Number)
    const startDate = new Date(year, month - 1, day, hours, minutes)
    updates.startAt = Timestamp.fromDate(startDate)
    
    if (body.endTime) {
      const [endHours, endMinutes] = body.endTime.split(':').map(Number)
      const endDate = new Date(year, month - 1, day, endHours, endMinutes)
      updates.endAt = Timestamp.fromDate(endDate)
    }
  }
  
  // Update legacy fields
  if (body.order !== undefined) updates.order = Number(body.order)
  if (body.status !== undefined) updates.status = body.status as 'published' | 'draft' | 'cancelled'
  if (body.imageUrl !== undefined) updates.imageUrl = body.imageUrl

  await db.collection('portalEvents').doc(body.id).set(updates, { merge: true })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const db = getFirebaseAdminDb()
  await db.collection('portalEvents').doc(id).delete()
  return NextResponse.json({ ok: true })
}
