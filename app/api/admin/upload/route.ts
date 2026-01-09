import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { requireAdmin } from '@/app/api/admin/_utils'
import { getFirebaseAdminBucket } from '@/lib/firebase/adminStorage'

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) {
    return NextResponse.json({ error: admin.message }, { status: admin.status })
  }

  const form = await req.formData().catch(() => null)
  if (!form) {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = form.get('file')
  const folder = String(form.get('folder') || 'uploads')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  const token = randomUUID()
  const safeName = sanitizeFilename(file.name || 'file')
  const objectPath = `${folder}/${Date.now()}-${safeName}`

  const bucket = getFirebaseAdminBucket()
  const objectFile = bucket.file(objectPath)

  await objectFile.save(bytes, {
    contentType: file.type || 'application/octet-stream',
    resumable: false,
    metadata: {
      metadata: {
        firebaseStorageDownloadTokens: token,
        uploadedBy: admin.email || '',
      },
    },
  })

  const bucketName = bucket.name
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(
    objectPath
  )}?alt=media&token=${token}`

  return NextResponse.json({
    ok: true,
    path: objectPath,
    url,
    contentType: file.type || null,
    size: file.size,
  })
}
