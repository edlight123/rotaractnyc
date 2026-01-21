'use client';

import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MonthlySummary, Transaction } from '@/types/portal';

interface FinanceChartsProps {
  monthlySummaries: MonthlySummary[];
  transactions: Transaction[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export function IncomeExpenseChart({ monthlySummaries }: { monthlySummaries: MonthlySummary[] }) {
  const data = [...monthlySummaries]
    .reverse()
    .slice(-6) // Last 6 months
    .map(summary => ({
      month: new Date(summary.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      income: summary.incomeTotal,
      expenses: Math.abs(summary.expenseTotal),
      net: summary.incomeTotal + summary.expenseTotal
    }));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Income vs Expenses (Last 6 Months)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
          <Legend />
          <Bar dataKey="income" fill="#10b981" name="Income" />
          <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
          <Bar dataKey="net" fill="#3b82f6" name="Net" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BalanceTrendChart({ monthlySummaries }: { monthlySummaries: MonthlySummary[] }) {
  const data = [...monthlySummaries]
    .reverse()
    .slice(-12) // Last 12 months
    .map(summary => ({
      month: new Date(summary.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      balance: summary.endingBalance
    }));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Balance Trend (Last 12 Months)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
          <Legend />
          <Line type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={2} name="Balance" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryBreakdownChart({ monthlySummaries }: { monthlySummaries: MonthlySummary[] }) {
  // Aggregate category totals from recent summaries
  const categoryTotals: { [key: string]: number } = {};
  
  monthlySummaries.slice(0, 3).forEach(summary => {
    if (summary.categoryTotals) {
      Object.entries(summary.categoryTotals).forEach(([category, total]) => {
        categoryTotals[category] = (categoryTotals[category] || 0) + Math.abs(total);
      });
    }
  });

  const data = Object.entries(categoryTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8); // Top 8 categories

  if (data.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Expense by Category (Last 3 Months)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function FinanceCharts({ monthlySummaries, transactions }: FinanceChartsProps) {
  if (monthlySummaries.length === 0) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Financial Analytics</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IncomeExpenseChart monthlySummaries={monthlySummaries} />
        <BalanceTrendChart monthlySummaries={monthlySummaries} />
      </div>

      <CategoryBreakdownChart monthlySummaries={monthlySummaries} />
    </div>
  );
}
