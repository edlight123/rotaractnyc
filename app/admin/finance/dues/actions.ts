'use server';

import {
  createDuesCycle,
  activateDuesCycle,
  getAllDuesCycles,
  getAllMemberDuesForCycle,
  markDuesPaidOffline,
  waiveMemberDues,
} from '@/lib/firebase/duesCycles';
import { getAllMembers } from '@/lib/firebase/members';

/**
 * Create a new dues cycle
 */
export async function createCycleAction(endingYear: number, amount: number, createdBy: string) {
  try {
    const cycle = await createDuesCycle({
      endingYear,
      amount: amount * 100, // Convert to cents
      createdBy,
    });
    return { success: true, cycle };
  } catch (error: any) {
    console.error('Error creating cycle:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Activate a dues cycle
 */
export async function activateCycleAction(cycleId: string) {
  try {
    await activateDuesCycle(cycleId);
    return { success: true };
  } catch (error: any) {
    console.error('Error activating cycle:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all dues cycles
 */
export async function getCyclesAction() {
  try {
    const cycles = await getAllDuesCycles();
    return { success: true, cycles };
  } catch (error: any) {
    console.error('Error fetching cycles:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get member dues for a specific cycle
 */
export async function getMemberDuesAction(cycleId: string) {
  try {
    const members = await getAllMembers();
    const memberDuesMap = await getAllMemberDuesForCycle(cycleId);

    // Combine member info with dues status
    const enrichedDues = members.map((member) => {
      const dues = memberDuesMap.get(member.id);
      return {
        memberId: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        memberStatus: member.status,
        duesStatus: dues?.status || 'UNPAID',
        paidAt: dues?.paidAt,
        paidOfflineAt: dues?.paidOfflineAt,
        waivedAt: dues?.waivedAt,
        note: dues?.note,
      };
    });

    return { success: true, memberDues: enrichedDues };
  } catch (error: any) {
    console.error('Error fetching member dues:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark dues as paid offline
 */
export async function markPaidOfflineAction(
  memberId: string,
  cycleId: string,
  adminUid: string,
  notes?: string
) {
  try {
    await markDuesPaidOffline({
      memberId,
      cycleId,
      note: notes || 'Marked as paid offline',
      adminUid,
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error marking dues as paid offline:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Waive member dues
 */
export async function waiveDuesAction(
  memberId: string,
  cycleId: string,
  adminUid: string,
  reason: string
) {
  try {
    await waiveMemberDues({
      memberId,
      cycleId,
      note: reason,
      adminUid,
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error waiving dues:', error);
    return { success: false, error: error.message };
  }
}
