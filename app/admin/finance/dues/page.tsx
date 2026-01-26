'use client';

import { useState, useEffect } from 'react';
import { useAdminSession } from '@/lib/admin/useAdminSession';
import {
  createCycleAction,
  activateCycleAction,
  getCyclesAction,
  getMemberDuesAction,
  markPaidOfflineAction,
  waiveDuesAction,
} from './actions';
import { getCurrentRotaryCycleId } from '@/lib/utils/rotaryYear';
import type { DuesCycle } from '@/types/dues';

interface MemberDuesRow {
  memberId: string;
  firstName: string;
  lastName: string;
  email: string;
  memberStatus: string;
  duesStatus: string;
  paidAt?: any;
  paidOfflineAt?: any;
  waivedAt?: any;
  note?: string;
}

export default function AdminDuesPage() {
  const session = useAdminSession();
  const [cycles, setCycles] = useState<DuesCycle[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<string | null>(null);
  const [memberDues, setMemberDues] = useState<MemberDuesRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state for creating new cycle
  const [newCycleYear, setNewCycleYear] = useState(
    new Date().getFullYear() + 1
  );
  const [newCycleAmount, setNewCycleAmount] = useState(85);

  // Modal state
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [showWaiveModal, setShowWaiveModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberDuesRow | null>(
    null
  );
  const [modalNotes, setModalNotes] = useState('');
  const [modalReason, setModalReason] = useState('');

  useEffect(() => {
    loadCycles();
  }, []);

  useEffect(() => {
    if (selectedCycle) {
      loadMemberDues(selectedCycle);
    }
  }, [selectedCycle]);

  async function loadCycles() {
    setLoading(true);
    setError(null);
    const result = await getCyclesAction();
    if (result.success) {
      setCycles(result.cycles || []);
      // Auto-select active cycle or most recent
      const activeCycle = result.cycles?.find((c) => c.isActive);
      if (activeCycle) {
        setSelectedCycle(activeCycle.id);
      } else if (result.cycles && result.cycles.length > 0) {
        setSelectedCycle(result.cycles[0].id);
      }
    } else {
      setError(result.error || 'Failed to load cycles');
    }
    setLoading(false);
  }

  async function loadMemberDues(cycleId: string) {
    const result = await getMemberDuesAction(cycleId);
    if (result.success) {
      setMemberDues(result.memberDues || []);
    } else {
      setError(result.error || 'Failed to load member dues');
    }
  }

  async function handleCreateCycle() {
    const adminUid = session.status === 'authenticated' ? session.uid : null;
    if (!adminUid) {
      alert('Unable to determine admin identity. Please refresh and try again.');
      return;
    }
    
    const result = await createCycleAction(newCycleYear, newCycleAmount, adminUid);
    if (result.success) {
      await loadCycles();
      setNewCycleYear(newCycleYear + 1);
    } else {
      alert(`Error: ${result.error}`);
    }
  }

  async function handleActivateCycle(cycleId: string) {
    if (
      !confirm(
        'Are you sure? This will deactivate all other cycles and set this as the active cycle.'
      )
    ) {
      return;
    }
    const result = await activateCycleAction(cycleId);
    if (result.success) {
      await loadCycles();
    } else {
      alert(`Error: ${result.error}`);
    }
  }

  async function handleMarkPaidOffline() {
    if (!selectedMember || !selectedCycle) return;

    const adminUid = session.status === 'authenticated' ? session.uid : null;
    if (!adminUid) {
      alert('Unable to determine admin identity. Please refresh and try again.');
      return;
    }

    const result = await markPaidOfflineAction(
      selectedMember.memberId,
      selectedCycle,
      adminUid,
      modalNotes
    );
    if (result.success) {
      setShowMarkPaidModal(false);
      setModalNotes('');
      setSelectedMember(null);
      await loadMemberDues(selectedCycle);
    } else {
      alert(`Error: ${result.error}`);
    }
  }

  async function handleWaiveDues() {
    if (!selectedMember || !selectedCycle || !modalReason.trim()) {
      alert('Please provide a reason for waiving dues');
      return;
    }

    const adminUid = session.status === 'authenticated' ? session.uid : null;
    if (!adminUid) {
      alert('Unable to determine admin identity. Please refresh and try again.');
      return;
    }

    const result = await waiveDuesAction(
      selectedMember.memberId,
      selectedCycle,
      adminUid,
      modalReason
    );
    if (result.success) {
      setShowWaiveModal(false);
      setModalReason('');
      setSelectedMember(null);
      await loadMemberDues(selectedCycle);
    } else {
      alert(`Error: ${result.error}`);
    }
  }

  function openMarkPaidModal(member: MemberDuesRow) {
    setSelectedMember(member);
    setModalNotes('');
    setShowMarkPaidModal(true);
  }

  function openWaiveModal(member: MemberDuesRow) {
    setSelectedMember(member);
    setModalReason('');
    setShowWaiveModal(true);
  }

  const activeCycle = cycles.find((c) => c.isActive);
  const currentCycleId = getCurrentRotaryCycleId();

  if (loading) {
    return (
      <div className="p-8">
        <p>Loading dues cycles...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Annual Dues Management</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Current Status */}
      <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2 text-primary">Current Status</h2>
        <p>
          <strong>Current Rotary Year:</strong> {currentCycleId}
        </p>
        <p>
          <strong>Active Cycle:</strong>{' '}
          {activeCycle ? activeCycle.id : 'None'}
        </p>
        {activeCycle && (
          <p>
            <strong>Dues Amount:</strong> ${(activeCycle.amount / 100).toFixed(2)}
          </p>
        )}
      </div>

      {/* Create New Cycle */}
      <div className="bg-white border border-gray-200 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">Create New Dues Cycle</h2>
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">
              Ending Year
            </label>
            <input
              type="number"
              value={newCycleYear}
              onChange={(e) => setNewCycleYear(parseInt(e.target.value))}
              className="border border-gray-300 rounded px-3 py-2"
              min={2024}
              max={2050}
            />
            <p className="text-xs text-gray-500 mt-1">
              e.g., 2026 = Jul 1, 2025 to Jun 30, 2026
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Dues Amount ($)
            </label>
            <input
              type="number"
              value={newCycleAmount}
              onChange={(e) => setNewCycleAmount(parseFloat(e.target.value))}
              className="border border-gray-300 rounded px-3 py-2"
              min={0}
              step={0.01}
            />
          </div>
          <button
            onClick={handleCreateCycle}
            className="bg-primary text-white px-6 py-2 rounded hover:bg-primary/90"
          >
            Create Cycle
          </button>
        </div>
      </div>

      {/* Cycles List */}
      <div className="bg-white border border-gray-200 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">Dues Cycles</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                  Cycle ID
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                  Start Date
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                  End Date
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                  Amount
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cycles.map((cycle) => (
                <tr
                  key={cycle.id}
                  className={
                    selectedCycle === cycle.id ? 'bg-primary/5' : 'bg-white'
                  }
                >
                  <td className="px-4 py-2 text-sm">{cycle.id}</td>
                  <td className="px-4 py-2 text-sm">
                    {typeof cycle.startDate === 'object' && 'toDate' in cycle.startDate 
                      ? cycle.startDate.toDate().toLocaleDateString()
                      : new Date(cycle.startDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {typeof cycle.endDate === 'object' && 'toDate' in cycle.endDate
                      ? cycle.endDate.toDate().toLocaleDateString()
                      : new Date(cycle.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    ${(cycle.amount / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {cycle.isActive ? (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                        Active
                      </span>
                    ) : (
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm space-x-2">
                    <button
                      onClick={() => setSelectedCycle(cycle.id)}
                      className="text-primary hover:underline text-sm"
                    >
                      View Members
                    </button>
                    {!cycle.isActive && (
                      <button
                        onClick={() => handleActivateCycle(cycle.id)}
                        className="text-green-600 hover:underline text-sm"
                      >
                        Activate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Member Dues Table */}
      {selectedCycle && (
        <div className="bg-white border border-gray-200 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">
            Member Dues for {selectedCycle}
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    Name
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    Email
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    Member Status
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    Dues Status
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    Details
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {memberDues.map((member) => (
                  <tr key={member.memberId}>
                    <td className="px-4 py-2 text-sm">
                      {member.firstName} {member.lastName}
                    </td>
                    <td className="px-4 py-2 text-sm">{member.email}</td>
                    <td className="px-4 py-2 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          member.memberStatus === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {member.memberStatus}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          member.duesStatus === 'PAID'
                            ? 'bg-green-100 text-green-800'
                            : member.duesStatus === 'PAID_OFFLINE'
                            ? 'bg-cyan-100 text-cyan-800'
                            : member.duesStatus === 'WAIVED'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {member.duesStatus}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {member.paidAt && (
                        <div>Paid: {new Date(member.paidAt).toLocaleDateString()}</div>
                      )}
                      {member.paidOfflineAt && (
                        <div>
                          Offline: {new Date(member.paidOfflineAt).toLocaleDateString()}
                        </div>
                      )}
                      {member.waivedAt && (
                        <div>
                          Waived: {new Date(member.waivedAt).toLocaleDateString()}
                          {member.note && (
                            <div className="text-xs italic">
                              {member.note}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm space-x-2">
                      {member.duesStatus === 'UNPAID' && (
                        <>
                          <button
                            onClick={() => openMarkPaidModal(member)}
                            className="text-primary hover:underline text-sm"
                          >
                            Mark Paid
                          </button>
                          <button
                            onClick={() => openWaiveModal(member)}
                            className="text-yellow-600 hover:underline text-sm"
                          >
                            Waive
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mark Paid Offline Modal */}
      {showMarkPaidModal && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Mark Dues as Paid Offline</h3>
            <p className="text-sm text-gray-600 mb-4">
              Member: {selectedMember.firstName} {selectedMember.lastName}
            </p>
            <label className="block text-sm font-medium mb-2">
              Notes (optional)
            </label>
            <textarea
              value={modalNotes}
              onChange={(e) => setModalNotes(e.target.value)}
              placeholder="e.g., Check #1234, Cash payment, Venmo, etc."
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowMarkPaidModal(false);
                  setSelectedMember(null);
                  setModalNotes('');
                }}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkPaidOffline}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
              >
                Mark as Paid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Waive Dues Modal */}
      {showWaiveModal && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Waive Dues</h3>
            <p className="text-sm text-gray-600 mb-4">
              Member: {selectedMember.firstName} {selectedMember.lastName}
            </p>
            <label className="block text-sm font-medium mb-2">
              Reason (required)
            </label>
            <textarea
              value={modalReason}
              onChange={(e) => setModalReason(e.target.value)}
              placeholder="e.g., Board member, Honorary member, Financial hardship, etc."
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowWaiveModal(false);
                  setSelectedMember(null);
                  setModalReason('');
                }}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleWaiveDues}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                disabled={!modalReason.trim()}
              >
                Waive Dues
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
