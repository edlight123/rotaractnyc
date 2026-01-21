import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/app/api/admin/_utils'
import { getActivities } from '@/lib/admin/activities'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status })

  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const type = searchParams.get('type') as any
    
    const result = await getActivities({
      limit,
      type: type || undefined,
    })
    
    return NextResponse.json(result)
  } catch (err) {
    const e = err as { message?: string }
    console.error('Activities API error:', e)
    return NextResponse.json(
      { error: 'Failed to load activities', details: e?.message || String(err) },
      { status: 500 }
    )
  }
}
