'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { apiPost } from '@/hooks/useFirestore';
import Button from '@/components/ui/Button';
import type { Purchaser, PurchaserSummary } from './types';

const PAYMENT_METHODS = [
  { value: 'zelle', label: 'Zelle' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'cashapp', label: 'Cash App' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'other', label: 'Other' },
] as const;

interface EventPurchasersPanelProps {
  eventId: string;
  purchasers: Purchaser[];
  summary: PurchaserSummary | null;
  onRefresh?: () => void;
}

/**
 * Admin-only "Ticket Purchasers" panel with inline actions to mark pending
 * payments as paid (with required payment method for audit) or remove a ticket.
 */
export default function EventPurchasersPanel({ eventId, purchasers, summary, onRefresh }: EventPurchasersPanelProps) {
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [auditNote, setAuditNote] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  if (purchasers.length === 0 && !summary) return null;

  const pendingCount = purchasers.filter(
    (p) => p.paymentStatus !== 'paid' && p.paymentStatus !== 'free',
  ).length;

  const handleMarkPaid = async (purchaserId: string) => {
    if (!selectedMethod) return;
    setActionLoading(purchaserId);
    try {
      await apiPost(`/api/portal/events/${eventId}/purchasers/manage`, {
        action: 'mark_paid',
        purchaserId,
        paymentMethod: selectedMethod,
        notes: auditNote || undefined,
      });
      setMarkingPaid(null);
      setSelectedMethod('');
      setAuditNote('');
      onRefresh?.();
    } catch (err: any) {
      alert(err.message || 'Failed to mark as paid');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (purchaserId: string) => {
    setActionLoading(purchaserId);
    try {
      await apiPost(`/api/portal/events/${eventId}/purchasers/manage`, {
        action: 'remove',
        purchaserId,
      });
      setConfirmRemove(null);
      onRefresh?.();
    } catch (err: any) {
      alert(err.message || 'Failed to remove ticket');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h3 className="font-display font-semibold text-gray-900 dark:text-white text-lg">
          Ticket Purchasers
          {summary && (
            <span className="text-gray-400 dark:text-gray-500 font-normal text-sm ml-2">
              ({summary.orderCount ?? purchasers.length} order{(summary.orderCount ?? purchasers.length) !== 1 ? 's' : ''}
              {' · '}
              {summary.totalTickets} ticket{summary.totalTickets !== 1 ? 's' : ''})
            </span>
          )}
        </h3>
        <div className="flex items-center gap-3">
          <a
            href={`/portal/events/${eventId}/attendees`}
            className="text-xs font-semibold text-cranberry hover:text-cranberry/80 inline-flex items-center gap-1"
          >
            Full roster
            <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
          {summary && summary.totalRevenueCents > 0 && (
            <div className="text-right">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Revenue</p>
              <p className="text-lg font-display font-bold text-cranberry">
                {formatCurrency(summary.totalRevenueCents)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Pending notice */}
      {pendingCount > 0 && (
        <div className="mb-4 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300">
          <strong>{pendingCount}</strong> pending payment{pendingCount !== 1 ? 's' : ''} — not counted in total revenue until confirmed.
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-gray-50 dark:bg-gray-800/60 rounded-lg p-2.5 text-center">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Members</p>
            <p className="text-lg font-display font-bold text-gray-900 dark:text-white">{summary.memberCount}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/60 rounded-lg p-2.5 text-center">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Guests</p>
            <p className="text-lg font-display font-bold text-gray-900 dark:text-white">{summary.guestCount}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/60 rounded-lg p-2.5 text-center">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Tickets</p>
            <p className="text-lg font-display font-bold text-gray-900 dark:text-white">{summary.totalTickets}</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {purchasers.map((p) => {
          const isPending = p.paymentStatus !== 'paid' && p.paymentStatus !== 'free';
          const isMarkingThis = markingPaid === p.id;
          const isRemovingThis = confirmRemove === p.id;

          return (
            <div key={p.id} className="rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60 overflow-hidden">
              {/* Main row */}
              <div className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
                    <span className={`text-[9px] font-bold uppercase px-1 py-0.5 rounded ${
                      p.kind === 'member'
                        ? 'text-cranberry bg-cranberry-50 dark:bg-cranberry-900/20'
                        : 'text-azure-700 bg-azure-50 dark:bg-azure-900/20'
                    }`}>
                      {p.kind === 'member' ? 'M' : 'G'}
                    </span>
                    {p.source === 'offline_payment' && (
                      <span className="text-[9px] font-bold uppercase px-1 py-0.5 rounded text-amber-700 bg-amber-50 dark:bg-amber-900/20">
                        offline
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                    {p.email}{p.createdAt ? ` · ${formatDate(p.createdAt)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {p.quantity > 1 && (
                    <span className="text-xs text-gray-400">×{p.quantity}</span>
                  )}
                  {p.amountCents > 0 && (
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(p.amountCents)}
                    </span>
                  )}
                  {p.paymentStatus === 'paid' ? (
                    <span className="text-[9px] font-bold uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full">Paid</span>
                  ) : p.paymentStatus === 'free' ? (
                    <span className="text-[9px] font-bold uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-full">Free</span>
                  ) : (
                    <span className="text-[9px] font-bold uppercase text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full">Pending</span>
                  )}
                  {/* Action dots menu for pending rows */}
                  {isPending && !isMarkingThis && !isRemovingThis && (
                    <div className="flex items-center gap-1 ml-1">
                      <button
                        onClick={() => { setMarkingPaid(p.id); setConfirmRemove(null); }}
                        className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                        title="Mark as paid"
                      >
                        <Check className="w-3 h-3" />
                        Paid
                      </button>
                      <button
                        onClick={() => { setConfirmRemove(p.id); setMarkingPaid(null); }}
                        className="text-red-500 hover:text-red-600 dark:text-red-400"
                        title="Remove ticket"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Mark as Paid inline form */}
              {isMarkingThis && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-emerald-50/50 dark:bg-emerald-900/10 space-y-2">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Confirm payment method (required for audit):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PAYMENT_METHODS.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => setSelectedMethod(m.value)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                          selectedMethod === m.value
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-emerald-400'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Optional note (e.g., Zelle confirmation #)"
                    value={auditNote}
                    onChange={(e) => setAuditNote(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleMarkPaid(p.id)}
                      loading={actionLoading === p.id}
                      disabled={!selectedMethod}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                    >
                      Confirm Paid
                    </Button>
                    <button
                      onClick={() => { setMarkingPaid(null); setSelectedMethod(''); setAuditNote(''); }}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Remove confirmation */}
              {isRemovingThis && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-red-50/50 dark:bg-red-900/10 space-y-2">
                  <p className="text-xs text-red-700 dark:text-red-300">Remove this ticket? This will cancel their RSVP.</p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleRemove(p.id)}
                      loading={actionLoading === p.id}
                      className="text-xs bg-red-600 hover:bg-red-700 text-white"
                    >
                      Remove
                    </Button>
                    <button
                      onClick={() => setConfirmRemove(null)}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
