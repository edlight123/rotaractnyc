/**
 * Finance operations (server-side).
 *
 * Includes an in-memory TTL cache so repeated reads within a short window
 * don't hit Firestore on every call.  Mutations automatically invalidate
 * the cache so subsequent reads see fresh data.
 */
import { adminDb } from '@/lib/firebase/admin';
import type { Transaction, FinanceSummary } from '@/types';

const COLLECTION = 'transactions';

// ─── In-memory TTL cache ────────────────────────────────────────────────────

const SUMMARY_TTL_MS = 60_000; // 60 seconds for summary / dashboard data
const LIST_TTL_MS = 30_000;    // 30 seconds for transaction lists

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const inflightCache = new Map<string, Promise<unknown>>();

/**
 * Return cached data when the entry is still fresh; otherwise invoke
 * `fetcher`, store the result, and return it.
 *
 * Fixes cache stampede: the *promise* is cached so concurrent callers
 * share the same in-flight request instead of each starting their own.
 */
function getCached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (entry && entry.expiry > Date.now()) return Promise.resolve(entry.data);

  // Check if there's already an in-flight request for this key
  const inflight = inflightCache.get(key) as Promise<T> | undefined;
  if (inflight) return inflight;

  // Start a new fetch and cache the promise
  const promise = fetcher()
    .then((data) => {
      cache.set(key, { data, expiry: Date.now() + ttlMs });
      inflightCache.delete(key);
      return data;
    })
    .catch((err) => {
      inflightCache.delete(key);
      throw err;
    });

  inflightCache.set(key, promise);
  return promise;
}

/**
 * Clear every entry in the finance cache.
 * Call this from any POST / PUT / DELETE route that mutates finance data.
 */
export function invalidateFinanceCache(): void {
  cache.clear();
  inflightCache.clear();
}

// ─── Read operations ────────────────────────────────────────────────────────

export async function getTransactions(limit = 50): Promise<Transaction[]> {
  const cacheKey = `transactions:${limit}`;
  return getCached(cacheKey, LIST_TTL_MS, async () => {
    const snap = await adminDb
      .collection(COLLECTION)
      .orderBy('date', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));
  });
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  const cacheKey = `transaction:${id}`;
  return getCached(cacheKey, LIST_TTL_MS, async () => {
    const doc = await adminDb.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Transaction;
  });
}

// ─── Write operations (invalidate cache) ────────────────────────────────────

export async function createTransaction(data: Omit<Transaction, 'id'>): Promise<string> {
  const ref = await adminDb.collection(COLLECTION).add({
    ...data,
    createdAt: new Date().toISOString(),
  });
  invalidateFinanceCache();
  return ref.id;
}

export async function deleteTransaction(id: string): Promise<void> {
  await adminDb.collection(COLLECTION).doc(id).delete();
  invalidateFinanceCache();
}

// ─── Aggregated / dashboard queries ─────────────────────────────────────────

export async function getFinanceSummary(): Promise<FinanceSummary> {
  return getCached('financeSummary', SUMMARY_TTL_MS, async () => {
    const transactions = await getTransactions(500);

    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalExpenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Monthly breakdown
    const monthlyMap = new Map<string, { income: number; expenses: number }>();
    for (const t of transactions) {
      const d = new Date(t.date);
      if (isNaN(d.getTime())) continue; // skip malformed dates — they'd render as a "NaN-NaN" month
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = monthlyMap.get(key) || { income: 0, expenses: 0 };
      if (t.type === 'income') entry.income += t.amount;
      else entry.expenses += t.amount;
      monthlyMap.set(key, entry);
    }

    const monthlyBreakdown = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, data]) => ({ month, ...data }));

    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      monthlyBreakdown,
    };
  });
}

export async function getTransactionsByCategory(): Promise<Record<string, number>> {
  return getCached('transactionsByCategory', SUMMARY_TTL_MS, async () => {
    const transactions = await getTransactions(500);
    const categories: Record<string, number> = {};
    for (const t of transactions) {
      const key = `${t.type}:${t.category}`;
      categories[key] = (categories[key] || 0) + t.amount;
    }
    return categories;
  });
}
