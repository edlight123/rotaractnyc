'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { apiGet, apiPost, apiDelete } from '@/hooks/useFirestore';
import { useToast } from '@/components/ui/Toast';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import Tabs from '@/components/ui/Tabs';
import EmptyState from '@/components/ui/EmptyState';
import FileUpload from '@/components/ui/FileUpload';
import FinanceCharts from '@/components/portal/FinanceCharts';
import { formatCurrency } from '@/lib/utils/format';
import type { FinanceSummary, Transaction, PaymentMethod } from '@/types';

const CATEGORIES = {
  income: ['dues', 'events', 'donations', 'sponsorship', 'fundraising', 'other'],
  expense: ['venue', 'food', 'supplies', 'marketing', 'admin', 'charity', 'district', 'other'],
};

export default function FinancePage() {
  const { member } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [summary, setSummary] = useState<FinanceSummary>({ totalIncome: 0, totalExpenses: 0, balance: 0, monthlyBreakdown: [] });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  // Transaction filters
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Record modal state
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recordType, setRecordType] = useState<'income' | 'expense'>('expense');
  const [recordForm, setRecordForm] = useState({
    description: '',
    amount: '',
    category: 'other',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'zelle' as PaymentMethod,
    notes: '',
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const hasAccess = member?.role === 'treasurer' || member?.role === 'president';

  const fetchData = useCallback(async () => {
    if (!hasAccess) { setForbidden(true); setLoading(false); return; }
    try {
      const data = await apiGet('/api/portal/finance');
      if (data.summary) setSummary({ totalIncome: 0, totalExpenses: 0, balance: 0, monthlyBreakdown: [], ...data.summary });
      if (data.transactions) setTransactions(data.transactions);
    } catch {
      setForbidden(true);
    } finally { setLoading(false); }
  }, [hasAccess]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Upload receipt file, returns URL
  const uploadReceipt = async (file: File): Promise<string> => {
    // Get upload authorization
    const meta = await apiPost('/api/portal/upload', {
      fileName: file.name,
      fileType: file.type,
      folder: 'receipts',
    });
    // Upload to the signed URL or Firebase Storage path
    if (meta.uploadUrl) {
      await fetch(meta.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      return meta.downloadUrl || meta.uploadUrl;
    }
    return meta.downloadUrl || '';
  };

  const handleRecord = async () => {
    const amountCents = Math.round(parseFloat(recordForm.amount) * 100);
    if (!recordForm.description.trim() || isNaN(amountCents) || amountCents <= 0) {
      toast('Description and a positive amount are required', 'error');
      return;
    }
    setRecording(true);
    try {
      let receiptUrl = '';
      if (receiptFile) {
        receiptUrl = await uploadReceipt(receiptFile);
      }

      await apiPost('/api/portal/finance', {
        type: recordType,
        description: recordForm.description.trim(),
        amount: amountCents,
        category: recordForm.category,
        date: recordForm.date,
        paymentMethod: recordForm.paymentMethod,
        receiptUrl: receiptUrl || undefined,
      });

      toast(`${recordType === 'income' ? 'Income' : 'Expense'} recorded`);
      setShowRecordModal(false);
      resetRecordForm();
      fetchData();
    } catch (err: any) {
      toast(err.message || 'Failed to record', 'error');
    } finally { setRecording(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/portal/finance?id=${deleteId}`);
      toast('Transaction deleted');
      setDeleteId(null);
      fetchData();
    } catch (err: any) {
      toast(err.message || 'Failed to delete', 'error');
    } finally { setDeleting(false); }
  };

  const resetRecordForm = () => {
    setRecordForm({ description: '', amount: '', category: 'other', date: new Date().toISOString().split('T')[0], paymentMethod: 'zelle', notes: '' });
    setReceiptFile(null);
  };

  // CSV Export
  const exportCSV = () => {
    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Payment Method'];
    const rows = transactions.map((tx) => [
      tx.date,
      tx.type,
      tx.category,
      `"${tx.description.replace(/"/g, '""')}"`,
      (tx.amount / 100).toFixed(2),
      (tx as any).paymentMethod || '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;

  if (forbidden) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2">Access Restricted</h2>
        <p className="text-gray-500 dark:text-gray-400">The finance dashboard is only available to the Treasurer and President.</p>
      </div>
    );
  }

  // Filtered transactions
  const filtered = transactions.filter((tx) => {
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
    if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;
    return true;
  });

  const uniqueCategories = Array.from(new Set(transactions.map((tx) => tx.category)));

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'transactions', label: 'Transactions', count: transactions.length || undefined },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Finance Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Club financial overview, income, expenses, and transaction history.</p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* ───── OVERVIEW TAB ───── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                  <svg className="w-4.5 h-4.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
              </div>
              <p className="text-2xl font-display font-bold text-gray-900 dark:text-white">{formatCurrency(summary.totalIncome)}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total Income</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                  <svg className="w-4.5 h-4.5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                </div>
              </div>
              <p className="text-2xl font-display font-bold text-gray-900 dark:text-white">{formatCurrency(summary.totalExpenses)}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total Expenses</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-azure-50 dark:bg-azure-900/20 flex items-center justify-center">
                  <svg className="w-4.5 h-4.5 text-azure" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
              </div>
              <p className={`text-2xl font-display font-bold ${summary.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(summary.balance)}</p>
              <p className="text-xs text-gray-500 mt-0.5">Balance</p>
            </div>
          </div>

          {/* Monthly Overview Chart */}
          <FinanceCharts summary={summary} />

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:flex sm:gap-3 gap-2">
            <Button
              variant="primary"
              onClick={() => { setRecordType('expense'); resetRecordForm(); setRecordForm((f) => ({ ...f, category: 'venue' })); setShowRecordModal(true); }}
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
              Record Expense
            </Button>
            <Button
              variant="outline"
              onClick={() => { setRecordType('income'); resetRecordForm(); setRecordForm((f) => ({ ...f, category: 'donations' })); setShowRecordModal(true); }}
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
              Record Income
            </Button>
          </div>
        </div>
      )}

      {/* ───── TRANSACTIONS TAB ───── */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Type filter */}
              {['all', 'income', 'expense'].map((f) => (
                <button
                  key={f}
                  onClick={() => setTypeFilter(f)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                    typeFilter === f
                      ? 'bg-cranberry text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
              {/* Category filter */}
              {uniqueCategories.length > 1 && (
                <select
                  className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {uniqueCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={exportCSV}>
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Export CSV
              </Button>
              <Button
                size="sm"
                onClick={() => { setRecordType('expense'); resetRecordForm(); setRecordForm((f) => ({ ...f, category: 'venue' })); setShowRecordModal(true); }}
              >
                + Record
              </Button>
            </div>
          </div>

          {/* Transaction List */}
          {filtered.length === 0 ? (
            <EmptyState
              icon={<svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              title="No transactions"
              description={typeFilter !== 'all' ? 'No matching transactions found.' : 'Transactions will appear here as dues are paid and expenses are recorded.'}
            />
          ) : (
            <>
            <div className="hidden sm:block bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800 text-left">
                      <th className="px-5 py-3 font-semibold text-gray-500 dark:text-gray-400">Date</th>
                      <th className="px-5 py-3 font-semibold text-gray-500 dark:text-gray-400">Description</th>
                      <th className="px-5 py-3 font-semibold text-gray-500 dark:text-gray-400">Category</th>
                      <th className="px-5 py-3 font-semibold text-gray-500 dark:text-gray-400">Method</th>
                      <th className="px-5 py-3 font-semibold text-gray-500 dark:text-gray-400 text-right">Amount</th>
                      <th className="px-5 py-3 font-semibold text-gray-500 dark:text-gray-400 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filtered.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{tx.date}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${tx.type === 'income' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}>
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                {tx.type === 'income'
                                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                  : <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />}
                              </svg>
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">{tx.description}</span>
                            {(tx as any).receiptUrl && (
                              <a href={(tx as any).receiptUrl} target="_blank" rel="noopener noreferrer" className="text-azure hover:underline text-xs flex-shrink-0">📎</a>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3"><Badge variant="gray">{tx.category}</Badge></td>
                        <td className="px-5 py-3 text-gray-500 text-xs capitalize">{(tx as any).paymentMethod || '—'}</td>
                        <td className={`px-5 py-3 text-right font-semibold whitespace-nowrap ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {tx.type === 'income' ? '+' : '-'}${(tx.amount / 100).toFixed(2)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => setDeleteId(tx.id)}
                            className="text-xs text-gray-400 hover:text-red-500 transition-colors p-1"
                            title="Delete transaction"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Summary row */}
              <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-800 flex justify-between text-sm">
                <span className="text-gray-500">{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</span>
                <div className="flex gap-4">
                  <span className="text-emerald-600 font-medium">
                    +${(filtered.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) / 100).toFixed(2)}
                  </span>
                  <span className="text-red-600 font-medium">
                    -${(filtered.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Transaction Cards — Mobile */}
            <div className="sm:hidden space-y-3">
              {filtered.map((tx) => (
                <div key={tx.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/60 dark:border-gray-800 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${tx.type === 'income' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          {tx.type === 'income'
                            ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            : <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />}
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{tx.description}</p>
                        <p className="text-xs text-gray-400">{tx.date} · <span className="capitalize">{tx.category}</span></p>
                      </div>
                    </div>
                    <p className={`text-sm font-bold whitespace-nowrap ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {tx.type === 'income' ? '+' : '-'}${(tx.amount / 100).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 capitalize">{(tx as any).paymentMethod || ''}</span>
                    <button
                      onClick={() => setDeleteId(tx.id)}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors p-1"
                      title="Delete transaction"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
              {/* Mobile summary */}
              <div className="flex justify-between text-sm px-1 pt-2">
                <span className="text-gray-500">{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</span>
                <div className="flex gap-3">
                  <span className="text-emerald-600 font-medium">
                    +${(filtered.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) / 100).toFixed(2)}
                  </span>
                  <span className="text-red-600 font-medium">
                    -${(filtered.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            </>
          )}
        </div>
      )}

      {/* ───── Record Transaction Modal ───── */}
      <Modal open={showRecordModal} onClose={() => setShowRecordModal(false)} title={`Record ${recordType === 'income' ? 'Income' : 'Expense'}`} size="sm">
        <div className="space-y-4">
          {/* Type Toggle */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            {(['expense', 'income'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setRecordType(t); setRecordForm((f) => ({ ...f, category: CATEGORIES[t][0] })); }}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  recordType === t
                    ? t === 'expense' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                    : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400'
                }`}
              >
                {t === 'expense' ? 'Expense' : 'Income'}
              </button>
            ))}
          </div>

          <Input
            label="Description"
            value={recordForm.description}
            onChange={(e) => setRecordForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="e.g., Venue rental for February meeting"
          />
          <Input
            label="Amount ($)"
            type="number"
            value={recordForm.amount}
            onChange={(e) => setRecordForm((f) => ({ ...f, amount: e.target.value }))}
            placeholder="0.00"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
              <select
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cranberry-500/20 focus:border-cranberry-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                value={recordForm.category}
                onChange={(e) => setRecordForm((f) => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES[recordType].map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Payment Method</label>
              <select
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cranberry-500/20 focus:border-cranberry-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                value={recordForm.paymentMethod}
                onChange={(e) => setRecordForm((f) => ({ ...f, paymentMethod: e.target.value as PaymentMethod }))}
              >
                <option value="zelle">Zelle</option>
                <option value="venmo">Venmo</option>
                <option value="stripe">Stripe</option>
                <option value="cash">Cash</option>
                <option value="check">Check</option>
              </select>
            </div>
          </div>

          <Input
            label="Date"
            type="date"
            value={recordForm.date}
            onChange={(e) => setRecordForm((f) => ({ ...f, date: e.target.value }))}
          />

          <FileUpload
            label="Receipt (optional)"
            accept="image/*,.pdf"
            onChange={(files) => setReceiptFile(files[0] || null)}
          />

          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleRecord} loading={recording}>
              {recordType === 'expense' ? 'Record Expense' : 'Record Income'}
            </Button>
            <Button variant="ghost" onClick={() => setShowRecordModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* ───── Delete Confirmation Modal ───── */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Transaction" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Are you sure you want to delete this transaction? This action cannot be undone.</p>
          <div className="flex gap-2">
            <Button variant="danger" className="flex-1" onClick={handleDelete} loading={deleting}>Delete</Button>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
