import { NextRequest, NextResponse } from 'next/server';
import { adminDb, serializeDoc } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const albumSnap = await adminDb
      .collection('albums')
      .where('slug', '==', slug)
      .where('isPublic', '==', true)
      .limit(1)
      .get();

    if (albumSnap.empty) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 });
    }

    const albumDoc = albumSnap.docs[0];
    const album = serializeDoc({ id: albumDoc.id, ...albumDoc.data() });
    const previewCount = (album as any).publicPreviewCount || 6;

    // Fetch preview photos
    const photosSnap = await adminDb
      .collection('gallery')
      .where('albumId', '==', albumDoc.id)
      .orderBy('order', 'asc')
      .limit(previewCount)
      .get();

    const previewPhotos = photosSnap.docs.map((d) => serializeDoc({ id: d.id, ...d.data() }));

    return NextResponse.json({
      album,
      previewPhotos,
      totalCount: (album as any).photoCount || 0,
    });
  } catch (error) {
    console.error('Error fetching public album:', error);
    return NextResponse.json({ error: 'Failed to fetch album' }, { status: 500 });
  }
}
