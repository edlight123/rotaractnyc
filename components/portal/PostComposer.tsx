'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

interface PostComposerProps {
  onSubmit: (content: string, type: string) => Promise<void>;
}

export default function PostComposer({ onSubmit }: PostComposerProps) {
  const { member } = useAuth();
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setPosting(true);
    try {
      await onSubmit(content.trim(), 'text');
      setContent('');
    } finally {
      setPosting(false);
    }
  };

  return (
    <Card padding="md">
      <div className="flex gap-3">
        <Avatar src={member?.photoURL} alt={member?.displayName || ''} size="md" />
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share something with the community..."
            className="w-full bg-gray-50 dark:bg-gray-800/60 rounded-xl px-4 py-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cranberry-500/20 focus:bg-white dark:focus:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:border-cranberry-300 dark:focus:border-cranberry-700 resize-none transition-all duration-200"
            rows={3}
          />
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-gray-400">Visible to all members</p>
            <Button size="sm" disabled={!content.trim()} loading={posting} onClick={handleSubmit}>
              Post
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
