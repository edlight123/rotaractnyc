'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/firebase/auth';
import { uploadFile, validateFile } from '@/lib/firebase/upload';
import { slugify } from '@/lib/utils/slugify';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import type { JSONContent } from 'novel';

// Dynamic import to avoid SSR issues with the editor
const ArticleEditor = dynamic(() => import('@/components/portal/ArticleEditor'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[400px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-center">
      <div className="flex items-center gap-3 text-gray-400">
        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading editor…
      </div>
    </div>
  ),
});

const CATEGORIES = ['General', 'Service', 'Leadership', 'International', 'Fellowship', 'Events', 'Announcements'];

export default function NewArticlePage() {
  const router = useRouter();
  const { member } = useAuth();

  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('General');
  const [tagsInput, setTagsInput] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Editor content ref (avoids re-renders)
  const editorContentRef = useRef<{ html: string; json: JSONContent; wordCount: number }>({
    html: '',
    json: { type: 'doc', content: [] },
    wordCount: 0,
  });

  // Check role
  const canCreate = member && ['board', 'president', 'treasurer'].includes(member.role);

  const handleEditorUpdate = useCallback(
    (data: { html: string; json: JSONContent; wordCount: number }) => {
      editorContentRef.current = data;
    },
    [],
  );

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file, { maxSizeMB: 10, allowedTypes: ['image/'] });
    if (validationError) {
      setError(validationError);
      return;
    }

    setCoverUploading(true);
    try {
      const result = await uploadFile(file, 'article-images');
      setCoverImage(result.url);
    } catch {
      setError('Failed to upload cover image.');
    } finally {
      setCoverUploading(false);
    }
  };

  const handleSave = async (publish: boolean) => {
    setError('');

    if (!title.trim()) {
      setError('Please enter a title.');
      return;
    }

    const { html, wordCount } = editorContentRef.current;
    if (!html || html === '<p></p>') {
      setError('Please write some content before saving.');
      return;
    }

    setSaving(true);
    try {
      const slug = slugify(title);
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch('/api/portal/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          slug,
          excerpt: excerpt.trim(),
          content: html,
          coverImage: coverImage || null,
          category,
          tags,
          isPublished: publish,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to save article.');
        return;
      }

      router.push('/portal/articles');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!canCreate) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-2">Access Restricted</h1>
        <p className="text-gray-500 dark:text-gray-400">Only board members can create articles.</p>
        <Button variant="ghost" className="mt-6" onClick={() => router.push('/portal/articles')}>
          ← Back to Articles
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push('/portal/articles')}
            className="text-sm text-gray-500 hover:text-cranberry transition-colors mb-2 flex items-center gap-1"
          >
            ← Back to Articles
          </button>
          <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white">New Article</h1>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleSave(false)}
            loading={saving}
            disabled={saving}
          >
            Save Draft
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSave(true)}
            loading={saving}
            disabled={saving}
          >
            Publish
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Cover Image */}
      <div>
        {coverImage ? (
          <div className="relative rounded-xl overflow-hidden group">
            <img src={coverImage} alt="Cover" className="w-full h-64 object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <label className="cursor-pointer bg-white/90 text-gray-900 rounded-lg px-4 py-2 text-sm font-medium hover:bg-white transition-colors">
                Change
                <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
              </label>
              <button
                onClick={() => setCoverImage('')}
                className="bg-white/90 text-red-600 rounded-lg px-4 py-2 text-sm font-medium hover:bg-white transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <label
            className={`flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-cranberry dark:hover:border-cranberry transition-colors cursor-pointer bg-gray-50 dark:bg-gray-900/50 ${
              coverUploading ? 'pointer-events-none opacity-60' : ''
            }`}
          >
            {coverUploading ? (
              <div className="flex items-center gap-2 text-gray-400">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Uploading…
              </div>
            ) : (
              <>
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Add Cover Image</span>
                <span className="text-xs text-gray-400 mt-1">Recommended: 1200×630px</span>
              </>
            )}
            <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
          </label>
        )}
      </div>

      {/* Title */}
      <Input
        label="Title"
        placeholder="Enter article title…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="!text-lg font-display"
      />

      {/* Excerpt */}
      <Textarea
        label="Excerpt"
        placeholder="A brief summary that appears on article cards (optional)…"
        value={excerpt}
        onChange={(e) => setExcerpt(e.target.value)}
        className="!min-h-[80px]"
      />

      {/* Category + Tags */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cranberry-500/20 focus:border-cranberry-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="Tags"
          placeholder="rotary, service, community (comma-separated)"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          helperText="Separate tags with commas"
        />
      </div>

      {/* Editor */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Content</label>
        <ArticleEditor onUpdate={handleEditorUpdate} />
        <p className="mt-2 text-xs text-gray-400 text-right">
          {editorContentRef.current.wordCount > 0 && `${editorContentRef.current.wordCount} words · `}
          Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-mono">/</kbd> for
          commands
        </p>
      </div>

      {/* Bottom actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button variant="ghost" onClick={() => router.push('/portal/articles')}>
          Cancel
        </Button>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => handleSave(false)}
            loading={saving}
            disabled={saving}
          >
            Save as Draft
          </Button>
          <Button
            variant="primary"
            onClick={() => handleSave(true)}
            loading={saving}
            disabled={saving}
          >
            Publish Article
          </Button>
        </div>
      </div>
    </div>
  );
}
