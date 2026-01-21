'use client';

import { MonthlySummary } from '@/types/portal';
import { FiTrendingUp, FiTrendingDown, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

interface FinanceInsightsProps {
  monthlySummaries: MonthlySummary[];
}

export default function FinanceInsights({ monthlySummaries }: FinanceInsightsProps) {
  if (monthlySummaries.length === 0) return null;

  const currentMonth = monthlySummaries[0];
  const previousMonth = monthlySummaries[1];
  
  // Calculate trends
  const calculateTrend = (current: number, previous: number) => {
    if (!previous) return { percent: 0, isPositive: true };
    const change = ((current - previous) / Math.abs(previous)) * 100;
    return {
      percent: Math.abs(change),
      isPositive: change > 0,
    };
  };

  const incomeTrend = previousMonth 
    ? calculateTrend(currentMonth.incomeTotal, previousMonth.incomeTotal)
    : { percent: 0, isPositive: true };
    
  const expenseTrend = previousMonth
    ? calculateTrend(currentMonth.expenseTotal, previousMonth.expenseTotal)
    : { percent: 0, isPositive: true };

  const balanceTrend = previousMonth
    ? calculateTrend(currentMonth.endingBalance, previousMonth.endingBalance)
    : { percent: 0, isPositive: true };

  // Calculate financial health score (0-100)
  const calculateHealthScore = () => {
    let score = 50; // Base score
    
    // Positive balance adds points
    if (currentMonth.endingBalance > 0) {
      score += 20;
    }
    
    // Income > Expenses adds points
    const netIncome = currentMonth.incomeTotal + currentMonth.expenseTotal;
    if (netIncome > 0) {
      score += 15;
    }
    
    // Consistent positive trend adds points
    if (balanceTrend.isPositive && balanceTrend.percent > 0) {
      score += 10;
    }
    
    // Low expense ratio adds points
    const expenseRatio = Math.abs(currentMonth.expenseTotal) / (currentMonth.incomeTotal || 1);
    if (expenseRatio < 0.7) {
      score += 5;
    }
    
    return Math.min(100, Math.max(0, score));
  };

  const healthScore = calculateHealthScore();
  
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Attention';
  };

  // Project year-end balance
  const projectYearEnd = () => {
    const avgMonthlyNet = monthlySummaries
      .slice(0, 6)
      .reduce((sum, s) => sum + s.incomeTotal + s.expenseTotal, 0) / Math.min(6, monthlySummaries.length);
    
    const monthsRemaining = 12 - monthlySummaries.length;
    return currentMonth.endingBalance + (avgMonthlyNet * monthsRemaining);
  };

  const projectedYearEnd = projectYearEnd();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Financial Insights</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Health Score */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 font-medium">Financial Health</span>
            {healthScore >= 80 ? (
              <FiCheckCircle className="text-green-600" />
            ) : (
              <FiAlertCircle className="text-yellow-600" />
            )}
          </div>
          <div className={`text-3xl font-bold ${getHealthColor(healthScore)} mb-1`}>
            {healthScore}
          </div>
          <div className="text-xs text-gray-500">{getHealthLabel(healthScore)}</div>
          <div className="mt-3 bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                healthScore >= 80 ? 'bg-green-600' : healthScore >= 60 ? 'bg-yellow-600' : 'bg-red-600'
              }`}
              style={{ width: `${healthScore}%` }}
            />
          </div>
        </div>

        {/* Income Trend */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 font-medium">Income Trend</span>
            {incomeTrend.isPositive ? (
              <FiTrendingUp className="text-green-600" />
            ) : (
              <FiTrendingDown className="text-red-600" />
            )}
          </div>
          <div className={`text-3xl font-bold ${incomeTrend.isPositive ? 'text-green-600' : 'text-red-600'} mb-1`}>
            {incomeTrend.isPositive ? '+' : '-'}{incomeTrend.percent.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">vs last month</div>
        </div>

        {/* Expense Trend */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 font-medium">Expense Trend</span>
            {!expenseTrend.isPositive ? (
              <FiTrendingDown className="text-green-600" />
            ) : (
              <FiTrendingUp className="text-red-600" />
            )}
          </div>
          <div className={`text-3xl font-bold ${!expenseTrend.isPositive ? 'text-green-600' : 'text-red-600'} mb-1`}>
            {expenseTrend.isPositive ? '+' : '-'}{expenseTrend.percent.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">vs last month</div>
        </div>

        {/* Projected Year-End */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 font-medium">Projected Year-End</span>
            {projectedYearEnd > 0 ? (
              <FiTrendingUp className="text-blue-600" />
            ) : (
              <FiTrendingDown className="text-gray-400" />
            )}
          </div>
          <div className={`text-3xl font-bold ${projectedYearEnd > 0 ? 'text-blue-600' : 'text-gray-600'} mb-1`}>
            ${Math.abs(projectedYearEnd).toFixed(0)}
          </div>
          <div className="text-xs text-gray-500">Based on avg monthly net</div>
        </div>
      </div>
    </div>
  );
}
