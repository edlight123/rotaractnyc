'use client';

import { useState, useEffect } from 'react';
import { Target, MapPin } from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth';
import { apiGet, apiPost, apiPatch } from '@/hooks/useFirestore';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Combobox from '@/components/ui/Combobox';
import Spinner from '@/components/ui/Spinner';
import { formatCurrency } from '@/lib/utils/format';
import Link from 'next/link';
import type { Activity } from '@/types';

const activityTypeOptions = [
  { value: 'gala', label: 'Gala' },
  { value: 'social', label: 'Social Hours' },
  { value: 'volunteering', label: 'Volunteering' },
  { value: 'conference', label: 'Conference' },
  { value: 'excursion', label: 'Excursion' },
  { value: 'website', label: 'Website/Tech' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Other' },
];

export default function ActivitiesPage() {
  const { member } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    type: 'gala',
    customType: '',
    date: '',
    location: '',
    address: '',
    description: '',
    linkedEventId: '',
    budgetTotal: '',
    lineItems: [{ name: '', amount: '', notes: '' }],
  });

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const data = await apiGet('/api/finance/activities');
      setActivities(data.activities || []);
    } catch (error) {
      toast('Failed to load activities', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLineItem = () => {
    setForm({
      ...form,
      lineItems: [...form.lineItems, { name: '', amount: '', notes: '' }],
    });
  };

  const handleRemoveLineItem = (index: number) => {
    setForm({
      ...form,
      lineItems: form.lineItems.filter((_, i) => i !== index),
    });
  };

  const handleLineItemChange = (index: number, field: string, value: string) => {
    const newLineItems = [...form.lineItems];
    newLineItems[index] = { ...newLineItems[index], [field]: value };
    setForm({ ...form, lineItems: newLineItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const budgetTotal = form.lineItems.reduce((sum, item) => {
        return sum + (parseFloat(item.amount) || 0) * 100;
      }, 0);

      await apiPost('/api/finance/activities', {
        name: form.name,
        type: form.type,
        customType: form.type === 'other' ? form.customType : undefined,
        date: form.date,
        location: form.location || undefined,
        address: form.address || undefined,
        description: form.description || undefined,
        linkedEventId: form.linkedEventId || undefined,
        budget: {
          totalEstimate: Math.round(budgetTotal),
          lineItems: form.lineItems.map((item) => ({
            name: item.name,
            amount: Math.round(parseFloat(item.amount || '0') * 100),
            notes: item.notes || undefined,
          })),
        },
      });

      toast('Activity created successfully!');
      setShowModal(false);
      fetchActivities();
      
      // Reset form
      setForm({
        name: '',
        type: 'gala',
        customType: '',
        date: '',
        location: '',
        address: '',
        description: '',
        linkedEventId: '',
        budgetTotal: '',
        lineItems: [{ name: '', amount: '', notes: '' }],
      });
    } catch (error: any) {
      toast(error.message || 'Failed to create activity', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForApproval = async (activityId: string) => {
    try {
      await apiPatch(`/api/finance/activities/${activityId}`, {
        status: 'pending_approval',
        approvals: {
          treasurerSubmitted: true,
          treasurerSubmittedAt: new Date().toISOString(),
          presidentApproved: false,
        },
      });
      toast('Submitted for president approval!');
      fetchActivities();
    } catch (error) {
      toast('Failed to submit', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  const statusBadges = {
    draft: { variant: 'gray' as const, label: 'Draft' },
    pending_approval: { variant: 'gold' as const, label: 'Pending Approval' },
    approved: { variant: 'green' as const, label: 'Approved' },
    completed: { variant: 'azure' as const, label: 'Completed' },
    cancelled: { variant: 'red' as const, label: 'Cancelled' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Activities</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage activity budgets and financial planning
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Activity
        </Button>
      </div>

      {activities.length === 0 ? (
        <Card padding="lg">
          <div className="text-center py-12">
            <Target className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="font-display font-bold text-gray-900 dark:text-white mb-2">No activities yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Create your first activity to start tracking budgets and expenses.
            </p>
            <Button onClick={() => setShowModal(true)}>Create Activity</Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {activities.map((activity) => {
            const badge = statusBadges[activity.status];
            const budgetUsed =
              activity.actual?.totalSpent && activity.budget.totalEstimate
                ? Math.round((activity.actual.totalSpent / activity.budget.totalEstimate) * 100)
                : 0;

            return (
              <Link key={activity.id} href={`/finance/activities/${activity.id}`}>
                <Card padding="md" className="hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-display font-bold text-gray-900 dark:text-white">
                          {activity.name}
                        </h3>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        <span className="text-xs text-gray-400">
                          {new Date(activity.date).toLocaleDateString()}
                        </span>
                      </div>
                      {activity.location && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" /> {activity.location}
                        </p>
                      )}
                      <div className="flex items-center gap-6 text-sm">
                        <div>
                          <span className="text-gray-500">Budget: </span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(activity.budget.totalEstimate)}
                          </span>
                        </div>
                        {activity.actual?.totalSpent !== undefined && (
                          <>
                            <div>
                              <span className="text-gray-500">Spent: </span>
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {formatCurrency(activity.actual.totalSpent)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Used: </span>
                              <span
                                className={`font-semibold ${
                                  budgetUsed > 100 ? 'text-red-600' : 'text-emerald-600'
                                }`}
                              >
                                {budgetUsed}%
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    {activity.status === 'draft' && member?.role === 'treasurer' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.preventDefault();
                          handleSubmitForApproval(activity.id);
                        }}
                      >
                        Submit for Approval
                      </Button>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Activity Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create New Activity">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Activity Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Spring Gala 2026"
          />

          <Combobox
            label="Activity Type"
            required
            value={form.type}
            onChange={(v) => setForm({ ...form, type: v })}
            options={activityTypeOptions}
          />

          {form.type === 'other' && (
            <Input
              label="Custom Type"
              required
              value={form.customType}
              onChange={(e) => setForm({ ...form, customType: e.target.value })}
              placeholder="Specify activity type"
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            <Input
              label="Location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Venue name"
            />
          </div>

          <Input
            label="Full Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="123 Main St, New York, NY 10001"
          />

          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Activity details..."
            rows={3}
          />

          {/* Budget Line Items */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Budget Line Items
            </label>
            {form.lineItems.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                <Input
                  className="col-span-5"
                  value={item.name}
                  onChange={(e) => handleLineItemChange(index, 'name', e.target.value)}
                  placeholder="Item name"
                />
                <Input
                  className="col-span-3"
                  type="number"
                  step="0.01"
                  value={item.amount}
                  onChange={(e) => handleLineItemChange(index, 'amount', e.target.value)}
                  placeholder="Amount"
                />
                <Input
                  className="col-span-3"
                  value={item.notes}
                  onChange={(e) => handleLineItemChange(index, 'notes', e.target.value)}
                  placeholder="Notes"
                />
                {form.lineItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveLineItem(index)}
                    className="col-span-1 text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <Button type="button" size="sm" variant="ghost" onClick={handleAddLineItem}>
              + Add Line Item
            </Button>
            <p className="text-sm text-gray-500 mt-2">
              Total Budget:{' '}
              <span className="font-semibold">
                {formatCurrency(
                  form.lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0) * 100, 0)
                )}
              </span>
            </p>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <Button type="submit" loading={saving} className="flex-1">
              Create Activity
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
