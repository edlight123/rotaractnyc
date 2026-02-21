'use client';

import { useState, useEffect } from 'react';
import { Calendar, MapPin, Wallet, AlertCircle, Check, X, Trash2, Paperclip } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth';
import { apiGet, apiPatch, apiDelete } from '@/hooks/useFirestore';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Textarea from '@/components/ui/Textarea';
import Spinner from '@/components/ui/Spinner';
import { formatCurrency } from '@/lib/utils/format';
import Link from 'next/link';
import type { Activity, Expense } from '@/types';

export default function ActivityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { member } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchActivityDetails();
  }, [params.id]);

  const fetchActivityDetails = async () => {
    try {
      const [activityData, expensesData] = await Promise.all([
        apiGet(`/api/finance/activities/${params.id}`),
        apiGet(`/api/finance/expenses?activityId=${params.id}`),
      ]);
      setActivity(activityData);
      setExpenses(expensesData.expenses || []);
    } catch (error) {
      toast('Failed to load activity', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalSubmit = async () => {
    if (!activity) return;
    setProcessing(true);

    try {
      if (approvalAction === 'approve') {
        await apiPatch(`/api/finance/activities/${activity.id}`, {
          status: 'approved',
          approvals: {
            ...activity.approvals,
            presidentApproved: true,
            presidentApprovedAt: new Date().toISOString(),
            presidentApprovedBy: member?.id,
            presidentNotes: approvalNotes || undefined,
          },
        });
        toast('Budget approved successfully!');
      } else {
        await apiPatch(`/api/finance/activities/${activity.id}`, {
          status: 'draft',
          approvals: {
            ...activity.approvals,
            presidentApproved: false,
            presidentNotes: approvalNotes || 'Budget rejected by president',
          },
        });
        toast('Budget returned to draft');
      }
      setShowApprovalModal(false);
      fetchActivityDetails();
    } catch (error) {
      toast('Failed to process approval', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this activity? This cannot be undone.')) return;

    try {
      await apiDelete(`/api/finance/activities/${params.id}`);
      toast('Activity deleted');
      router.push('/finance/activities');
    } catch (error) {
      toast('Failed to delete activity', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (!activity) {
    return (
      <Card padding="lg">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="font-display font-bold text-gray-900 dark:text-white mb-2">Activity not found</h3>
          <Link href="/finance/activities">
            <Button variant="secondary">Back to Activities</Button>
          </Link>
        </div>
      </Card>
    );
  }

  const budgetUsed =
    activity.actual?.totalSpent && activity.budget.totalEstimate
      ? Math.round((activity.actual.totalSpent / activity.budget.totalEstimate) * 100)
      : 0;

  const remaining = activity.budget.totalEstimate - (activity.actual?.totalSpent || 0);

  const statusBadges = {
    draft: { variant: 'gray' as const, label: 'Draft' },
    pending_approval: { variant: 'gold' as const, label: 'Pending Approval' },
    approved: { variant: 'green' as const, label: 'Approved' },
    completed: { variant: 'azure' as const, label: 'Completed' },
    cancelled: { variant: 'red' as const, label: 'Cancelled' },
  };

  const badge = statusBadges[activity.status];
  const isPresident = member?.role === 'president';
  const isTreasurer = member?.role === 'treasurer';
  const canApprove = isPresident && activity.status === 'pending_approval';
  const canDelete = isTreasurer && activity.status === 'draft';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/finance/activities">
              <Button variant="ghost" size="sm">
                ← Back
              </Button>
            </Link>
            <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
              {activity.name}
            </h1>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(activity.date).toLocaleDateString()}</span>
            {activity.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {activity.location}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          {canApprove && (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setApprovalAction('approve');
                  setShowApprovalModal(true);
                }}
              >
                <Check className="w-4 h-4 mr-1" /> Approve Budget
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setApprovalAction('reject');
                  setShowApprovalModal(true);
                }}
              >
                <X className="w-4 h-4 mr-1" /> Reject
              </Button>
            </>
          )}
          {canDelete && (
            <Button variant="secondary" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
          )}
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card padding="md">
          <div className="text-sm text-gray-500 mb-1">Budget</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(activity.budget.totalEstimate)}
          </div>
        </Card>
        <Card padding="md">
          <div className="text-sm text-gray-500 mb-1">Spent</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(activity.actual?.totalSpent || 0)}
          </div>
        </Card>
        <Card padding="md">
          <div className="text-sm text-gray-500 mb-1">Remaining</div>
          <div className={`text-2xl font-bold ${remaining < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {formatCurrency(remaining)}
          </div>
        </Card>
        <Card padding="md">
          <div className="text-sm text-gray-500 mb-1">Budget Used</div>
          <div className={`text-2xl font-bold ${budgetUsed > 100 ? 'text-red-600' : 'text-emerald-600'}`}>
            {budgetUsed}%
          </div>
        </Card>
      </div>

      {/* Budget Line Items */}
      <Card padding="lg">
        <h2 className="font-display font-bold text-xl text-gray-900 dark:text-white mb-4">
          Budget Breakdown
        </h2>
        <div className="space-y-3">
          {activity.budget.lineItems.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-800 last:border-0"
            >
              <div className="flex-1">
                <div className="font-semibold text-gray-900 dark:text-white">{item.name}</div>
                {item.notes && <div className="text-sm text-gray-500 mt-0.5">{item.notes}</div>}
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {formatCurrency(item.amount)}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Expenses */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-xl text-gray-900 dark:text-white">
            Expenses ({expenses.length})
          </h2>
          <Link href={`/finance/expenses?activityId=${activity.id}`}>
            <Button size="sm" variant="secondary">
              + Log Expense
            </Button>
          </Link>
        </div>

        {expenses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Wallet className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p>No expenses logged yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-start justify-between py-3 border-b border-gray-200 dark:border-gray-800 last:border-0"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {expense.category}
                    </span>
                    <Badge
                      variant={
                        expense.status === 'approved'
                          ? 'green'
                          : expense.status === 'pending'
                          ? 'gold'
                          : 'gray'
                      }
                    >
                      {expense.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-500">
                    {expense.description || 'No description'}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Submitted by {expense.submittedByName} on{' '}
                    {new Date(expense.submittedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatCurrency(expense.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Approval Modal */}
      <Modal
        open={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        title={approvalAction === 'approve' ? 'Approve Budget' : 'Reject Budget'}
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            {approvalAction === 'approve'
              ? 'Are you sure you want to approve this budget? The treasurer will be able to log expenses against it.'
              : 'Please provide a reason for rejecting this budget. It will be returned to draft status.'}
          </p>
          <Textarea
            label="Notes (optional)"
            value={approvalNotes}
            onChange={(e) => setApprovalNotes(e.target.value)}
            placeholder="Add any notes or comments..."
            rows={3}
          />
          <div className="flex gap-3">
            <Button onClick={handleApprovalSubmit} loading={processing} className="flex-1">
              {approvalAction === 'approve' ? 'Approve' : 'Reject'}
            </Button>
            <Button variant="ghost" onClick={() => setShowApprovalModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
