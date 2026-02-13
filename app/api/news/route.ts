import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const snapshot = await adminDb
      .collection('articles')
      .where('isPublished', '==', true)
      .orderBy('publishedAt', 'desc')
      .limit(20)
      .get();

    const articles = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (articles.length > 0) {
      return NextResponse.json(articles);
    }

    // 3. Default data
    const { defaultArticles } = await import('@/lib/defaults/data');
    return NextResponse.json(defaultArticles);
  } catch (error) {
    console.error('Error fetching articles:', error);
    const { defaultArticles } = await import('@/lib/defaults/data');
    return NextResponse.json(defaultArticles);
  }
}
