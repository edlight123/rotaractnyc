'use client';

import { useState, useEffect } from 'react';
import { BarChart2 } from 'lucide-react';
import { apiGet } from '@/hooks/useFirestore';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { formatCurrency } from '@/lib/utils/format';
import type { Activity, Expense } from '@/types';

export default function ReportsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [activitiesData, expensesData] = await Promise.all([
        apiGet('/api/finance/activities'),
        apiGet('/api/finance/expenses'),
      ]);
      setActivities(activitiesData.activities || []);
      setExpenses(expensesData.expenses || []);
    } catch (error) {
      toast('Failed to load reports data', 'error');
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

  // Calculate Rotary Year (July 1 - June 30)
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const rotaryYearStart = currentMonth >= 6 ? new Date(currentYear, 6, 1) : new Date(currentYear - 1, 6, 1);
  const rotaryYearEnd = currentMonth >= 6 ? new Date(currentYear + 1, 5, 30) : new Date(currentYear, 5, 30);

  const ytdActivities = activities.filter((a) => {
    const activityDate = new Date(a.date);
    return activityDate >= rotaryYearStart && activityDate <= rotaryYearEnd;
  });

  const ytdExpenses = expenses.filter((e) => {
    const expenseDate = new Date(e.submittedAt);
    return expenseDate >= rotaryYearStart && expenseDate <= rotaryYearEnd && e.status === 'approved';
  });

  const totalBudgeted = ytdActivities.reduce((sum, a) => sum + a.budget.totalEstimate, 0);
  const totalSpent = ytdExpenses.reduce((sum, e) => sum + e.amount, 0);
  const variance = totalBudgeted - totalSpent;
  const utilizationRate = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;

  // Category breakdown
  const categoryBreakdown: Record<string, number> = {};
  ytdExpenses.forEach((e) => {
    const cat = e.category;
    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + e.amount;
  });

  const sortedCategories = Object.entries(categoryBreakdown).sort(([, a], [, b]) => b - a);

  // Monthly trend
  const monthlyData: Record<string, { budgeted: number; spent: number }> = {};
  ytdActivities.forEach((a) => {
    const month = new Date(a.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    if (!monthlyData[month]) monthlyData[month] = { budgeted: 0, spent: 0 };
    monthlyData[month].budgeted += a.budget.totalEstimate;
  });
  ytdExpenses.forEach((e) => {
    const month = new Date(e.submittedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    if (!monthlyData[month]) monthlyData[month] = { budgeted: 0, spent: 0 };
    monthlyData[month].spent += e.amount;
  });

  const monthlyEntries = Object.entries(monthlyData).slice(-6); // Last 6 months

  const exportToCSV = () => {
    const headers = ['Activity', 'Date', 'Budget', 'Spent', 'Remaining', 'Status'];
    const rows = ytdActivities.map((a) => [
      a.name,
      new Date(a.date).toLocaleDateString(),
      (a.budget.totalEstimate / 100).toFixed(2),
      ((a.actual?.totalSpent || 0) / 100).toFixed(2),
      ((a.budget.totalEstimate - (a.actual?.totalSpent || 0)) / 100).toFixed(2),
      a.status,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rotaract-finance-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Financial Reports</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Rotary Year {rotaryYearStart.getFullYear()}-{rotaryYearEnd.getFullYear()} (July 1 - June 30)
          </p>
        </div>
        <Button onClick={exportToCSV}>
          <BarChart2 className="w-4 h-4 mr-1" /> Export CSV
        </Button>
      </div>

      {/* YTD Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card padding="md">
          <div className="text-sm text-gray-500 mb-1">Total Budgeted (YTD)</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(totalBudgeted)}
          </div>
        </Card>
        <Card padding="md">
          <div className="text-sm text-gray-500 mb-1">Total Spent (YTD)</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(totalSpent)}
          </div>
        </Card>
        <Card padding="md">
          <div className="text-sm text-gray-500 mb-1">Variance</div>
          <div className={`text-2xl font-bold ${variance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {formatCurrency(variance)}
          </div>
        </Card>
        <Card padding="md">
          <div className="text-sm text-gray-500 mb-1">Budget Utilization</div>
          <div className={`text-2xl font-bold ${utilizationRate > 100 ? 'text-red-600' : 'text-emerald-600'}`}>
            {utilizationRate}%
          </div>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card padding="lg">
        <h2 className="font-display font-bold text-xl text-gray-900 dark:text-white mb-4">
          Spending by Category
        </h2>
        {sortedCategories.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No expenses recorded yet</div>
        ) : (
          <div className="space-y-4">
            {sortedCategories.map(([category, amount]) => {
              const percentage = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;
              return (
                <div key={category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">{category}</span>
                    <span className="text-gray-900 dark:text-white font-semibold">
                      {formatCurrency(amount)} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                    <div
                      className="bg-azure-600 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Monthly Trend */}
      <Card padding="lg">
        <h2 className="font-display font-bold text-xl text-gray-900 dark:text-white mb-4">
          Monthly Budget vs Actual
        </h2>
        {monthlyEntries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No data available</div>
        ) : (
          <div className="space-y-4">
            {monthlyEntries.map(([month, data]) => (
              <div key={month}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{month}</span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {formatCurrency(data.spent)} / {formatCurrency(data.budgeted)}
                  </span>
                </div>
                <div className="relative w-full bg-gray-200 dark:bg-gray-800 rounded-full h-3">
                  <div
                    className="absolute bg-azure-600 h-3 rounded-full"
                    style={{ width: `${data.budgeted > 0 ? Math.min((data.spent / data.budgeted) * 100, 100) : 0}%` }}
                  />
                  {data.spent > data.budgeted && (
                    <div className="absolute bg-red-600 h-3 rounded-r-full left-full" style={{ width: '4px' }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Activity Performance */}
      <Card padding="lg">
        <h2 className="font-display font-bold text-xl text-gray-900 dark:text-white mb-4">
          Activity Performance
        </h2>
        {ytdActivities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No activities in this Rotary year</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 dark:border-gray-800">
                <tr className="text-left text-sm text-gray-500">
                  <th className="pb-3 font-medium">Activity</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium text-right">Budget</th>
                  <th className="pb-3 font-medium text-right">Spent</th>
                  <th className="pb-3 font-medium text-right">Remaining</th>
                  <th className="pb-3 font-medium text-right">Used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {ytdActivities.map((activity) => {
                  const spent = activity.actual?.totalSpent || 0;
                  const remaining = activity.budget.totalEstimate - spent;
                  const usedPercent = activity.budget.totalEstimate > 0
                    ? Math.round((spent / activity.budget.totalEstimate) * 100)
                    : 0;

                  return (
                    <tr key={activity.id} className="text-sm">
                      <td className="py-3 font-medium text-gray-900 dark:text-white">{activity.name}</td>
                      <td className="py-3 text-gray-600 dark:text-gray-400">
                        {new Date(activity.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right text-gray-900 dark:text-white">
                        {formatCurrency(activity.budget.totalEstimate)}
                      </td>
                      <td className="py-3 text-right text-gray-900 dark:text-white">
                        {formatCurrency(spent)}
                      </td>
                      <td className={`py-3 text-right font-semibold ${remaining < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {formatCurrency(remaining)}
                      </td>
                      <td className={`py-3 text-right font-semibold ${usedPercent > 100 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                        {usedPercent}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
