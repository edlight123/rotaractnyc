'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { apiGet } from '@/hooks/useFirestore';
import Card from '@/components/ui/Card';
import StatCard from '@/components/ui/StatCard';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import FinanceCharts from '@/components/portal/FinanceCharts';
import type { FinanceSummary, Transaction } from '@/types';

export default function FinancePage() {
  const { member } = useAuth();
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [summary, setSummary] = useState<FinanceSummary>({ totalIncome: 0, totalExpenses: 0, balance: 0, monthlyBreakdown: [] });
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const hasAccess = member?.role === 'treasurer' || member?.role === 'president';

  useEffect(() => {
    if (!hasAccess) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const data = await apiGet('/api/portal/finance');
        if (data.summary) setSummary({ totalIncome: 0, totalExpenses: 0, balance: 0, monthlyBreakdown: [], ...data.summary });
        if (data.transactions) setTransactions(data.transactions);
      } catch {
        // API returns 403 if not treasurer/president
        setForbidden(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [hasAccess]);

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

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Finance Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Club financial overview and transaction history.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Total Income"
          value={`$${summary.totalIncome.toLocaleString()}`}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label="Total Expenses"
          value={`$${summary.totalExpenses.toLocaleString()}`}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>}
        />
        <StatCard
          label="Balance"
          value={`$${summary.balance.toLocaleString()}`}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
        />
      </div>

      {/* Monthly Overview Chart */}
      <FinanceCharts summary={summary} />

      {/* Transactions */}
      {transactions.length === 0 ? (
        <EmptyState icon={<svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} title="No transactions yet" description="Transactions will appear here as dues are paid and expenses are recorded." />
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
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      {tx.type === 'income'
                        ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        : <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />}
                    </svg>
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
