'use client';

import { useAuth } from '@/lib/firebase/auth';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getFirebaseClientApp } from '@/lib/firebase/client';
import { Transaction, MonthlySummary } from '@/types/portal';
import { canManageFinances } from '@/lib/portal/roles';
import { FiDollarSign, FiTrendingUp, FiTrendingDown, FiFilter, FiDownload, FiSearch, FiChevronDown, FiChevronUp, FiCalendar, FiBarChart2 } from 'react-icons/fi';
import FinanceCharts from '@/components/portal/FinanceCharts';
import { exportTransactionsToCSV, exportSummariesToCSV } from '@/lib/utils/exportCSV';

export default function FinancePage() {
  const { userData, loading } = useAuth();
  const [monthlySummaries, setMonthlySummaries] = useState<MonthlySummary[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showCharts, setShowCharts] = useState(true);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

  useEffect(() => {
    if (!loading && userData && canManageFinances(userData.role)) {
      loadFinanceData();
    }
  }, [loading, userData]);

  useEffect(() => {
    filterTransactions();
    setCurrentPage(1); // Reset to first page when filters change
  }, [transactions, selectedMonth, selectedCategory, searchTerm, dateRange]);

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

    // Month filter
    if (selectedMonth !== 'all') {
      filtered = filtered.filter(t => {
        const transactionMonth = t.date.toDate().toISOString().slice(0, 7); // YYYY-MM
        return transactionMonth === selectedMonth;
      });
    }

    // Date range filter
    if (dateRange.start) {
      filtered = filtered.filter(t => {
        const transactionDate = t.date.toDate();
        return transactionDate >= new Date(dateRange.start);
      });
    }
    if (dateRange.end) {
      filtered = filtered.filter(t => {
        const transactionDate = t.date.toDate();
        return transactionDate <= new Date(dateRange.end);
      });
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.vendor?.toLowerCase().includes(searchLower) ||
        t.noteForMembers?.toLowerCase().includes(searchLower) ||
        t.category?.toLowerCase().includes(searchLower)
      );
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

  const toggleRowExpansion = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const calculateYTDSummary = () => {
    const currentYear = new Date().getFullYear();
    const ytdSummaries = monthlySummaries.filter(s => 
      s.month.startsWith(currentYear.toString())
    );
    
    const ytdIncome = ytdSummaries.reduce((sum, s) => sum + s.incomeTotal, 0);
    const ytdExpenses = ytdSummaries.reduce((sum, s) => sum + s.expenseTotal, 0);
    const currentBalance = ytdSummaries.length > 0 ? ytdSummaries[0].endingBalance : 0;
    
    return { ytdIncome, ytdExpenses, currentBalance };
  };

  const ytdData = calculateYTDSummary();

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTransactions = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  const handleExportTransactions = () => {
    exportTransactionsToCSV(filteredTransactions, `transactions_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportSummaries = () => {
    exportSummariesToCSV(monthlySummaries, `monthly_summaries_${new Date().toISOString().split('T')[0]}.csv`);
  };

  if (loading || loadingData) {
    return (
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="h-8 bg-gray-200 rounded w-64 mb-4 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
          </div>
          
          {/* Summary cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="h-4 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
              </div>
            ))}
          </div>

          {/* Chart skeleton */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
          </div>
        </div>
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
    <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Finance Dashboard</h1>
              <p className="text-gray-600">View club financial summaries and transactions</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowCharts(!showCharts)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <FiBarChart2 />
                {showCharts ? 'Hide' : 'Show'} Charts
              </button>
              <button
                onClick={handleExportSummaries}
                className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
              >
                <FiDownload />
                Export Summaries
              </button>
              <button
                onClick={handleExportTransactions}
                className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
              >
                <FiDownload />
                Export Transactions
              </button>
            </div>
          </div>
        </div>

        {/* YTD Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm border border-blue-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-700 font-medium">Current Balance</span>
              <FiDollarSign className="text-2xl text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-blue-900">{formatCurrency(ytdData.currentBalance)}</div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm border border-green-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-700 font-medium">YTD Income</span>
              <FiTrendingUp className="text-2xl text-green-600" />
            </div>
            <div className="text-3xl font-bold text-green-900">+{formatCurrency(ytdData.ytdIncome)}</div>
            <p className="text-sm text-green-600 mt-1">Year to Date</p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg shadow-sm border border-red-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-red-700 font-medium">YTD Expenses</span>
              <FiTrendingDown className="text-2xl text-red-600" />
            </div>
            <div className="text-3xl font-bold text-red-900">{formatCurrency(ytdData.ytdExpenses)}</div>
            <p className="text-sm text-red-600 mt-1">Year to Date</p>
          </div>
        </div>

        {/* Charts */}
        {showCharts && (
          <FinanceCharts monthlySummaries={monthlySummaries} transactions={transactions} />
        )}

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

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="space-y-4">
            {/* Search bar */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by vendor, notes, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <FiFilter className="text-gray-500 flex-shrink-0" />
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    setDateRange({ start: '', end: '' }); // Clear date range when selecting month
                  }}
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

              <div className="flex items-center gap-2">
                <FiCalendar className="text-gray-500 flex-shrink-0" />
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => {
                    setDateRange({ ...dateRange, start: e.target.value });
                    setSelectedMonth('all'); // Clear month filter when using date range
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Start date"
                />
              </div>

              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => {
                  setDateRange({ ...dateRange, end: e.target.value });
                  setSelectedMonth('all'); // Clear month filter when using date range
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="End date"
              />
            </div>

            {/* Active filters summary */}
            {(searchTerm || selectedMonth !== 'all' || selectedCategory !== 'all' || dateRange.start || dateRange.end) && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="font-medium">Active filters:</span>
                {searchTerm && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">Search: {searchTerm}</span>}
                {selectedMonth !== 'all' && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">Month: {selectedMonth}</span>}
                {selectedCategory !== 'all' && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">Category: {selectedCategory}</span>}
                {dateRange.start && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">From: {dateRange.start}</span>}
                {dateRange.end && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">To: {dateRange.end}</span>}
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedMonth('all');
                    setSelectedCategory('all');
                    setDateRange({ start: '', end: '' });
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Results count */}
            <div className="text-sm text-gray-600">
              Showing {currentTransactions.length} of {filteredTransactions.length} transactions
            </div>
          </div>
        </div>

        {/* Transactions table */}
        {filteredTransactions.length > 0 ? (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8"></th>
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
                    {currentTransactions.map((transaction) => (
                      <>
                        <tr key={transaction.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleRowExpansion(transaction.id)}>
                          <td className="px-6 py-4">
                            {expandedRows.has(transaction.id) ? (
                              <FiChevronUp className="text-gray-400" />
                            ) : (
                              <FiChevronDown className="text-gray-400" />
                            )}
                          </td>
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
                          <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
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
                                onClick={(e) => e.stopPropagation()}
                              >
                                <FiDownload className="inline" />
                              </a>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                        {expandedRows.has(transaction.id) && (
                          <tr className="bg-gray-50">
                            <td colSpan={7} className="px-6 py-4">
                              <div className="space-y-2 text-sm">
                                <div><span className="font-medium text-gray-700">Full Notes:</span> <span className="text-gray-600">{transaction.noteForMembers || 'No notes'}</span></div>
                                {transaction.receiptUrl && (
                                  <div><span className="font-medium text-gray-700">Receipt:</span> <a href={transaction.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View Receipt</a></div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile card view */}
            <div className="md:hidden space-y-4">
              {currentTransactions.map((transaction) => (
                <div key={transaction.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-medium text-gray-900">{transaction.vendor}</div>
                      <div className="text-sm text-gray-500">{formatDate(transaction.date)}</div>
                    </div>
                    <div className={`text-lg font-bold ${
                      transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                        {transaction.category}
                      </span>
                    </div>
                    {transaction.noteForMembers && (
                      <p className="text-sm text-gray-600">{transaction.noteForMembers}</p>
                    )}
                    {transaction.receiptUrl && (
                      <a
                        href={transaction.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                      >
                        <FiDownload />
                        View Receipt
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    
                    {/* Page numbers */}
                    <div className="hidden sm:flex gap-2">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-4 py-2 rounded-lg ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <FiDollarSign className="text-6xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium mb-2">No transactions found</p>
            <p className="text-gray-400 text-sm">Try adjusting your filters or search criteria</p>
          </div>
        )}
      </div>
      </div>
    </main>
  );
}
