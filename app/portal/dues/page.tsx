'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { apiPost, apiGet, apiPatch } from '@/hooks/useFirestore';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Tabs from '@/components/ui/Tabs';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { SITE } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils/format';
import type { DuesPaymentStatus, PaymentMethod } from '@/types';

const STATUS_BADGES: Record<DuesPaymentStatus, { variant: 'green' | 'azure' | 'red' | 'gold'; label: string }> = {
  PAID: { variant: 'green', label: 'Paid' },
  PAID_OFFLINE: { variant: 'green', label: 'Paid (Offline)' },
  WAIVED: { variant: 'azure', label: 'Waived' },
  UNPAID: { variant: 'red', label: 'Unpaid' },
};

interface EnrichedDues {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  memberType: 'professional' | 'student';
  amount: number;
  status: DuesPaymentStatus;
  paidAt?: string;
  paymentMethod?: string;
  approvedBy?: string;
}

interface MemberWithoutDues {
  memberId: string;
  memberName: string;
  memberEmail: string;
  memberType: string;
  status: 'UNPAID';
}

export default function DuesPage() {
  const { member } = useAuth();
  const { toast } = useToast();
  const isTreasurer = member?.role === 'treasurer' || member?.role === 'president';

  // Member view state
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [selectedType, setSelectedType] = useState<'professional' | 'student'>('professional');
  const [duesStatus, setDuesStatus] = useState<DuesPaymentStatus>('UNPAID');
  const [cycleName, setCycleName] = useState('2025-2026');
  const [cycleAmounts, setCycleAmounts] = useState({ professional: SITE.dues.professional, student: SITE.dues.student });

  // Payment settings
  const [paymentSettings, setPaymentSettings] = useState({ zelleIdentifier: '', zelleEnabled: true, venmoUsername: '', venmoEnabled: true, cashappUsername: '', cashappEnabled: true });

  // Treasurer manage state
  const [activeTab, setActiveTab] = useState('my-dues');
  const [manageLoading, setManageLoading] = useState(false);
  const [allDues, setAllDues] = useState<EnrichedDues[]>([]);
  const [membersWithoutDues, setMembersWithoutDues] = useState<MemberWithoutDues[]>([]);
  const [stats, setStats] = useState({ total: 0, paid: 0, unpaid: 0, waived: 0, collected: 0 });
  const [cycle, setCycle] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Approve modal state
  const [approveModal, setApproveModal] = useState(false);
  const [approveTarget, setApproveTarget] = useState<{ memberId: string; memberName: string; memberType: string; amount: number; duesId?: string } | null>(null);
  const [approveMethod, setApproveMethod] = useState<PaymentMethod>('zelle');
  const [approveDate, setApproveDate] = useState(new Date().toISOString().split('T')[0]);
  const [approveNotes, setApproveNotes] = useState('');
  const [approving, setApproving] = useState(false);

  // Cycle settings state
  const [cycles, setCycles] = useState<any[]>([]);
  const [cycleLoading, setCycleLoading] = useState(false);
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [cycleForm, setCycleForm] = useState({ name: '', startDate: '', endDate: '', amountProfessional: 8500, amountStudent: 6500, gracePeriodDays: 30, isActive: false });
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null);

  // Payment settings edit state
  const [editingPayment, setEditingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ zelleIdentifier: '', zelleEnabled: true, venmoUsername: '', venmoEnabled: true, cashappUsername: '', cashappEnabled: true });
  const [savingPayment, setSavingPayment] = useState(false);

  // Fetch member's own dues
  useEffect(() => {
    if (!member?.id) { setLoading(false); return; }
    (async () => {
      try {
        const [duesData, paySettings] = await Promise.all([
          apiGet('/api/portal/dues'),
          apiGet('/api/portal/settings/payment').catch(() => ({ zelleIdentifier: '', zelleEnabled: true, venmoUsername: '', venmoEnabled: true, cashappUsername: '', cashappEnabled: true })),
        ]);
        if (duesData?.dues?.status) setDuesStatus(duesData.dues.status);
        if (duesData?.cycle?.name) setCycleName(duesData.cycle.name);
        if (duesData?.cycle) {
          setCycleAmounts({
            professional: duesData.cycle.amountProfessional ?? SITE.dues.professional,
            student: duesData.cycle.amountStudent ?? SITE.dues.student,
          });
        }
        setPaymentSettings(paySettings);
        setPaymentForm(paySettings);
      } catch { /* defaults */ } finally { setLoading(false); }
    })();
  }, [member?.id]);

  useEffect(() => {
    if (member?.memberType) setSelectedType(member.memberType);
  }, [member?.memberType]);

  // Fetch treasurer management data
  const fetchManageData = async () => {
    if (!isTreasurer) return;
    setManageLoading(true);
    try {
      const data = await apiGet('/api/portal/dues?manage=true');
      setAllDues(data.allDues || []);
      setMembersWithoutDues(data.membersWithoutDues || []);
      setStats(data.stats || { total: 0, paid: 0, unpaid: 0, waived: 0, collected: 0 });
      setCycle(data.cycle || null);
    } catch {
      toast('Failed to load dues management data', 'error');
    } finally {
      setManageLoading(false);
    }
  };

  const fetchCycles = async () => {
    setCycleLoading(true);
    try {
      const data = await apiGet('/api/portal/dues/cycles');
      setCycles(data.cycles || []);
    } catch { /* ignore */ } finally { setCycleLoading(false); }
  };

  useEffect(() => {
    if (activeTab === 'manage' && isTreasurer) {
      fetchManageData();
      fetchCycles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isTreasurer]);

  const amount = selectedType === 'student' ? cycleAmounts.student : cycleAmounts.professional;

  const handlePay = async () => {
    setPaying(true);
    try {
      const { url } = await apiPost('/api/portal/dues', { memberType: selectedType });
      if (url) {
        window.location.href = url;
      } else {
        toast('Dues recorded successfully!');
        setDuesStatus('PAID');
      }
    } catch (err: any) {
      toast(err.message || 'Payment failed', 'error');
    } finally { setPaying(false); }
  };

  // Treasurer actions
  const handleApproveOffline = async () => {
    if (!approveTarget || !cycle) return;
    setApproving(true);
    try {
      await apiPatch('/api/portal/dues', {
        action: 'approve-offline',
        memberId: approveTarget.memberId,
        cycleId: cycle.id,
        duesId: approveTarget.duesId,
        memberType: approveTarget.memberType,
        amount: approveTarget.amount,
        paymentMethod: approveMethod,
        paymentDate: approveDate,
        notes: approveNotes,
      });
      toast(`Payment approved for ${approveTarget.memberName}`);
      setApproveModal(false);
      setApproveTarget(null);
      setApproveNotes('');
      fetchManageData();
    } catch (err: any) {
      toast(err.message || 'Failed to approve', 'error');
    } finally { setApproving(false); }
  };

  const handleWaive = async (memberId: string, duesId?: string, memberType?: string) => {
    if (!cycle) return;
    try {
      await apiPatch('/api/portal/dues', {
        action: 'waive',
        memberId,
        cycleId: cycle.id,
        duesId,
        memberType: memberType || 'professional',
      });
      toast('Dues waived');
      fetchManageData();
    } catch (err: any) {
      toast(err.message || 'Failed to waive', 'error');
    }
  };

  const handleMarkUnpaid = async (duesId: string) => {
    try {
      await apiPatch('/api/portal/dues', { action: 'mark-unpaid', duesId });
      toast('Status reset to unpaid');
      fetchManageData();
    } catch (err: any) {
      toast(err.message || 'Failed to update', 'error');
    }
  };

  // Cycle management
  const handleSaveCycle = async () => {
    try {
      if (editingCycleId) {
        await apiPatch('/api/portal/dues/cycles', { id: editingCycleId, ...cycleForm });
        toast('Cycle updated');
      } else {
        await apiPost('/api/portal/dues/cycles', cycleForm);
        toast('Cycle created');
      }
      setShowCycleModal(false);
      setEditingCycleId(null);
      fetchCycles();
      fetchManageData();
    } catch (err: any) {
      toast(err.message || 'Failed to save cycle', 'error');
    }
  };

  // Payment settings save
  const handleSavePaymentSettings = async () => {
    setSavingPayment(true);
    try {
      await fetch('/api/portal/settings/payment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentForm),
      });
      setPaymentSettings(paymentForm);
      setEditingPayment(false);
      toast('Payment settings saved');
    } catch {
      toast('Failed to save', 'error');
    } finally { setSavingPayment(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;

  // Filter combined dues list
  const allMembers = [
    ...allDues.map((d) => ({ ...d, hasDuesRecord: true })),
    ...membersWithoutDues.map((m) => ({
      id: '',
      memberId: m.memberId,
      memberName: m.memberName,
      memberEmail: m.memberEmail,
      memberType: m.memberType as 'professional' | 'student',
      amount: 0,
      status: 'UNPAID' as DuesPaymentStatus,
      hasDuesRecord: false,
    })),
  ];

  const filteredMembers = statusFilter === 'all'
    ? allMembers
    : allMembers.filter((m) => m.status === statusFilter);

  const tabs = isTreasurer
    ? [
        { id: 'my-dues', label: 'My Dues' },
        { id: 'manage', label: 'Manage', count: stats.unpaid || undefined },
      ]
    : [];

  return (
    <div className="max-w-5xl mx-auto space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Annual Dues</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {isTreasurer ? 'Manage membership dues and approve offline payments.' : 'Manage your membership dues for the current Rotary year.'}
        </p>
      </div>

      {/* Tabs — only shown for treasurer/president */}
      {isTreasurer && (
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      )}

      {/* ───── MY DUES TAB ───── */}
      {activeTab === 'my-dues' && (
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Status Card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6 sm:p-8">
            <div className="text-center">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Rotary Year {cycleName}</p>
              <Badge
                variant={STATUS_BADGES[duesStatus].variant}
                className="text-sm px-4 py-1.5"
              >
                {STATUS_BADGES[duesStatus].label}
              </Badge>
            </div>

            {duesStatus === 'UNPAID' && (
              <div className="mt-8 space-y-6">
                <div className="relative p-6 rounded-2xl border-2 border-cranberry bg-cranberry-50/50 dark:bg-cranberry-900/10 shadow-sm text-center">
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-cranberry flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 capitalize">{selectedType} Membership</p>
                  <p className="text-4xl font-display font-bold text-cranberry mt-2">{formatCurrency(amount)}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {selectedType === 'student' ? 'Student rate — valid student ID required' : 'Professional rate'}
                  </p>
                </div>

                <Button size="lg" className="w-full" loading={paying} onClick={handlePay}>
                  Pay {formatCurrency(amount)} via Stripe
                </Button>

                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  Secure payment powered by Stripe
                </div>

                {/* Alternative Payment Methods */}
                {((paymentSettings.zelleEnabled && paymentSettings.zelleIdentifier) || (paymentSettings.venmoEnabled && paymentSettings.venmoUsername) || (paymentSettings.cashappEnabled && paymentSettings.cashappUsername)) && (
                  <div className="bg-azure-50 dark:bg-azure-900/10 rounded-xl border border-azure-200 dark:border-azure-800 p-5 space-y-3">
                    <h4 className="font-display font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                      <svg className="w-4 h-4 text-azure" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                      Other Payment Methods
                    </h4>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      {paymentSettings.zelleEnabled && paymentSettings.zelleIdentifier && (
                        <p className="flex items-center gap-2">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Zelle:</span>
                          <span className="font-mono">{paymentSettings.zelleIdentifier}</span>
                        </p>
                      )}
                      {paymentSettings.venmoEnabled && paymentSettings.venmoUsername && (
                        <p className="flex items-center gap-2">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Venmo:</span>
                          <span className="font-mono">@{paymentSettings.venmoUsername}</span>
                        </p>
                      )}
                      {paymentSettings.cashappEnabled && paymentSettings.cashappUsername && (
                        <p className="flex items-center gap-2">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Cash App:</span>
                          <span className="font-mono">${paymentSettings.cashappUsername}</span>
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-azure-700 dark:text-azure-400 bg-azure-100 dark:bg-azure-900/20 rounded-lg p-2.5">
                      After sending payment, your treasurer will verify and approve it within 48 hours.
                    </p>
                  </div>
                )}
              </div>
            )}

            {(duesStatus === 'PAID' || duesStatus === 'PAID_OFFLINE') && (
              <div className="mt-8 text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                  <svg className="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your dues for {cycleName} have been paid. Thank you for your support.
                </p>
              </div>
            )}

            {duesStatus === 'WAIVED' && (
              <div className="mt-8 text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-azure-100 dark:bg-azure-900/20 flex items-center justify-center">
                  <svg className="w-7 h-7 text-azure dark:text-azure-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your dues for {cycleName} have been waived.
                </p>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6">
            <h3 className="font-display font-bold text-gray-900 dark:text-white mb-3">About Annual Dues</h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2"><span className="text-cranberry mt-0.5">•</span>The Rotary year runs July 1 – June 30</li>
              <li className="flex items-start gap-2"><span className="text-cranberry mt-0.5">•</span>Dues include Rotary International membership registration</li>
              <li className="flex items-start gap-2"><span className="text-cranberry mt-0.5">•</span>There is a 30-day grace period after the cycle ends</li>
              <li className="flex items-start gap-2"><span className="text-cranberry mt-0.5">•</span>Contact your treasurer for payment questions or alternative arrangements</li>
            </ul>
          </div>
        </div>
      )}

      {/* ───── MANAGE TAB (Treasurer only) ───── */}
      {activeTab === 'manage' && isTreasurer && (
        <div className="space-y-6">
          {manageLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : (
            <>
              {/* Stats Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: 'Total Members', value: stats.total + membersWithoutDues.length, color: 'text-gray-900 dark:text-white' },
                  { label: 'Paid', value: stats.paid, color: 'text-emerald-600' },
                  { label: 'Unpaid', value: stats.unpaid + membersWithoutDues.length, color: 'text-red-600' },
                  { label: 'Waived', value: stats.waived, color: 'text-azure' },
                  { label: 'Collected', value: formatCurrency(stats.collected), color: 'text-emerald-600' },
                ].map((s) => (
                  <div key={s.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/60 dark:border-gray-800 p-4 text-center">
                    <p className={`text-xl font-display font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Filter */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-gray-500">Filter:</span>
                {['all', 'UNPAID', 'PAID', 'PAID_OFFLINE', 'WAIVED'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                      statusFilter === f
                        ? 'bg-cranberry text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                  >
                    {f === 'all' ? 'All' : f === 'PAID_OFFLINE' ? 'Paid Offline' : f.charAt(0) + f.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              {/* Members Dues Table */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800 text-left">
                        <th className="px-5 py-3 font-semibold text-gray-500 dark:text-gray-400">Member</th>
                        <th className="px-5 py-3 font-semibold text-gray-500 dark:text-gray-400">Type</th>
                        <th className="px-5 py-3 font-semibold text-gray-500 dark:text-gray-400">Amount</th>
                        <th className="px-5 py-3 font-semibold text-gray-500 dark:text-gray-400">Status</th>
                        <th className="px-5 py-3 font-semibold text-gray-500 dark:text-gray-400">Paid</th>
                        <th className="px-5 py-3 font-semibold text-gray-500 dark:text-gray-400 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {filteredMembers.map((m, idx) => {
                        const badge = STATUS_BADGES[m.status];
                        const displayAmount = m.amount || (m.memberType === 'student' ? cycleAmounts.student : cycleAmounts.professional);
                        return (
                          <tr key={m.memberId + idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="px-5 py-3">
                              <p className="font-medium text-gray-900 dark:text-white">{m.memberName}</p>
                              <p className="text-xs text-gray-400">{m.memberEmail}</p>
                            </td>
                            <td className="px-5 py-3 capitalize text-gray-600 dark:text-gray-400">{m.memberType}</td>
                            <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">{formatCurrency(displayAmount)}</td>
                            <td className="px-5 py-3"><Badge variant={badge.variant}>{badge.label}</Badge></td>
                            <td className="px-5 py-3 text-gray-500 text-xs">{(m as any).paidAt ? new Date((m as any).paidAt).toLocaleDateString() : '—'}</td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {m.status === 'UNPAID' && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setApproveTarget({
                                          memberId: m.memberId,
                                          memberName: m.memberName,
                                          memberType: m.memberType,
                                          amount: displayAmount,
                                          duesId: m.id || undefined,
                                        });
                                        setApproveModal(true);
                                      }}
                                      className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 font-medium transition-colors"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleWaive(m.memberId, m.id || undefined, m.memberType)}
                                      className="text-xs px-2.5 py-1 rounded-lg bg-azure-50 text-azure-700 hover:bg-azure-100 dark:bg-azure-900/20 dark:text-azure-400 font-medium transition-colors"
                                    >
                                      Waive
                                    </button>
                                  </>
                                )}
                                {(m.status === 'PAID' || m.status === 'PAID_OFFLINE' || m.status === 'WAIVED') && m.id && (
                                  <button
                                    onClick={() => handleMarkUnpaid(m.id)}
                                    className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 font-medium transition-colors"
                                  >
                                    Reset
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredMembers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-5 py-8 text-center text-gray-400">No members match the selected filter.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cycle Settings & Payment Methods — side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Cycle Settings */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-bold text-gray-900 dark:text-white">Dues Cycles</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingCycleId(null);
                        setCycleForm({ name: '', startDate: '', endDate: '', amountProfessional: 8500, amountStudent: 6500, gracePeriodDays: 30, isActive: false });
                        setShowCycleModal(true);
                      }}
                    >
                      + New Cycle
                    </Button>
                  </div>
                  {cycleLoading ? <Spinner /> : (
                    <div className="space-y-2">
                      {cycles.map((c: any) => (
                        <div key={c.id} className={`flex items-center justify-between p-3 rounded-xl border ${c.isActive ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10' : 'border-gray-200 dark:border-gray-800'}`}>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                              {c.name}
                              {c.isActive && <Badge variant="green">Active</Badge>}
                            </p>
                            <p className="text-xs text-gray-500">
                              Pro: {formatCurrency(c.amountProfessional)} · Student: {formatCurrency(c.amountStudent)} · Grace: {c.gracePeriodDays}d
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setEditingCycleId(c.id);
                              setCycleForm({
                                name: c.name,
                                startDate: c.startDate?.split('T')[0] || '',
                                endDate: c.endDate?.split('T')[0] || '',
                                amountProfessional: c.amountProfessional,
                                amountStudent: c.amountStudent,
                                gracePeriodDays: c.gracePeriodDays,
                                isActive: c.isActive,
                              });
                              setShowCycleModal(true);
                            }}
                            className="text-xs text-cranberry hover:underline font-medium"
                          >
                            Edit
                          </button>
                        </div>
                      ))}
                      {cycles.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-4">No cycles yet. Create one to start collecting dues.</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Payment Methods Settings */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-bold text-gray-900 dark:text-white">Payment Methods</h3>
                    {!editingPayment && (
                      <Button size="sm" variant="ghost" onClick={() => { setPaymentForm(paymentSettings); setEditingPayment(true); }}>
                        Edit
                      </Button>
                    )}
                  </div>
                  {editingPayment ? (
                    <div className="space-y-3">
                      <Input label="Zelle Identifier" value={paymentForm.zelleIdentifier} onChange={(e) => setPaymentForm((p) => ({ ...p, zelleIdentifier: e.target.value }))} placeholder="email@example.com or (555) 123-4567" />
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="zelleEnabled" checked={paymentForm.zelleEnabled} onChange={(e) => setPaymentForm((p) => ({ ...p, zelleEnabled: e.target.checked }))} className="rounded" />
                        <label htmlFor="zelleEnabled" className="text-sm text-gray-600 dark:text-gray-400">Enable Zelle payments</label>
                      </div>
                      <Input label="Venmo Username" value={paymentForm.venmoUsername} onChange={(e) => setPaymentForm((p) => ({ ...p, venmoUsername: e.target.value }))} placeholder="username" />
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="venmoEnabled" checked={paymentForm.venmoEnabled} onChange={(e) => setPaymentForm((p) => ({ ...p, venmoEnabled: e.target.checked }))} className="rounded" />
                        <label htmlFor="venmoEnabled" className="text-sm text-gray-600 dark:text-gray-400">Enable Venmo payments</label>
                      </div>
                      <Input label="Cash App Username" value={paymentForm.cashappUsername} onChange={(e) => setPaymentForm((p) => ({ ...p, cashappUsername: e.target.value }))} placeholder="$cashtag" />
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="cashappEnabled" checked={paymentForm.cashappEnabled} onChange={(e) => setPaymentForm((p) => ({ ...p, cashappEnabled: e.target.checked }))} className="rounded" />
                        <label htmlFor="cashappEnabled" className="text-sm text-gray-600 dark:text-gray-400">Enable Cash App payments</label>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSavePaymentSettings} loading={savingPayment}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingPayment(false)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                        <span className="font-semibold text-gray-700 dark:text-gray-300 w-16">Zelle</span>
                        <span className="text-gray-600 dark:text-gray-400 font-mono">{paymentSettings.zelleEnabled ? paymentSettings.zelleIdentifier || '—' : '(disabled)'}</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                        <span className="font-semibold text-gray-700 dark:text-gray-300 w-16">Venmo</span>
                      <span className="text-gray-600 dark:text-gray-400 font-mono">{paymentSettings.venmoEnabled ? '@' + (paymentSettings.venmoUsername || '—') : '(disabled)'}</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                        <span className="font-semibold text-gray-700 dark:text-gray-300 w-20">Cash App</span>
                        <span className="text-gray-600 dark:text-gray-400 font-mono">{paymentSettings.cashappEnabled ? '$' + (paymentSettings.cashappUsername || '—') : '(disabled)'}</span>
                      </div>
                      {!(paymentSettings.zelleEnabled && paymentSettings.zelleIdentifier) && !(paymentSettings.venmoEnabled && paymentSettings.venmoUsername) && !(paymentSettings.cashappEnabled && paymentSettings.cashappUsername) && (
                        <p className="text-sm text-gray-400 text-center py-2">No payment methods configured. Click Edit to add Zelle or Venmo info.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ───── Approve Offline Payment Modal ───── */}
      <Modal open={approveModal} onClose={() => setApproveModal(false)} title="Approve Offline Payment" size="sm">
        {approveTarget && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <p className="font-medium text-gray-900 dark:text-white">{approveTarget.memberName}</p>
              <p className="text-sm text-gray-500 capitalize">{approveTarget.memberType} — {formatCurrency(approveTarget.amount)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Payment Method</label>
              <select
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cranberry-500/20 focus:border-cranberry-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                value={approveMethod}
                onChange={(e) => setApproveMethod(e.target.value as PaymentMethod)}
              >
                <option value="zelle">Zelle</option>
                <option value="venmo">Venmo</option>
                <option value="cashapp">Cash App</option>
                <option value="cash">Cash</option>
                <option value="check">Check</option>
              </select>
            </div>
            <Input label="Payment Date" type="date" value={approveDate} onChange={(e) => setApproveDate(e.target.value)} />
            <Input label="Notes (optional)" value={approveNotes} onChange={(e) => setApproveNotes(e.target.value)} placeholder="e.g., Received at meeting" />
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={handleApproveOffline} loading={approving}>Approve Payment</Button>
              <Button variant="ghost" onClick={() => setApproveModal(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ───── Cycle Modal ───── */}
      <Modal open={showCycleModal} onClose={() => setShowCycleModal(false)} title={editingCycleId ? 'Edit Dues Cycle' : 'New Dues Cycle'} size="sm">
        <div className="space-y-4">
          <Input label="Cycle Name" value={cycleForm.name} onChange={(e) => setCycleForm((f) => ({ ...f, name: e.target.value }))} placeholder="2025-2026" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" value={cycleForm.startDate} onChange={(e) => setCycleForm((f) => ({ ...f, startDate: e.target.value }))} />
            <Input label="End Date" type="date" value={cycleForm.endDate} onChange={(e) => setCycleForm((f) => ({ ...f, endDate: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Professional (cents)" type="number" value={String(cycleForm.amountProfessional)} onChange={(e) => setCycleForm((f) => ({ ...f, amountProfessional: Number(e.target.value) }))} />
            <Input label="Student (cents)" type="number" value={String(cycleForm.amountStudent)} onChange={(e) => setCycleForm((f) => ({ ...f, amountStudent: Number(e.target.value) }))} />
          </div>
          <Input label="Grace Period (days)" type="number" value={String(cycleForm.gracePeriodDays)} onChange={(e) => setCycleForm((f) => ({ ...f, gracePeriodDays: Number(e.target.value) }))} />
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={cycleForm.isActive} onChange={(e) => setCycleForm((f) => ({ ...f, isActive: e.target.checked }))} className="rounded border-gray-300 text-cranberry focus:ring-cranberry-500" />
            Set as active cycle
          </label>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleSaveCycle}>{editingCycleId ? 'Update' : 'Create'} Cycle</Button>
            <Button variant="ghost" onClick={() => setShowCycleModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
