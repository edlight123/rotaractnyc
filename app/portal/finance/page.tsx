'use client';

import { useState, useEffect } from 'react';
import { apiGet } from '@/hooks/useFirestore';
import Card from '@/components/ui/Card';
import StatCard from '@/components/ui/StatCard';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import type { FinanceSummary, Transaction } from '@/types';

export default function FinancePage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FinanceSummary>({ totalIncome: 0, totalExpenses: 0, balance: 0, monthlyBreakdown: [] });
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet('/api/portal/finance');
        if (data.summary) setSummary(data.summary);
        if (data.transactions) setTransactions(data.transactions);
      } catch {
        // Silently fail — show empty state
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Finance Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Club financial overview and transaction history.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Income" value={`$${summary.totalIncome.toLocaleString()}`} />
        <StatCard label="Total Expenses" value={`$${summary.totalExpenses.toLocaleString()}`} />
        <StatCard label="Balance" value={`$${summary.balance.toLocaleString()}`} />
      </div>

      {/* Chart placeholder */}
      <Card padding="md">
        <h3 className="font-display font-bold text-gray-900 dark:text-white mb-4">Monthly Overview</h3>
        {summary.monthlyBreakdown.length > 0 ? (
          <div className="space-y-2">
            {summary.monthlyBreakdown.map((m) => (
              <div key={m.month} className="flex items-center gap-4 text-sm">
                <span className="w-16 text-gray-500">{m.month}</span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="h-3 bg-emerald-500 rounded" style={{ width: `${Math.max(2, (m.income / Math.max(summary.totalIncome, 1)) * 100)}%` }} />
                  <span className="text-emerald-600 text-xs">${m.income}</span>
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <div className="h-3 bg-red-400 rounded" style={{ width: `${Math.max(2, (m.expenses / Math.max(summary.totalExpenses, 1)) * 100)}%` }} />
                  <span className="text-red-500 text-xs">${m.expenses}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-48 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center">
            <p className="text-sm text-gray-400">📊 Financial data will appear here as transactions are recorded</p>
          </div>
        )}
      </Card>

      {/* Transactions */}
      {transactions.length === 0 ? (
        <EmptyState icon="💰" title="No transactions yet" description="Transactions will appear here as dues are paid and expenses are recorded." />
      ) : (
        <Card padding="none">
          <div className="p-5 border-b border-gray-200 dark:border-gray-800">
            <h3 className="font-display font-bold text-gray-900 dark:text-white">Recent Transactions</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-5">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === 'income' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}>
                    {tx.type === 'income' ? '↑' : '↓'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{tx.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="gray">{tx.category}</Badge>
                      <span className="text-xs text-gray-400">{tx.date}</span>
                    </div>
                  </div>
                </div>
                <p className={`font-semibold ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {tx.type === 'income' ? '+' : '-'}${tx.amount}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
