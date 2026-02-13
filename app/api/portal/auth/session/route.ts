import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// POST: Create session cookie
export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();
    const expiresIn = 60 * 60 * 24 * 14 * 1000; // 14 days
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    const cookieStore = await cookies();
    cookieStore.set('rotaract_portal_session', sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const message = error?.message || String(error);
    console.error('Session creation error:', message);
    // Surface whether it's a credentials issue vs an invalid token
    const isCredentials = message.includes('credentials') || message.includes('FIREBASE');
    return NextResponse.json(
      { error: isCredentials
          ? 'Firebase Admin not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_PROJECT_ID env vars.'
          : 'Failed to create session — token may be expired. Please sign in again.'
      },
      { status: 401 },
    );
  }
}

// DELETE: Clear session cookie
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('rotaract_portal_session');
  return NextResponse.json({ success: true });
}
