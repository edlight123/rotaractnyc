import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_BOARD_MEMBERS, type MemberGroup, type SiteMember } from '@/lib/content/members'
import { getFirebaseAdminDb, isFirebaseAdminConfigured } from '@/lib/firebase/admin'

function coerceGroup(v: unknown): MemberGroup {
  return v === 'member' ? 'member' : 'board'
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const group = coerceGroup(searchParams.get('group'))

  if (!isFirebaseAdminConfigured()) {
    const defaults = DEFAULT_BOARD_MEMBERS.filter((m) => m.group === group && m.active)
    return NextResponse.json({ members: defaults })
  }

  try {
    const snap = await getFirebaseAdminDb()
      .collection('members')
      .where('group', '==', group)
      .where('active', '==', true)
      .orderBy('order', 'asc')
      .limit(500)
      .get()

    const members: SiteMember[] = snap.docs
      .map((d) => {
        const data: unknown = d.data()
        const obj = typeof data === 'object' && data ? (data as Record<string, unknown>) : {}
        const order = Number(obj.order)

        return {
          id: d.id,
          group,
          title: String(obj.title ?? ''),
          name: String(obj.name ?? ''),
          role: String(obj.role ?? ''),
          photoUrl: String(obj.photoUrl ?? '') || undefined,
          order: Number.isFinite(order) ? order : 1,
          active: true,
        }
      })
      .filter((m) => m.title && m.name)

    return NextResponse.json({ members })
  } catch {
    const defaults = DEFAULT_BOARD_MEMBERS.filter((m) => m.group === group && m.active)
    return NextResponse.json({ members: defaults })
  }
}
