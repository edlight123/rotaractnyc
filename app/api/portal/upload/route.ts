import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// Server-side signed URL generation for uploads
// Client uploads to Firebase Storage directly via the SDK,
// but this route validates auth and returns upload metadata.
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);
    const body = await request.json();

    const { fileName, fileType, folder = 'uploads' } = body;
    if (!fileName || !fileType) {
      return NextResponse.json({ error: 'fileName and fileType are required' }, { status: 400 });
    }

    // Validate file type against explicit MIME whitelist
    const ALLOWED_MIME_TYPES = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]);
    if (!ALLOWED_MIME_TYPES.has(fileType)) {
      return NextResponse.json({ error: 'File type not allowed. Accepted: JPEG, PNG, WebP, GIF, PDF, DOCX.' }, { status: 400 });
    }

    // Generate a safe path
    const ext = fileName.split('.').pop() || '';
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const storagePath = `${folder}/${uid}/${safeName}`;

    return NextResponse.json({
      storagePath,
      uid,
      maxSizeMB: 10,
    });
  } catch (error) {
    console.error('Error handling upload:', error);
    return NextResponse.json({ error: 'Upload authorization failed' }, { status: 500 });
  }
}
