'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { apiGet } from '@/hooks/useFirestore';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { formatCurrency } from '@/lib/utils/format';
import Link from 'next/link';
import { Target, Wallet, TrendingUp, CreditCard } from 'lucide-react';

export default function FinanceDashboard() {
  const { member } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingBudgets: 0,
    pendingPayments: 0,
    pendingExpenses: 0,
    ytdCollected: 0,
    ytdSpent: 0,
    ytdBalance: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch pending approvals
      const approvals = await apiGet('/api/finance/approvals');
      
      // Calculate YTD stats (simplified - would need proper Rotary year calculation)
      // For now, just show placeholder values
      setStats({
        pendingBudgets: approvals.pendingBudgets?.length || 0,
        pendingPayments: approvals.pendingPayments?.length || 0,
        pendingExpenses: approvals.pendingExpenses?.length || 0,
        ytdCollected: 0, // TODO: Calculate from dues + event revenue
        ytdSpent: 0, // TODO: Calculate from expenses
        ytdBalance: 0,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
          Welcome back, {member?.firstName}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {isPresident
            ? 'Review and approve budgets and financial activities.'
            : 'Manage finances, track expenses, and approve payments.'}
        </p>
      </div>

      {/* Pending Actions */}
      {(stats.pendingBudgets > 0 || stats.pendingPayments > 0 || stats.pendingExpenses > 0) && (
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-gray-900 dark:text-white">Pending Actions</h2>
            <Link href="/finance/approvals" className="text-sm text-cranberry hover:underline">
              View all →
            </Link>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {isPresident && stats.pendingBudgets > 0 && (
              <Link href="/finance/approvals?tab=budgets" className="block">
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800 hover:shadow-md transition-shadow">
                  <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">Budget Approvals</p>
                  <p className="text-3xl font-display font-bold text-amber-900 dark:text-amber-100 mt-1">
                    {stats.pendingBudgets}
                  </p>
                </div>
              </Link>
            )}
            {isTreasurer && stats.pendingPayments > 0 && (
              <Link href="/finance/approvals?tab=payments" className="block">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800 hover:shadow-md transition-shadow">
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">Payment Approvals</p>
                  <p className="text-3xl font-display font-bold text-emerald-900 dark:text-emerald-100 mt-1">
                    {stats.pendingPayments}
                  </p>
                </div>
              </Link>
            )}
            {isTreasurer && stats.pendingExpenses > 0 && (
              <Link href="/finance/approvals?tab=expenses" className="block">
                <div className="bg-azure-50 dark:bg-azure-900/20 rounded-xl p-4 border border-azure-200 dark:border-azure-800 hover:shadow-md transition-shadow">
                  <p className="text-sm text-azure-700 dark:text-azure-300 font-medium">Expense Approvals</p>
                  <p className="text-3xl font-display font-bold text-azure-900 dark:text-azure-100 mt-1">
                    {stats.pendingExpenses}
                  </p>
                </div>
              </Link>
            )}
          </div>
        </Card>
      )}

      {/* YTD Summary */}
      <Card padding="md">
        <h2 className="font-display font-bold text-gray-900 dark:text-white mb-4">
          Rotary Year 2025-2026 Summary
        </h2>
        <div className="grid sm:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Collected</p>
            <p className="text-2xl font-display font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {formatCurrency(stats.ytdCollected)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Dues + Events</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Spent</p>
            <p className="text-2xl font-display font-bold text-gray-900 dark:text-white mt-1">
              {formatCurrency(stats.ytdSpent)}
            </p>
            <p className="text-xs text-gray-400 mt-1">All expenses</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Net Balance</p>
            <p
              className={`text-2xl font-display font-bold mt-1 ${
                stats.ytdBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {formatCurrency(stats.ytdBalance)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {stats.ytdBalance >= 0 ? 'Surplus' : 'Deficit'}
            </p>
          </div>
        </div>
      </Card>

      {/* Quick Links */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/finance/activities" className="block">
          <Card padding="md" className="hover:shadow-lg transition-shadow">
            <Target className="w-7 h-7 text-cranberry mb-2" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Activities</h3>
            <p className="text-xs text-gray-500 mt-1">Manage budgets & events</p>
          </Card>
        </Link>
        <Link href="/finance/expenses" className="block">
          <Card padding="md" className="hover:shadow-lg transition-shadow">
            <Wallet className="w-7 h-7 text-cranberry mb-2" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Expenses</h3>
            <p className="text-xs text-gray-500 mt-1">Log receipts & costs</p>
          </Card>
        </Link>
        <Link href="/finance/reports" className="block">
          <Card padding="md" className="hover:shadow-lg transition-shadow">
            <TrendingUp className="w-7 h-7 text-cranberry mb-2" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Reports</h3>
            <p className="text-xs text-gray-500 mt-1">Budget vs actual</p>
          </Card>
        </Link>
        <Link href="/portal/dues" className="block">
          <Card padding="md" className="hover:shadow-lg transition-shadow">
            <CreditCard className="w-7 h-7 text-cranberry mb-2" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Dues</h3>
            <p className="text-xs text-gray-500 mt-1">Manage membership dues</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
