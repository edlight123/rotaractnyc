'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Calendar, MapPin, DollarSign, Ticket, Paperclip, Target, Store, FileText, User, Check, X } from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth';
import { apiGet, apiPatch } from '@/hooks/useFirestore';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Textarea from '@/components/ui/Textarea';
import Tabs from '@/components/ui/Tabs';
import Spinner from '@/components/ui/Spinner';
import { formatCurrency } from '@/lib/utils/format';

interface PendingApproval {
  budgets?: any[];
  payments?: any[];
  expenses?: any[];
}

export default function ApprovalsPage() {
  const { member } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingApproval>({});
  const [activeTab, setActiveTab] = useState('budgets');
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<any>(null);
  const [modalType, setModalType] = useState<'budget' | 'payment' | 'expense'>('budget');
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      const data = await apiGet('/api/finance/approvals');
      setPending(data);
    } catch (error) {
      toast('Failed to load pending approvals', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openApprovalModal = (item: any, type: 'budget' | 'payment' | 'expense', action: 'approve' | 'reject') => {
    setModalData(item);
    setModalType(type);
    setApprovalAction(action);
    setNotes('');
    setShowModal(true);
  };

  const handleApprovalSubmit = async () => {
    if (!modalData) return;
    setProcessing(true);

    try {
      await apiPatch('/api/finance/approvals', {
        type: modalType,
        id: modalData.id,
        action: approvalAction,
        notes: notes || undefined,
      });

      toast(
        approvalAction === 'approve'
          ? `${modalType.charAt(0).toUpperCase() + modalType.slice(1)} approved!`
          : `${modalType.charAt(0).toUpperCase() + modalType.slice(1)} rejected`
      );
      
      setShowModal(false);
      fetchPending();
    } catch (error: any) {
      toast(error.message || 'Failed to process approval', 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  const isPresident = member?.role === 'president';
  const isTreasurer = member?.role === 'treasurer';

  const tabs = [
    ...(isPresident ? [{ id: 'budgets', label: `Budgets (${pending.budgets?.length || 0})` }] : []),
    ...(isTreasurer ? [{ id: 'payments', label: `Payments (${pending.payments?.length || 0})` }] : []),
    ...(isTreasurer ? [{ id: 'expenses', label: `Expenses (${pending.expenses?.length || 0})` }] : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Approvals</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Review and approve pending budgets, payments, and expenses
        </p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Budgets Tab */}
      {activeTab === 'budgets' && isPresident && (
        <div className="space-y-4">
          {!pending.budgets || pending.budgets.length === 0 ? (
            <Card padding="lg">
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="font-display font-bold text-gray-900 dark:text-white mb-2">
                  No pending budgets
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  All activity budgets have been reviewed.
                </p>
              </div>
            </Card>
          ) : (
            pending.budgets.map((activity) => (
              <Card key={activity.id} padding="lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-display font-bold text-xl text-gray-900 dark:text-white">
                        {activity.name}
                      </h3>
                      <Badge variant="gold">Pending Approval</Badge>
                    </div>
                    <div className="text-sm text-gray-500 space-y-1 mb-4">
                      <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(activity.date).toLocaleDateString()}</div>
                      {activity.location && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {activity.location}</div>}
                      <div className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Budget: {formatCurrency(activity.budget.totalEstimate)}</div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Budget Breakdown</h4>
                      <div className="space-y-2">
                        {activity.budget.lineItems.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">{item.name}</span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(item.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button size="sm" onClick={() => openApprovalModal(activity, 'budget', 'approve')}>
                      <Check className="w-3.5 h-3.5 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => openApprovalModal(activity, 'budget', 'reject')}>
                      <X className="w-3.5 h-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && isTreasurer && (
        <div className="space-y-4">
          {!pending.payments || pending.payments.length === 0 ? (
            <Card padding="lg">
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="font-display font-bold text-gray-900 dark:text-white mb-2">
                  No pending payments
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  All offline payments have been processed.
                </p>
              </div>
            </Card>
          ) : (
            pending.payments.map((payment) => (
              <Card key={payment.id} padding="lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-display font-bold text-xl text-gray-900 dark:text-white">
                        {payment.memberName}
                      </h3>
                      <Badge variant="gold">Pending</Badge>
                      <Badge variant="gray">{payment.method.toUpperCase()}</Badge>
                    </div>
                    <div className="text-sm text-gray-500 space-y-1 mb-4">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5" /> {formatCurrency(payment.amount)} for {payment.type === 'dues' ? 'Dues' : 'Event Ticket'}
                      </div>
                      {payment.eventName && <div className="flex items-center gap-1.5"><Ticket className="w-3.5 h-3.5" /> {payment.eventName}</div>}
                      <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Submitted {new Date(payment.submittedAt).toLocaleDateString()}</div>
                    </div>
                    {payment.proofUrl && (
                      <a
                        href={payment.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-azure-600 hover:underline flex items-center gap-1"
                      >
                        <Paperclip className="w-3.5 h-3.5" /> View Payment Proof
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button size="sm" onClick={() => openApprovalModal(payment, 'payment', 'approve')}>
                      <Check className="w-3.5 h-3.5 mr-1" /> Confirm Payment
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => openApprovalModal(payment, 'payment', 'reject')}>
                      <X className="w-3.5 h-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Expenses Tab */}
      {activeTab === 'expenses' && isTreasurer && (
        <div className="space-y-4">
          {!pending.expenses || pending.expenses.length === 0 ? (
            <Card padding="lg">
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="font-display font-bold text-gray-900 dark:text-white mb-2">
                  No pending expenses
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  All expenses have been reviewed.
                </p>
              </div>
            </Card>
          ) : (
            pending.expenses.map((expense) => (
              <Card key={expense.id} padding="lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-display font-bold text-xl text-gray-900 dark:text-white">
                        {expense.category}
                      </h3>
                      <Badge variant="gold">Pending</Badge>
                    </div>
                    <div className="text-sm text-gray-500 space-y-1 mb-4">
                      <div className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> {expense.activityName}</div>
                      <div className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> {formatCurrency(expense.amount)}</div>
                      {expense.vendor && <div className="flex items-center gap-1.5"><Store className="w-3.5 h-3.5" /> {expense.vendor}</div>}
                      {expense.description && <div className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> {expense.description}</div>}
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" /> Submitted by {expense.submittedByName} on{' '}
                        {new Date(expense.submittedAt).toLocaleDateString()}
                      </div>
                    </div>
                    {expense.receiptUrl && (
                      <a
                        href={expense.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-azure-600 hover:underline flex items-center gap-1"
                      >
                        <Paperclip className="w-3.5 h-3.5" /> View Receipt
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button size="sm" onClick={() => openApprovalModal(expense, 'expense', 'approve')}>
                      <Check className="w-3.5 h-3.5 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => openApprovalModal(expense, 'expense', 'reject')}>
                      <X className="w-3.5 h-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Approval Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={
          approvalAction === 'approve'
            ? `Approve ${modalType.charAt(0).toUpperCase() + modalType.slice(1)}`
            : `Reject ${modalType.charAt(0).toUpperCase() + modalType.slice(1)}`
        }
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            {approvalAction === 'approve'
              ? `Are you sure you want to approve this ${modalType}?`
              : `Please provide a reason for rejecting this ${modalType}.`}
          </p>
          
          {modalData && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-sm">
              {modalType === 'budget' && (
                <>
                  <div className="font-semibold text-gray-900 dark:text-white">{modalData.name}</div>
                  <div className="text-gray-500 mt-1">
                    Budget: {formatCurrency(modalData.budget.totalEstimate)}
                  </div>
                </>
              )}
              {modalType === 'payment' && (
                <>
                  <div className="font-semibold text-gray-900 dark:text-white">{modalData.memberName}</div>
                  <div className="text-gray-500 mt-1">
                    {formatCurrency(modalData.amount)} via {modalData.method}
                  </div>
                </>
              )}
              {modalType === 'expense' && (
                <>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {modalData.category} - {modalData.activityName}
                  </div>
                  <div className="text-gray-500 mt-1">{formatCurrency(modalData.amount)}</div>
                </>
              )}
            </div>
          )}

          <Textarea
            label={approvalAction === 'approve' ? 'Notes (optional)' : 'Reason for rejection'}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes or comments..."
            rows={3}
            required={approvalAction === 'reject'}
          />
          
          <div className="flex gap-3">
            <Button onClick={handleApprovalSubmit} loading={processing} className="flex-1">
              {approvalAction === 'approve' ? 'Approve' : 'Reject'}
            </Button>
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
