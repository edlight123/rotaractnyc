import { cookies } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';
import { getFirebaseAdminApp } from '@/lib/firebase/admin';
import { getFirestore } from 'firebase-admin/firestore';
import { User, UserRole } from '@/types/portal';
import { PORTAL_SESSION_COOKIE } from '@/lib/portal/session';

export interface PortalSession {
  uid: string;
  email: string;
  role: UserRole;
  user: User | null;
}

export async function getPortalSession(): Promise<PortalSession | null> {
  try {
    const sessionCookie = cookies().get(PORTAL_SESSION_COOKIE)?.value;
    
    if (!sessionCookie) {
      return null;
    }

    const app = getFirebaseAdminApp();
    if (!app) {
      return null;
    }

    const auth = getAuth(app);
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    
    // Fetch user data from Firestore
    const db = getFirestore(app);
    const userDoc = await db.collection('users').doc(decodedClaims.uid).get();
    
    const userData = userDoc.exists ? { uid: decodedClaims.uid, ...userDoc.data() } as User : null;
    
    return {
      uid: decodedClaims.uid,
      email: decodedClaims.email || '',
      role: (decodedClaims.role as UserRole) || 'MEMBER',
      user: userData,
    };
  } catch (error) {
    console.error('Error verifying portal session:', error);
    return null;
  }
}

export async function requirePortalSession(): Promise<PortalSession> {
  const session = await getPortalSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function requireRole(minRole: UserRole): Promise<PortalSession> {
  const session = await requirePortalSession();
  
  const roleHierarchy: Record<UserRole, number> = {
    MEMBER: 1,
    BOARD: 2,
    TREASURER: 3,
    ADMIN: 4,
  };
  
  const userRoleLevel = roleHierarchy[session.role] || 0;
  const requiredRoleLevel = roleHierarchy[minRole];
  
  if (userRoleLevel < requiredRoleLevel) {
    throw new Error('Insufficient permissions');
  }
  
  return session;
}
