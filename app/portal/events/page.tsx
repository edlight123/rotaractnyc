'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { usePortalEvents, apiPost } from '@/hooks/useFirestore';
import { useToast } from '@/components/ui/Toast';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Tabs from '@/components/ui/Tabs';
import SearchInput from '@/components/ui/SearchInput';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { defaultEvents } from '@/lib/defaults/data';
import type { RotaractEvent, RSVPStatus } from '@/types';

export default function PortalEventsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: firestoreEvents, loading } = usePortalEvents();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');
  const [rsvpLoading, setRsvpLoading] = useState<string | null>(null);

  const allEvents = ((firestoreEvents || []).length > 0 ? firestoreEvents : defaultEvents) as RotaractEvent[];
  const now = new Date();

  const events = allEvents
    .filter((e) => {
      const title = (e.title || '').toLowerCase();
      const desc = (e.description || '').toLowerCase();
      const q = search.toLowerCase();
      const matchSearch = title.includes(q) || desc.includes(q);
      const isFuture = new Date(e.date) >= now;
      return activeTab === 'upcoming' ? matchSearch && isFuture : matchSearch && !isFuture;
    })
    .sort((a, b) => activeTab === 'upcoming'
      ? new Date(a.date).getTime() - new Date(b.date).getTime()
      : new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleRSVP = async (eventId: string, status: RSVPStatus) => {
    if (!user) return;
    setRsvpLoading(eventId);
    try {
      await apiPost('/api/portal/events/rsvp', { eventId, status });
      toast(status === 'going' ? "You're going! 🎉" : 'RSVP updated');
    } catch (err: any) {
      toast(err.message || 'RSVP failed', 'error');
    } finally {
      setRsvpLoading(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Events</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">RSVP to upcoming events and track your attendance.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search events..." className="sm:max-w-xs" />
        <Tabs tabs={[{ id: 'upcoming', label: 'Upcoming' }, { id: 'past', label: 'Past' }]} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : events.length === 0 ? (
        <EmptyState icon="📅" title={activeTab === 'upcoming' ? 'No upcoming events' : 'No past events found'} description="Check back soon for new events." />
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <Card key={event.id} padding="none" className="overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                <div className="sm:w-24 bg-cranberry-50 dark:bg-cranberry-900/20 flex sm:flex-col items-center justify-center p-4 gap-1">
                  <p className="text-xs font-bold text-cranberry uppercase">{new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}</p>
                  <p className="text-2xl font-display font-bold text-cranberry-800 dark:text-cranberry-300">{new Date(event.date).getDate()}</p>
                </div>
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display font-bold text-gray-900 dark:text-white">{event.title}</h3>
                        <Badge variant={event.type === 'service' ? 'azure' : event.type === 'paid' ? 'gold' : 'green'}>{event.type}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{event.description}</p>
                      <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
                        <span>🕐 {event.time}{event.endTime ? ` – ${event.endTime}` : ''}</span>
                        <span>📍 {event.location?.split(',')[0]}</span>
                      </div>
                    </div>
                    {new Date(event.date) >= now && (
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" variant="primary" loading={rsvpLoading === event.id} onClick={() => handleRSVP(event.id, 'going')}>Going</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleRSVP(event.id, 'maybe')}>Maybe</Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
