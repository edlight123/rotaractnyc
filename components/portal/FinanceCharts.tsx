'use client';

import Card from '@/components/ui/Card';
import type { FinanceSummary } from '@/types';

interface FinanceChartsProps {
  summary: FinanceSummary;
}

export default function FinanceCharts({ summary }: FinanceChartsProps) {
  const maxVal = Math.max(
    ...summary.monthlyBreakdown.map((m) => Math.max(m.income, m.expenses)),
    1,
  );

  return (
    <Card padding="md">
      <h3 className="font-display font-bold text-gray-900 dark:text-white mb-4">Monthly Overview</h3>
      {summary.monthlyBreakdown.length > 0 ? (
        <div className="space-y-3">
          {summary.monthlyBreakdown.map((m) => (
            <div key={m.month} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium w-20">{m.month}</span>
                <div className="flex gap-4">
                  <span className="text-emerald-600">+${m.income.toLocaleString()}</span>
                  <span className="text-red-500">-${m.expenses.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex gap-1 h-3">
                <div
                  className="bg-emerald-500 rounded-l"
                  style={{ width: `${(m.income / maxVal) * 50}%` }}
                />
                <div
                  className="bg-red-400 rounded-r"
                  style={{ width: `${(m.expenses / maxVal) * 50}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-48 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center">
          <p className="text-sm text-gray-400">Financial data will appear here as transactions are recorded</p>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-emerald-500 rounded" />
          <span className="text-xs text-gray-500">Income</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-400 rounded" />
          <span className="text-xs text-gray-500">Expenses</span>
        </div>
      </div>
    </Card>
  );
}
