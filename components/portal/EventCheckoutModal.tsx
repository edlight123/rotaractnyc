'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils/format';
import type { PaymentSettings } from '@/types';

interface EventCheckoutModalProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  ticketType: 'member' | 'guest';
  priceCents: number;
  paymentSettings: PaymentSettings;
  onStripeCheckout: () => Promise<void>;
  onOfflinePayment: (method: string, proofUrl?: string) => Promise<void>;
  loading?: boolean;
}

type PaymentMethod = 'stripe' | 'zelle' | 'venmo' | 'cash' | 'check';

export default function EventCheckoutModal({
  open,
  onClose,
  eventId,
  eventTitle,
  ticketType,
  priceCents,
  paymentSettings,
  onStripeCheckout,
  onOfflinePayment,
  loading,
}: EventCheckoutModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [processing, setProcessing] = useState(false);
  const [proofUrl, setProofUrl] = useState('');
  const [notes, setNotes] = useState('');

  const amount = formatCurrency(priceCents);
  const priceLabel = ticketType === 'member' ? 'Member' : 'Guest';

  const availableMethods: {
    id: PaymentMethod;
    label: string;
    description: string;
    enabled: boolean;
  }[] = [
    {
      id: 'stripe',
      label: '💳 Credit Card',
      description: 'Secure payment with Stripe',
      enabled: true,
    },
    {
      id: 'zelle',
      label: '🏦 Zelle',
      description: paymentSettings.zelleIdentifier ? `${paymentSettings.zelleIdentifier}` : 'Bank transfer',
      enabled: paymentSettings.zelleEnabled ?? true,
    },
    {
      id: 'venmo',
      label: '📱 Venmo',
      description: paymentSettings.venmoUsername ? `@${paymentSettings.venmoUsername}` : 'Mobile payment',
      enabled: paymentSettings.venmoEnabled ?? true,
    },
    {
      id: 'cash',
      label: '💵 Cash',
      description: 'Pay in person',
      enabled: true,
    },
    {
      id: 'check',
      label: '✓ Check',
      description: 'Mail or deliver check',
      enabled: true,
    },
  ];

  const handleStripeCheckout = async () => {
    setProcessing(true);
    try {
      await onStripeCheckout();
    } finally {
      setProcessing(false);
    }
  };

  const handleOfflineSubmit = async () => {
    if (!selectedMethod || selectedMethod === 'stripe') return;
    setProcessing(true);
    try {
      await onOfflinePayment(selectedMethod, proofUrl || undefined);
      onClose();
    } finally {
      setProcessing(false);
    }
  };

  const selectedMethodData = availableMethods.find((m) => m.id === selectedMethod);

  return (
    <Modal open={open} onClose={onClose} title={`Buy ${priceLabel} Ticket - ${amount}`}>
      <div className="space-y-4">
        {/* Price summary */}
        <Card padding="md" className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800">
          <div className="text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">{eventTitle}</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{amount}</div>
            <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">{priceLabel} Ticket</div>
          </div>
        </Card>

        {/* Payment methods */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Choose Payment Method
          </label>
          <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
            {availableMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                disabled={!method.enabled}
                className={`text-left p-3 rounded-lg border-2 transition-all ${
                  !method.enabled
                    ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700'
                    : selectedMethod === method.id
                    ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">{method.label}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{method.description}</div>
                  </div>
                  {method.enabled && (
                    <div
                      className={`w-5 h-5 rounded-full border-2 ${
                        selectedMethod === method.id
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Method-specific details */}
        {selectedMethod && selectedMethod !== 'stripe' && (
          <Card padding="md" className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            {selectedMethod === 'zelle' && (
              <div className="space-y-2 text-sm">
                <div className="font-semibold text-gray-900 dark:text-white">Zelle Transfer</div>
                {paymentSettings.zelleIdentifier && (
                  <div>
                    <div className="text-gray-600 dark:text-gray-400">Send to:</div>
                    <div className="font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-white break-all">
                      {paymentSettings.zelleIdentifier}
                    </div>
                  </div>
                )}
                <div className="text-gray-600 dark:text-gray-400">Amount: {amount}</div>
                <div className="text-xs text-gray-500 mt-2">
                  Please include your name and &quot;Event Ticket&quot; in the transfer reference.
                </div>
              </div>
            )}
            {selectedMethod === 'venmo' && (
              <div className="space-y-2 text-sm">
                <div className="font-semibold text-gray-900 dark:text-white">Venmo Transfer</div>
                {paymentSettings.venmoUsername && (
                  <div>
                    <div className="text-gray-600 dark:text-gray-400">Send to:</div>
                    <div className="font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-white">
                      @{paymentSettings.venmoUsername}
                    </div>
                  </div>
                )}
                <div className="text-gray-600 dark:text-gray-400">Amount: {amount}</div>
                <div className="text-xs text-gray-500 mt-2">
                  Please note &quot;Event Ticket&quot; in your Venmo memo.
                </div>
              </div>
            )}
            {selectedMethod === 'cash' && (
              <div className="space-y-2 text-sm">
                <div className="font-semibold text-gray-900 dark:text-white">Cash Payment</div>
                <div className="text-gray-600 dark:text-gray-400">
                  Pay {amount} in cash at the event or during a club meeting.
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Our treasurer will mark your ticket as paid when payment is received.
                </div>
              </div>
            )}
            {selectedMethod === 'check' && (
              <div className="space-y-2 text-sm">
                <div className="font-semibold text-gray-900 dark:text-white">Check Payment</div>
                <div className="text-gray-600 dark:text-gray-400">
                  Mail a check for {amount} payable to &quot;Rotaract NYC&quot; with reference &quot;Event Ticket&quot;.
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Contact the treasurer for the mailing address.
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
          {selectedMethod === 'stripe' ? (
            <>
              <Button
                onClick={handleStripeCheckout}
                loading={processing || loading}
                className="flex-1"
              >
                Pay with Card
              </Button>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
            </>
          ) : selectedMethod ? (
            <>
              <Button
                onClick={handleOfflineSubmit}
                loading={processing || loading}
                className="flex-1"
              >
                Confirm {selectedMethodData?.label.split(' ')[0]}
              </Button>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
            </>
          ) : (
            <Button variant="ghost" onClick={onClose} className="w-full">
              Cancel
            </Button>
          )}
        </div>

        {/* Info message */}
        {selectedMethod && selectedMethod !== 'stripe' && (
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Your ticket will be marked as pending until payment is confirmed.
          </div>
        )}
      </div>
    </Modal>
  );
}
