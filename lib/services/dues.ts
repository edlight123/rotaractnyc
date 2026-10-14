/**
 * Dues cycle & payment operations (server-side).
 */
import { adminDb } from '@/lib/firebase/admin';
import type { DuesCycle, MemberDues, DuesPaymentStatus } from '@/types';

const CYCLES = 'duesCycles';
const MEMBER_DUES = 'memberDues';

// ── Dues Cycles ──

export async function getActiveCycle(): Promise<DuesCycle | null> {
  const snap = await adminDb
    .collection(CYCLES)
    .where('isActive', '==', true)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as DuesCycle;
}

export async function getCycle(id: string): Promise<DuesCycle | null> {
  const doc = await adminDb.collection(CYCLES).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as DuesCycle;
}

export async function createCycle(data: Omit<DuesCycle, 'id'>): Promise<string> {
  const ref = await adminDb.collection(CYCLES).add({
    ...data,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

// ── Member Dues ──

export async function getMemberDues(memberId: string, cycleId?: string): Promise<MemberDues | null> {
  let q: FirebaseFirestore.Query = adminDb
    .collection(MEMBER_DUES)
    .where('memberId', '==', memberId);
  if (cycleId) q = q.where('cycleId', '==', cycleId);
  q = q.orderBy('createdAt', 'desc').limit(1);

  const snap = await q.get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as MemberDues;
}

export async function getAllDuesForCycle(cycleId: string): Promise<MemberDues[]> {
  const snap = await adminDb
    .collection(MEMBER_DUES)
    .where('cycleId', '==', cycleId)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MemberDues));
}

export async function recordDuesPayment(data: {
  memberId: string;
  cycleId: string;
  memberType: 'professional' | 'student';
  amount: number;
  status: DuesPaymentStatus;
  stripePaymentId?: string;
}): Promise<string> {
  // Check for existing dues record
  const existing = await getMemberDues(data.memberId, data.cycleId);
  if (existing) {
    await adminDb.collection(MEMBER_DUES).doc(existing.id).update({
      status: data.status,
      amount: data.amount,
      paidAt: new Date().toISOString(),
      stripePaymentId: data.stripePaymentId || null,
    });
    return existing.id;
  }

  const ref = await adminDb.collection(MEMBER_DUES).add({
    ...data,
    paidAt: data.status === 'PAID' ? new Date().toISOString() : null,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function updateDuesStatus(id: string, status: DuesPaymentStatus): Promise<void> {
  await adminDb.collection(MEMBER_DUES).doc(id).update({
    status,
    ...(status === 'PAID' ? { paidAt: new Date().toISOString() } : {}),
  });
}

export async function getDuesStats(cycleId: string): Promise<{
  total: number;
  paid: number;
  unpaid: number;
  collected: number;
}> {
  const allDues = await getAllDuesForCycle(cycleId);
  const paid = allDues.filter((d) => d.status === 'PAID' || d.status === 'PAID_OFFLINE');
  return {
    total: allDues.length,
    paid: paid.length,
    unpaid: allDues.length - paid.length,
    collected: paid.reduce((sum, d) => sum + (d.amount || 0), 0),
  };
}
