'use client';

import { useAuth } from '@/lib/firebase/auth';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getFirebaseClientApp } from '@/lib/firebase/client';
import { Transaction, MonthlySummary } from '@/types/portal';
import { canManageFinances } from '@/lib/portal/roles';
import { FiDollarSign, FiTrendingUp, FiTrendingDown, FiFilter, FiDownload } from 'react-icons/fi';

export default function FinancePage() {
  const { userData, loading } = useAuth();
  const [monthlySummaries, setMonthlySummaries] = useState<MonthlySummary[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && userData && canManageFinances(userData.role)) {
      loadFinanceData();
    }
  }, [loading, userData]);

  useEffect(() => {
    filterTransactions();
  }, [transactions, selectedMonth, selectedCategory]);

  const loadFinanceData = async () => {
    const app = getFirebaseClientApp();
    if (!app) return;

    const db = getFirestore(app);
    
    try {
      // Load monthly summaries
      const summariesRef = collection(db, 'monthlySummaries');
      const summariesQuery = query(summariesRef, orderBy('month', 'desc'));
      const summariesSnapshot = await getDocs(summariesQuery);
      const summariesData = summariesSnapshot.docs.map(doc => ({
        ...doc.data()
      })) as MonthlySummary[];
      setMonthlySummaries(summariesData);

      // Load transactions
      const transactionsRef = collection(db, 'transactions');
      const transactionsQuery = query(
        transactionsRef,
        where('visibility', '==', 'member'),
        orderBy('date', 'desc')
      );
      const transactionsSnapshot = await getDocs(transactionsQuery);
      const transactionsData = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      setTransactions(transactionsData);

      // Extract unique categories
      const uniqueCategories = Array.from(new Set(
        transactionsData.map(t => t.category)
      )).sort();
      setCategories(uniqueCategories);
      
    } catch (error) {
      console.error('Error loading finance data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const filterTransactions = () => {
    let filtered = [...transactions];

    if (selectedMonth !== 'all') {
      filtered = filtered.filter(t => {
        const transactionMonth = t.date.toDate().toISOString().slice(0, 7); // YYYY-MM
        return transactionMonth === selectedMonth;
      });
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    setFilteredTransactions(filtered);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!canManageFinances(userData?.role)) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <FiDollarSign className="text-6xl text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">You don&apos;t have permission to view financial data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Finance Dashboard</h1>
        <p className="text-gray-600">View club financial summaries and transactions</p>
      </div>

      {/* Monthly Summaries */}
      {monthlySummaries.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Monthly Summaries</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {monthlySummaries.map((summary) => (
              <div
                key={summary.month}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="text-lg font-bold text-gray-900 mb-4">
                  {new Date(summary.month + '-01').toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long'
                  })}
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Starting Balance</span>
                    <span className="font-semibold">{formatCurrency(summary.startingBalance)}</span>
                  </div>
                  <div className="flex justify-between items-center text-green-600">
                    <div className="flex items-center gap-2">
                      <FiTrendingUp />
                      <span>Income</span>
                    </div>
                    <span className="font-semibold">+{formatCurrency(summary.incomeTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-red-600">
                    <div className="flex items-center gap-2">
                      <FiTrendingDown />
                      <span>Expenses</span>
                    </div>
                    <span className="font-semibold">-{formatCurrency(summary.expenseTotal)}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Ending Balance</span>
                    <span className="font-bold text-lg">{formatCurrency(summary.endingBalance)}</span>
                  </div>
                </div>

                {summary.categoryTotals && Object.keys(summary.categoryTotals).length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm font-medium text-gray-700 mb-2">By Category</div>
                    <div className="space-y-1 text-sm">
                      {Object.entries(summary.categoryTotals).map(([category, total]) => (
                        <div key={category} className="flex justify-between text-gray-600">
                          <span>{category}</span>
                          <span>{formatCurrency(total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {summary.notes && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm text-gray-600">{summary.notes}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Transactions</h2>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-4">
              <FiFilter className="text-gray-500" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Months</option>
                {monthlySummaries.map(summary => (
                  <option key={summary.month} value={summary.month}>
                    {new Date(summary.month + '-01').toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long'
                    })}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Transactions table */}
        {filteredTransactions.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Receipt
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {transaction.vendor}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                          {transaction.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {transaction.noteForMembers || '-'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                        transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {transaction.receiptUrl ? (
                          <a
                            href={transaction.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <FiDownload className="inline" />
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500">No transactions found</p>
          </div>
        )}
      </div>
    </div>
  );
}
