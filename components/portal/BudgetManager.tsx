'use client';

import { useState } from 'react';
import { FiEdit2, FiSave, FiX } from 'react-icons/fi';

interface Budget {
  category: string;
  limit: number;
  spent: number;
}

interface BudgetManagerProps {
  categories: string[];
  transactions: any[];
  onBudgetUpdate?: (budgets: Budget[]) => void;
}

export default function BudgetManager({ categories, transactions, onBudgetUpdate }: BudgetManagerProps) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<{ [key: string]: string }>({});

  // Calculate spent amount per category
  const calculateSpent = (category: string) => {
    return Math.abs(
      transactions
        .filter(t => t.category === category && t.amount < 0)
        .reduce((sum, t) => sum + t.amount, 0)
    );
  };

  // Initialize budgets if empty
  if (budgets.length === 0 && categories.length > 0) {
    const initialBudgets = categories.map(category => ({
      category,
      limit: 0,
      spent: calculateSpent(category),
    }));
    setBudgets(initialBudgets);
  }

  const handleEdit = () => {
    const values: { [key: string]: string } = {};
    budgets.forEach(b => {
      values[b.category] = (b.limit / 100).toString();
    });
    setEditValues(values);
    setIsEditing(true);
  };

  const handleSave = () => {
    const updatedBudgets = budgets.map(b => ({
      ...b,
      limit: parseFloat(editValues[b.category] || '0') * 100,
    }));
    setBudgets(updatedBudgets);
    setIsEditing(false);
    onBudgetUpdate?.(updatedBudgets);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValues({});
  };

  const getUtilization = (budget: Budget) => {
    if (budget.limit === 0) return 0;
    return (budget.spent / budget.limit) * 100;
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 100) return 'bg-red-600';
    if (utilization >= 80) return 'bg-yellow-500';
    return 'bg-green-600';
  };

  if (categories.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Budget Management</h2>
        {!isEditing ? (
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <FiEdit2 />
            Set Budgets
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
            >
              <FiSave />
              Save
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <FiX />
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          {budgets.map((budget) => {
            const utilization = getUtilization(budget);
            const isOverBudget = utilization >= 100;
            const isNearLimit = utilization >= 80 && utilization < 100;

            return (
              <div key={budget.category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">{budget.category}</span>
                      <div className="flex items-center gap-4">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Budget:</span>
                            <input
                              type="number"
                              value={editValues[budget.category] || ''}
                              onChange={(e) =>
                                setEditValues({ ...editValues, [budget.category]: e.target.value })
                              }
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="0.00"
                              step="0.01"
                            />
                          </div>
                        ) : (
                          <>
                            <span className="text-sm text-gray-600">
                              ${(budget.spent / 100).toFixed(2)} / ${(budget.limit / 100).toFixed(2)}
                            </span>
                            {budget.limit > 0 && (
                              <span
                                className={`text-sm font-medium ${
                                  isOverBudget
                                    ? 'text-red-600'
                                    : isNearLimit
                                    ? 'text-yellow-600'
                                    : 'text-green-600'
                                }`}
                              >
                                {utilization.toFixed(0)}%
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    
                    {!isEditing && budget.limit > 0 && (
                      <div className="relative w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${getUtilizationColor(utilization)}`}
                          style={{ width: `${Math.min(100, utilization)}%` }}
                        />
                        {isOverBudget && (
                          <div className="absolute top-0 right-0 h-2 bg-red-600 rounded-r-full" style={{ width: '2px' }} />
                        )}
                      </div>
                    )}
                    
                    {!isEditing && isOverBudget && (
                      <p className="text-xs text-red-600 mt-1">
                        ⚠️ Over budget by ${((budget.spent - budget.limit) / 100).toFixed(2)}
                      </p>
                    )}
                    {!isEditing && isNearLimit && (
                      <p className="text-xs text-yellow-600 mt-1">
                        ⚠️ Approaching budget limit
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {!isEditing && budgets.some(b => b.limit > 0) && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Budget:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  ${(budgets.reduce((sum, b) => sum + b.limit, 0) / 100).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Total Spent:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  ${(budgets.reduce((sum, b) => sum + b.spent, 0) / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
