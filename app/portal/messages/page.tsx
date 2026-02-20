'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { useMembers, apiPost, apiGet, apiPatch } from '@/hooks/useFirestore';
import { useToast } from '@/components/ui/Toast';
import { useSwipeAction } from '@/hooks/useSwipeAction';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Tabs from '@/components/ui/Tabs';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { formatRelativeTime } from '@/lib/utils/format';
import { useSearchParams } from 'next/navigation';
import type { MemberMessage, Member } from '@/types';

/* ── Swipeable wrapper for message cards ── */
function SwipeableMessageCard({
  children,
  onArchive,
}: {
  children: React.ReactNode;
  onArchive: () => void;
}) {
  const { bind, style, isRevealed, reset } = useSwipeAction({
    threshold: 80,
    onAction: onArchive,
  });

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Action strip behind the card */}
      <div className="absolute inset-y-0 right-0 w-24 flex items-center justify-center bg-red-500 text-white">
        <div className="flex flex-col items-center gap-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          <span className="text-[10px] font-semibold">Archive</span>
        </div>
      </div>
      <div {...bind()} style={{ ...style, touchAction: 'pan-y' }} className="relative">
        {children}
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const { member } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const preselectedTo = searchParams.get('to') || '';

  const { data: members } = useMembers(true);
  const [inbox, setInbox] = useState<MemberMessage[]>([]);
  const [sent, setSent] = useState<MemberMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inbox');
  const [showCompose, setShowCompose] = useState(!!preselectedTo);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ toId: preselectedTo, subject: '', body: '' });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const composeRef = useRef<HTMLDivElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);

  const memberList = (members || []) as Member[];

  // Fetch messages
  useEffect(() => {
    if (!member?.id) return;
    setLoading(true);
    Promise.all([
      apiGet('/api/portal/messages?folder=inbox'),
      apiGet('/api/portal/messages?folder=sent'),
    ])
      .then(([inboxData, sentData]) => {
        setInbox(Array.isArray(inboxData) ? inboxData : []);
        setSent(Array.isArray(sentData) ? sentData : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [member?.id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.toId || !form.subject.trim() || !form.body.trim()) return;
    setSending(true);
    try {
      const recipient = memberList.find((m) => m.id === form.toId);
      await apiPost('/api/portal/messages', {
        toId: form.toId,
        toName: recipient?.displayName || 'Member',
        subject: form.subject,
        body: form.body,
      });
      toast('Message sent!');
      setForm({ toId: '', subject: '', body: '' });
      setShowCompose(false);
      // Refresh sent
      const sentData = await apiGet('/api/portal/messages?folder=sent');
      setSent(Array.isArray(sentData) ? sentData : []);
    } catch (err: any) {
      toast(err.message || 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleMarkRead = async (msgId: string) => {
    try {
      await apiPatch('/api/portal/messages', { messageId: msgId });
      setInbox((prev) => prev.map((m) => (m.id === msgId ? { ...m, read: true } : m)));
    } catch {
      // Silently fail
    }
  };

  const currentMessages = activeTab === 'sent' ? sent : inbox;
  const unreadCount = inbox.filter((m) => !m.read).length;

  const handleArchive = useCallback((msgId: string) => {
    // Optimistically remove from list
    if (activeTab === 'sent') {
      setSent((prev) => prev.filter((m) => m.id !== msgId));
    } else {
      setInbox((prev) => prev.filter((m) => m.id !== msgId));
    }
    toast('Message archived');
  }, [activeTab, toast]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 page-enter">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Messages</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Send and receive messages from fellow members.</p>
        </div>
        <Button onClick={() => setShowCompose(!showCompose)}>
          {showCompose ? (
            'Cancel'
          ) : (
            <>
              <svg className="w-4 h-4 -ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Message
            </>
          )}
        </Button>
      </div>

      {/* Compose */}
      {showCompose && (
        <div ref={composeRef} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6">
          <h3 className="font-display font-bold text-gray-900 dark:text-white mb-4">New Message</h3>
          <form onSubmit={handleSend} className="space-y-4">
            <Select
              label="To"
              placeholder="Select a member"
              options={memberList
                .filter((m) => m.id !== member?.id)
                .map((m) => ({ value: m.id, label: m.displayName || m.email }))}
              value={form.toId}
              onChange={(e) => setForm({ ...form, toId: e.target.value })}
              required
            />
            <Input ref={subjectRef} label="Subject" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Message subject" />
            <Textarea label="Message" required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Write your message..." rows={5} />
            <Button type="submit" loading={sending} className="w-full sm:w-auto">Send Message</Button>
          </form>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'inbox', label: `Inbox${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
          { id: 'sent', label: 'Sent' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Message List */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : currentMessages.length === 0 ? (
        <EmptyState
          icon={<svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>}
          title={activeTab === 'sent' ? 'No sent messages' : 'No messages'}
          description={activeTab === 'sent' ? 'Messages you send will appear here.' : 'Messages from other members will appear here.'}
        />
      ) : (
        <div className="space-y-3">
          {currentMessages.map((msg) => {
            const isFromMe = msg.fromId === member?.id;
            const isExpanded = expandedId === msg.id;
            const isUnread = !isFromMe && !msg.read;
            return (
              <SwipeableMessageCard key={msg.id} onArchive={() => handleArchive(msg.id)}>
              <div
                className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-4 sm:p-5 transition-all hover:border-gray-300 dark:hover:border-gray-700 ${isUnread ? 'border-l-4 !border-l-cranberry' : ''}`}
              >
                <button
                  className="w-full text-left"
                  onClick={() => {
                    setExpandedId(isExpanded ? null : msg.id);
                    if (isUnread) handleMarkRead(msg.id);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Avatar alt={isFromMe ? msg.toName : msg.fromName} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm ${isUnread ? 'font-bold' : 'font-semibold'} text-gray-900 dark:text-white`}>
                          {isFromMe ? `To: ${msg.toName}` : msg.fromName}
                        </p>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-cranberry shrink-0" />
                        )}
                        <span className="text-xs text-gray-400 ml-auto">{formatRelativeTime(msg.sentAt)}</span>
                      </div>
                      <p className={`text-sm ${isUnread ? 'font-medium text-gray-800 dark:text-gray-200' : 'text-gray-600 dark:text-gray-400'} mt-0.5 truncate`}>
                        {msg.subject}
                      </p>
                    </div>
                    <svg className={`w-4 h-4 shrink-0 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </button>
                {isExpanded && msg.body && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{msg.body}</p>
                    {!isFromMe && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-3"
                        onClick={() => {
                          setForm({ toId: msg.fromId, subject: `Re: ${msg.subject}`, body: '' });
                          setShowCompose(true);
                          // Scroll to compose and focus the body field
                          setTimeout(() => {
                            composeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            subjectRef.current?.focus();
                          }, 100);
                        }}
                      >
                        <svg className="w-4 h-4 -ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
                        Reply
                      </Button>
                    )}
                  </div>
                )}
              </div>
              </SwipeableMessageCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
