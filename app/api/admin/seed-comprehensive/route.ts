import { NextRequest, NextResponse } from 'next/server'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { requireAdmin } from '@/app/api/admin/_utils'
import { getFirebaseAdminDb, getFirebaseAdminAuth } from '@/lib/firebase/admin'
import {
  TEST_TEAM_MEMBERS,
  TEST_EVENTS,
  TEST_ARTICLES,
  TEST_DOCUMENTS,
  TEST_ANNOUNCEMENTS,
  TEST_COMMUNITY_POSTS,
  TEST_PORTAL_USERS,
} from '@/scripts/seed-test-data'

type SeedResult = {
  ok: true
  seeded: {
    teamMembers: number
    events: number
    articles: number
    documents: number
    announcements: number
    communityPosts: number
    portalUsers: number
  }
}

// Helper to create dates relative to now
const daysFromNow = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

export async function GET(req: NextRequest) {
  // Allow click-to-seed from browser after /admin login
  return POST(req)
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status })

  try {
    const db = getFirebaseAdminDb()
    const auth = getFirebaseAdminAuth()
    const batch = db.batch()

    const seeded: SeedResult['seeded'] = {
      teamMembers: 0,
      events: 0,
      articles: 0,
      documents: 0,
      announcements: 0,
      communityPosts: 0,
      portalUsers: 0,
    }

    // ========================================================================
    // TEAM MEMBERS (Board Members for public site)
    // ========================================================================
    for (const member of TEST_TEAM_MEMBERS) {
      const ref = db.collection('members').doc(member.id)
      batch.set(
        ref,
        {
          group: member.group,
          title: member.title,
          name: member.name,
          role: member.role,
          photoUrl: member.photoUrl ?? null,
          order: member.order,
          active: member.active,
          bio: member.bio ?? null,
          linkedin: member.linkedin ?? null,
          email: member.email ?? null,
          seeded: true,
          testData: true,
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
      seeded.teamMembers += 1
    }

    // ========================================================================
    // EVENTS (Free, Paid, Zoom, Service, Hybrid)
    // ========================================================================
    for (const event of TEST_EVENTS) {
      const ref = db.collection('events').doc(event.id)
      
      // Calculate start and end timestamps
      const startDate = event.startDate.includes('T') 
        ? new Date(event.startDate)
        : new Date(`${event.startDate}T${event.startTime}:00`)
      const endDate = event.endDate.includes('T')
        ? new Date(event.endDate)
        : new Date(`${event.endDate}T${event.endTime}:00`)

      batch.set(
        ref,
        {
          title: event.title,
          category: event.category,
          eventType: event.eventType,
          venueType: event.venueType,
          description: event.description,
          location: event.location,
          virtualLink: event.virtualLink ?? null,
          
          // Date/time fields
          date: event.startDate,
          time: `${event.startTime} - ${event.endTime}`,
          startDate: event.startDate,
          startTime: event.startTime,
          endDate: event.endDate,
          endTime: event.endTime,
          timezone: event.timezone,
          startAt: Timestamp.fromDate(startDate),
          endAt: Timestamp.fromDate(endDate),
          
          // Registration settings
          visibility: event.visibility,
          requiresRegistration: event.requiresRegistration ?? true,
          allowGuests: event.allowGuests ?? false,
          capacity: event.capacity ?? null,
          registrationDeadline: event.registrationDeadline ?? null,
          
          // Pricing (for paid events)
          memberPrice: event.memberPrice ?? null,
          memberEarlyBirdPrice: event.memberEarlyBirdPrice ?? null,
          guestPrice: event.guestPrice ?? null,
          guestEarlyBirdPrice: event.guestEarlyBirdPrice ?? null,
          earlyBirdDeadline: event.earlyBirdDeadline ?? null,
          
          // Service event details
          serviceHours: event.serviceHours ?? null,
          serviceDescription: event.serviceDescription ?? null,
          
          // Media
          imageUrl: event.imageUrl ?? null,
          tags: event.tags ?? [],
          
          // Status
          status: event.status,
          order: event.order,
          
          // Meta
          seeded: true,
          testData: true,
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
      seeded.events += 1
    }

    // ========================================================================
    // ARTICLES / BLOG POSTS
    // ========================================================================
    for (const article of TEST_ARTICLES) {
      const ref = db.collection('posts').doc(article.slug)
      batch.set(
        ref,
        {
          slug: article.slug,
          title: article.title,
          date: article.date,
          author: article.author,
          category: article.category,
          excerpt: article.excerpt,
          content: article.content,
          imageUrl: article.imageUrl ?? null,
          readTime: article.readTime ?? null,
          published: article.published,
          seeded: true,
          testData: true,
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
      seeded.articles += 1
    }

    // ========================================================================
    // DOCUMENTS / RESOURCES
    // ========================================================================
    for (const doc of TEST_DOCUMENTS) {
      const ref = db.collection('documents').doc(doc.id)
      batch.set(
        ref,
        {
          title: doc.title,
          category: doc.category,
          description: doc.description ?? null,
          url: doc.url,
          visibility: doc.visibility,
          fileSize: doc.fileSize ?? null,
          fileType: doc.fileType ?? null,
          createdBy: 'system',
          seeded: true,
          testData: true,
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
      seeded.documents += 1
    }

    // ========================================================================
    // ANNOUNCEMENTS / NOTES
    // ========================================================================
    for (const ann of TEST_ANNOUNCEMENTS) {
      const ref = db.collection('announcements').doc(ann.id)
      batch.set(
        ref,
        {
          title: ann.title,
          body: ann.body,
          pinned: ann.pinned,
          visibility: ann.visibility,
          createdBy: ann.createdBy,
          seeded: true,
          testData: true,
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
      seeded.announcements += 1
    }

    // ========================================================================
    // COMMUNITY POSTS (Portal Feed)
    // ========================================================================
    for (const post of TEST_COMMUNITY_POSTS) {
      const ref = db.collection('communityPosts').doc(post.id)
      batch.set(
        ref,
        {
          authorUid: post.authorUid,
          authorName: post.authorName,
          authorRole: post.authorRole,
          authorPhotoURL: post.authorPhotoURL,
          title: post.title,
          body: post.body,
          type: post.type,
          images: post.images,
          document: post.document,
          likesCount: post.likesCount,
          commentsCount: post.commentsCount,
          seeded: true,
          testData: true,
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
      seeded.communityPosts += 1
    }

    // ========================================================================
    // PORTAL USERS
    // ========================================================================
    for (const user of TEST_PORTAL_USERS) {
      const ref = db.collection('users').doc(user.uid)
      batch.set(
        ref,
        {
          name: user.name,
          email: user.email,
          photoURL: user.photoURL,
          role: user.role,
          status: user.status,
          committee: user.committee,
          phoneOptIn: user.phoneOptIn,
          joinDate: user.joinDate,
          seeded: true,
          testData: true,
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
      seeded.portalUsers += 1
    }

    // Commit all writes
    await batch.commit()

    return NextResponse.json({
      ok: true,
      message: 'Comprehensive test data seeded successfully!',
      seeded,
      summary: {
        total: Object.values(seeded).reduce((a, b) => a + b, 0),
        details: [
          `${seeded.teamMembers} board/team members`,
          `${seeded.events} events (free, paid, Zoom, service)`,
          `${seeded.articles} blog articles`,
          `${seeded.documents} documents/resources`,
          `${seeded.announcements} announcements`,
          `${seeded.communityPosts} community posts`,
          `${seeded.portalUsers} portal users`,
        ],
      },
    } satisfies SeedResult & { message: string; summary: object })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Seed comprehensive data failed:', err)
    return NextResponse.json(
      {
        error: 'Failed to seed comprehensive test data',
        details: message,
        code: 'SEED_COMPREHENSIVE_FAILED',
      },
      { status: 500 }
    )
  }
}
