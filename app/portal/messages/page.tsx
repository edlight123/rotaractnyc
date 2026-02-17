'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { useMembers, apiPost, apiGet, apiPatch } from '@/hooks/useFirestore';
import { useToast } from '@/components/ui/Toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Tabs from '@/components/ui/Tabs';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { formatRelativeTime } from '@/lib/utils/format';
import { useSearchParams } from 'next/navigation';
import type { MemberMessage, Member } from '@/types';

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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Messages</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Send and receive messages from fellow members.</p>
        </div>
        <Button onClick={() => setShowCompose(!showCompose)}>
          {showCompose ? 'Cancel' : '✉️ New Message'}
        </Button>
      </div>

      {/* Compose */}
      {showCompose && (
        <Card padding="md">
          <h3 className="font-display font-bold text-gray-900 dark:text-white mb-4">New Message</h3>
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">To</label>
              <select
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cranberry-500/20 focus:border-cranberry-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                value={form.toId}
                onChange={(e) => setForm({ ...form, toId: e.target.value })}
                required
              >
                <option value="">Select a member</option>
                {memberList
                  .filter((m) => m.id !== member?.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>{m.displayName}</option>
                  ))}
              </select>
            </div>
            <Input label="Subject" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Message subject" />
            <Textarea label="Message" required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Write your message..." rows={5} />
            <Button type="submit" loading={sending}>Send Message</Button>
          </form>
        </Card>
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
          icon="✉️"
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
              <Card
                key={msg.id}
                padding="md"
                className={isUnread ? 'border-l-4 border-l-cranberry' : ''}
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
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        ↩️ Reply
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
