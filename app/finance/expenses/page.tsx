'use client';

import { useState, useEffect } from 'react';
import { Receipt, Target, FileText, Store, Paperclip, CheckCircle2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth';
import { apiGet, apiPost } from '@/hooks/useFirestore';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Combobox from '@/components/ui/Combobox';
import FileUpload from '@/components/ui/FileUpload';
import Spinner from '@/components/ui/Spinner';
import { formatCurrency } from '@/lib/utils/format';
import type { Expense, Activity } from '@/types';

const categoryOptions = [
  { value: 'venue', label: 'Venue' },
  { value: 'catering', label: 'Catering' },
  { value: 'decorations', label: 'Decorations' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'permits', label: 'Permits' },
  { value: 'other', label: 'Other' },
];

export default function ExpensesPage() {
  const searchParams = useSearchParams();
  const preselectedActivityId = searchParams?.get('activityId') || '';
  
  const { member } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [form, setForm] = useState({
    activityId: preselectedActivityId,
    category: 'venue',
    customCategory: '',
    amount: '',
    description: '',
    receiptUrl: '',
    receiptName: '',
    paymentMethod: 'credit_card',
    vendor: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [expensesData, activitiesData] = await Promise.all([
        apiGet('/api/finance/expenses'),
        apiGet('/api/finance/activities'),
      ]);
      setExpenses(expensesData.expenses || []);
      setActivities(activitiesData.activities || []);
    } catch (error) {
      toast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/upload/receipt', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) throw new Error('Upload failed');
      
      const { url } = await res.json();
      setForm({ ...form, receiptUrl: url, receiptName: file.name });
      toast('Receipt uploaded successfully');
    } catch (error) {
      toast('Failed to upload receipt', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      await apiPost('/api/finance/expenses', {
        activityId: form.activityId,
        category: form.category,
        customCategory: form.category === 'other' ? form.customCategory : undefined,
        amount: Math.round(parseFloat(form.amount) * 100),
        description: form.description || undefined,
        receiptUrl: form.receiptUrl || undefined,
        paymentMethod: form.paymentMethod,
        vendor: form.vendor || undefined,
      });

      toast('Expense logged successfully!');
      setShowModal(false);
      fetchData();
      
      // Reset form
      setForm({
        activityId: '',
        category: 'venue',
        customCategory: '',
        amount: '',
        description: '',
        receiptUrl: '',
        receiptName: '',
        paymentMethod: 'credit_card',
        vendor: '',
      });
    } catch (error: any) {
      toast(error.message || 'Failed to log expense', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  const approvedActivities = activities.filter((a) => a.status === 'approved' || a.status === 'completed');
  const activityOptions = approvedActivities.map((a) => ({
    value: a.id,
    label: `${a.name} (${formatCurrency(a.budget.totalEstimate - (a.actual?.totalSpent || 0))} remaining)`,
  }));

  const statusBadges = {
    pending: { variant: 'gold' as const, label: 'Pending' },
    approved: { variant: 'green' as const, label: 'Approved' },
    rejected: { variant: 'red' as const, label: 'Rejected' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Expenses</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Track and manage activity expenses with receipts
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Log Expense
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card padding="md">
          <div className="text-sm text-gray-500 mb-1">Total Expenses</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(expenses.reduce((sum, e) => sum + (e.status === 'approved' ? e.amount : 0), 0))}
          </div>
        </Card>
        <Card padding="md">
          <div className="text-sm text-gray-500 mb-1">Pending Approval</div>
          <div className="text-2xl font-bold text-gold-600">
            {expenses.filter((e) => e.status === 'pending').length}
          </div>
        </Card>
        <Card padding="md">
          <div className="text-sm text-gray-500 mb-1">This Month</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(
              expenses
                .filter((e) => {
                  const expenseMonth = new Date(e.submittedAt).getMonth();
                  const currentMonth = new Date().getMonth();
                  return expenseMonth === currentMonth && e.status === 'approved';
                })
                .reduce((sum, e) => sum + e.amount, 0)
            )}
          </div>
        </Card>
      </div>

      {/* Expenses List */}
      {expenses.length === 0 ? (
        <Card padding="lg">
          <div className="text-center py-12">
            <Receipt className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="font-display font-bold text-gray-900 dark:text-white mb-2">No expenses yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Log your first expense to start tracking spending.
            </p>
            <Button onClick={() => setShowModal(true)}>Log Expense</Button>
          </div>
        </Card>
      ) : (
        <Card padding="lg">
          <div className="space-y-4">
            {expenses.map((expense) => {
              const badge = statusBadges[expense.status];
              const activity = activities.find((a) => a.id === expense.activityId);

              return (
                <div
                  key={expense.id}
                  className="flex items-start justify-between py-4 border-b border-gray-200 dark:border-gray-800 last:border-0"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-display font-bold text-gray-900 dark:text-white">
                        {expense.category}
                      </h3>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <div className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> {expense.activityName || activity?.name || 'Unknown Activity'}</div>
                      {expense.description && <div className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> {expense.description}</div>}
                      {expense.vendor && <div className="flex items-center gap-1.5"><Store className="w-3.5 h-3.5" /> {expense.vendor}</div>}
                      <div className="text-xs text-gray-400">
                        Submitted by {expense.submittedByName} on{' '}
                        {new Date(expense.submittedAt).toLocaleDateString()}
                      </div>
                    </div>
                    {expense.receiptUrl && (
                      <a
                        href={expense.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-azure-600 hover:underline mt-2 inline-flex items-center gap-1"
                      >
                        <Paperclip className="w-3.5 h-3.5" /> View Receipt
                      </a>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(expense.amount)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{expense.paymentMethod}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Log Expense Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Log New Expense">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Activity *
            </label>
            <select
              required
              value={form.activityId}
              onChange={(e) => setForm({ ...form, activityId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              <option value="">Select activity...</option>
              {activityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <Combobox
            label="Category"
            required
            value={form.category}
            onChange={(v) => setForm({ ...form, category: v })}
            options={categoryOptions}
            allowCustom
          />

          {form.category === 'other' && (
            <Input
              label="Custom Category"
              required
              value={form.customCategory}
              onChange={(e) => setForm({ ...form, customCategory: e.target.value })}
              placeholder="Specify category"
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount"
              type="number"
              step="0.01"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0.00"
            />
            <Input
              label="Vendor"
              value={form.vendor}
              onChange={(e) => setForm({ ...form, vendor: e.target.value })}
              placeholder="Vendor name"
            />
          </div>

          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What was this expense for?"
            rows={2}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Payment Method
            </label>
            <select
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              <option value="credit_card">Credit Card</option>
              <option value="debit_card">Debit Card</option>
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="zelle">Zelle</option>
              <option value="venmo">Venmo</option>
            </select>
          </div>

          <FileUpload
            label="Receipt (optional)"
            accept="image/*,.pdf"
            onChange={handleFileUpload}
            disabled={uploading}
          />

          {form.receiptName && (
            <div className="text-sm text-gray-600 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {form.receiptName}
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <Button type="submit" loading={saving} className="flex-1">
              Log Expense
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
