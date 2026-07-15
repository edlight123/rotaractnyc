import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { SITE } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const COLLECTION = 'newsletter_subscribers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  const redirect = (params: string) =>
    NextResponse.redirect(new URL(`/${params}`, SITE.url));

  if (!token) {
    return redirect('?subscribed=invalid');
  }

  try {
    const snap = await adminDb
      .collection(COLLECTION)
      .where('token', '==', token)
      .limit(1)
      .get();

    if (snap.empty) {
      // Token already used (cleared on confirm) or never valid.
      return redirect('?subscribed=invalid');
    }

    await snap.docs[0].ref.update({
      confirmed: true,
      confirmedAt: new Date().toISOString(),
      token: FieldValue.delete(),
    });

    return redirect('?subscribed=1');
  } catch (error: any) {
    console.error('Newsletter confirm error:', error);
    return redirect('?subscribed=error');
  }
}
