'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';

interface PostComposerProps {
  onSubmit: (content: string, type: string) => Promise<void>;
}

const MAX_CHARS = 1000;

export default function PostComposer({ onSubmit }: PostComposerProps) {
  const { member } = useAuth();
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setPosting(true);
    try {
      await onSubmit(content.trim(), 'text');
      setContent('');
      setFocused(false);
    } finally {
      setPosting(false);
    }
  };

  const charsLeft = MAX_CHARS - content.length;
  const isOverLimit = charsLeft < 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 hover:border-gray-300/80 dark:hover:border-gray-700 transition-all duration-200 overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="flex gap-3.5">
          <Avatar src={member?.photoURL} alt={member?.displayName || ''} size="md" className="mt-0.5" />
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setFocused(true)}
              placeholder="Share an update with the community…"
              className="w-full bg-gray-50/80 dark:bg-gray-800/40 rounded-xl px-4 py-3 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cranberry-500/20 focus:bg-white dark:focus:bg-gray-800 border border-gray-200/80 dark:border-gray-700/60 focus:border-cranberry-300 dark:focus:border-cranberry-700 resize-none transition-all duration-200"
              rows={focused ? 4 : 2}
              maxLength={MAX_CHARS + 50}
            />

            {/* Toolbar — only visible when focused */}
            <div className={`flex items-center justify-between mt-3 transition-all duration-200 ${focused || content ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden mt-0'}`}>
              <div className="flex items-center gap-1">
                {/* Toolbar icons */}
                <button type="button" className="p-2 rounded-lg text-gray-400 hover:text-cranberry hover:bg-cranberry-50 dark:hover:bg-cranberry-900/10 transition-colors" title="Add image">
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
                </button>
                <button type="button" className="p-2 rounded-lg text-gray-400 hover:text-cranberry hover:bg-cranberry-50 dark:hover:bg-cranberry-900/10 transition-colors" title="Add link">
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.313a4.5 4.5 0 00-6.364 0L4.5 14.25m11.19-5.562l4.5-4.5a4.5 4.5 0 00-6.364-6.364l-4.5 4.5" /></svg>
                </button>
                <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
                <p className={`text-xs tabular-nums font-medium ${isOverLimit ? 'text-red-500' : charsLeft < 100 ? 'text-gold-600' : 'text-gray-400'}`}>
                  {charsLeft}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] text-gray-400 hidden sm:block">Visible to all members</p>
                <Button size="sm" disabled={!content.trim() || isOverLimit} loading={posting} onClick={handleSubmit}>
                  Post
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
