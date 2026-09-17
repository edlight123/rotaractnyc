'use client';

import { useCallback, useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { parseCommunityInviteUrl } from '@/lib/utils/communityLink';

/**
 * Replace the public WhatsApp community invite without a deploy.
 *
 * WhatsApp invite links are meant to be rotated — resetting one is the
 * remedy when it leaks or starts pulling in spam. That remedy is only
 * useful if acting on it takes a minute, hence this. Saving revalidates
 * /contact, and Sandra reads the new link on her next reply.
 */
export default function CommunityLinkSetting() {
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/community-link');
      const data = await res.json();
      setUrl(data.url || '');
    } catch {
      toast('Could not load the community link.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Same rule the server enforces, shown before they press save rather than
  // after — the server is still the one that decides.
  const valid = parseCommunityInviteUrl(url) !== null;

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/community-link', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save the link.');
      setUrl(data.url);
      toast('Community link updated. It is live on the contact page now.');
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
      <h2 className="font-display font-bold text-gray-900 dark:text-white">WhatsApp community</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        The open community invite shown on the contact page, and the one Sandra gives out.
        If the link ever leaks or starts attracting spam, reset it in WhatsApp
        (Community → Invite → Reset link) and paste the new one here.
      </p>

      <div className="mt-4 space-y-3">
        <Input
          label="Invite link"
          value={loading ? '' : url}
          disabled={loading}
          placeholder="https://chat.whatsapp.com/…"
          onChange={(e) => setUrl(e.target.value)}
          error={!loading && url.trim() !== '' && !valid ? 'This must be a https://chat.whatsapp.com/ invite link.' : undefined}
        />
        <Button onClick={save} disabled={!valid || saving || loading}>
          {saving ? 'Saving…' : 'Save link'}
        </Button>
      </div>
    </div>
  );
}
