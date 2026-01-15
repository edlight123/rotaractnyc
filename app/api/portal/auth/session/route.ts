import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminApp } from '@/lib/firebase/admin';
import { getAuth } from 'firebase-admin/auth';
import { cookies } from 'next/headers';
import { PORTAL_SESSION_COOKIE, PORTAL_SESSION_MAX_AGE_SECONDS } from '@/lib/portal/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();

    if (!idToken) {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    const app = getFirebaseAdminApp();
    if (!app) {
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
    }

    const auth = getAuth(app);
    
    // Verify the ID token
    const decodedToken = await auth.verifyIdToken(idToken);
    
    // Create session cookie
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: PORTAL_SESSION_MAX_AGE_SECONDS * 1000,
    });

    // Set cookie
    cookies().set(PORTAL_SESSION_COOKIE, sessionCookie, {
      maxAge: PORTAL_SESSION_MAX_AGE_SECONDS,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return NextResponse.json({ success: true, uid: decodedToken.uid });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    cookies().delete(PORTAL_SESSION_COOKIE);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
