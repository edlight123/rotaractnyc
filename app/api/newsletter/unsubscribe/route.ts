import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { SITE } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const COLLECTION = 'newsletter_subscribers';

/**
 * Mark the subscriber holding `token` as unsubscribed. The token is kept so a
 * second click (or a mail client's one-click POST followed by the user opening
 * the link) still lands on the "you're unsubscribed" message.
 */
async function unsubscribe(token: string | null): Promise<'unsubscribed' | 'invalid' | 'error'> {
  if (!token) return 'invalid';
  try {
    const snap = await adminDb
      .collection(COLLECTION)
      .where('unsubscribeToken', '==', token)
      .limit(1)
      .get();
    if (snap.empty) return 'invalid';

    const doc = snap.docs[0];
    if (doc.data().confirmed !== false || !doc.data().unsubscribedAt) {
      await doc.ref.update({ confirmed: false, unsubscribedAt: new Date().toISOString() });
    }
    return 'unsubscribed';
  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
    return 'error';
  }
}

/** Link in the email footer. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token');
  const result = await unsubscribe(token);
  const param = result === 'unsubscribed' ? 'unsubscribed' : result === 'invalid' ? 'invalid' : 'error';
  return NextResponse.redirect(new URL(`/?subscribed=${param}`, SITE.url));
}

/** RFC 8058 one-click unsubscribe, sent by mail clients via List-Unsubscribe-Post. */
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get('token');
  const result = await unsubscribe(token);
  return NextResponse.json({ result }, { status: result === 'error' ? 500 : 200 });
}
