import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminApp } from '@/lib/firebase/admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { requireRole } from '@/lib/portal/auth';
import { UserRole } from '@/types/portal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Require ADMIN role
    await requireRole('ADMIN');

    const { email, role }: { email: string; role: UserRole } = await req.json();

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
    }

    const validRoles: UserRole[] = ['MEMBER', 'BOARD', 'TREASURER', 'ADMIN'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const app = getFirebaseAdminApp();
    if (!app) {
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
    }

    const auth = getAuth(app);
    const db = getFirestore(app);

    // Get user by email
    let user;
    try {
      user = await auth.getUserByEmail(email);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      throw error;
    }

    // Set custom claims
    await auth.setCustomUserClaims(user.uid, { role });

    // Update Firestore user document
    await db.collection('users').doc(user.uid).set({
      role,
      updatedAt: new Date(),
    }, { merge: true });

    return NextResponse.json({ 
      success: true, 
      uid: user.uid,
      email: user.email,
      role 
    });
  } catch (error: any) {
    console.error('Error setting user role:', error);
    
    if (error.message === 'Unauthorized' || error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    return NextResponse.json({ error: 'Failed to set user role' }, { status: 500 });
  }
}
