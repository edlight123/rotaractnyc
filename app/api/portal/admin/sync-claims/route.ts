import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminApp } from '@/lib/firebase/admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getPortalSession } from '@/lib/portal/auth';
import { isEmailAllowed } from '@/lib/firebase/allowlist';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Sync all Firestore user roles to Firebase Auth custom claims
 * 
 * This endpoint fixes permission errors by ensuring all users have their
 * Firestore role synced to their Firebase Auth custom claims.
 * 
 * Only accessible by ADMIN users or allowlisted emails.
 */
export async function POST(req: NextRequest) {
  try {
    // Check if user is authenticated and is an admin (via allowlist or custom claims)
    const session = await getPortalSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized - No session' }, { status: 401 });
    }

    // Allow if email is in allowlist OR if they have ADMIN role in Firestore document
    const isAllowlisted = isEmailAllowed(session.email);
    const hasAdminInFirestore = session.user?.role === 'ADMIN';
    const hasAdminInClaims = session.role === 'ADMIN';
    
    if (!isAllowlisted && !hasAdminInFirestore && !hasAdminInClaims) {
      return NextResponse.json({ 
        error: 'Unauthorized - Admin access required',
        email: session.email,
        firestoreRole: session.user?.role,
        claimsRole: session.role 
      }, { status: 403 });
    }

    const app = getFirebaseAdminApp();
    if (!app) {
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
    }

    const auth = getAuth(app);
    const db = getFirestore(app);

    console.log('🔄 Syncing user roles to custom claims...');

    // Get all users from Firestore
    const usersSnapshot = await db.collection('users').get();

    if (usersSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: 'No users found',
        results: [],
      });
    }

    const results: Array<{
      email: string | null;
      uid: string;
      role: string | null;
      status: 'synced' | 'already-synced' | 'skipped' | 'error';
      message: string;
    }> = [];

    // Process each user
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const uid = doc.id;
      const role = userData.role;
      const email = userData.email || null;

      if (!role) {
        results.push({
          email,
          uid,
          role: null,
          status: 'skipped',
          message: 'No role in Firestore',
        });
        continue;
      }

      try {
        // Get current custom claims
        const userRecord = await auth.getUser(uid);
        const currentRole = userRecord.customClaims?.role;

        if (currentRole === role) {
          results.push({
            email,
            uid,
            role,
            status: 'already-synced',
            message: `Role already synced (${role})`,
          });
          continue;
        }

        // Set custom claims
        await auth.setCustomUserClaims(uid, { role });
        results.push({
          email,
          uid,
          role,
          status: 'synced',
          message: `Synced role to ${role} (was: ${currentRole || 'none'})`,
        });
      } catch (error: any) {
        results.push({
          email,
          uid,
          role,
          status: 'error',
          message: error.message || 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.status === 'synced' || r.status === 'already-synced').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;

    return NextResponse.json({
      success: true,
      summary: {
        total: results.length,
        synced: results.filter(r => r.status === 'synced').length,
        alreadySynced: results.filter(r => r.status === 'already-synced').length,
        skipped: skippedCount,
        errors: errorCount,
      },
      results,
      warning: errorCount === 0
        ? 'Users must sign out and sign back in for changes to take effect'
        : 'Some users failed to sync. Check results for details.',
    });
  } catch (error: any) {
    console.error('Error syncing custom claims:', error);

    if (error.message === 'Unauthorized' || error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({
      error: 'Failed to sync custom claims',
      details: error.message,
    }, { status: 500 });
  }
}
