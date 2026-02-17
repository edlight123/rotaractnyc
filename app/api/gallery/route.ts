import { NextResponse } from 'next/server';
import { adminDb, serializeDoc } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const snapshot = await adminDb
      .collection('gallery')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const images = snapshot.docs.map((doc) => serializeDoc({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(images);
  } catch (error) {
    console.error('Error fetching gallery:', error);
    const { defaultGallery } = await import('@/lib/defaults/data');
    return NextResponse.json(defaultGallery);
  }
}
