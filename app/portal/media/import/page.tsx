'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import { AlertTriangle, Upload, RotateCcw, CheckCircle2, XCircle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImportFormState {
  url: string;
  title: string;
  slug: string;
  description: string;
  isPublic: boolean;
  previewCount: number;
  featured: boolean;
  featuredCount: number;
  dryRun: boolean;
}

type ImportStatus = 'idle' | 'running' | 'success' | 'error';

// ─── Component ────────────────────────────────────────────────────────────────

export default function ImportAlbumPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [form, setForm] = useState<ImportFormState>({
    url: '',
    title: '',
    slug: '',
    description: '',
    isPublic: true,
    previewCount: 6,
    featured: false,
    featuredCount: 3,
    dryRun: false,
  });

  const [status, setStatus] = useState<ImportStatus>('idle');
  const [logLines, setLogLines] = useState<string[]>([]);
  const logRef = useRef<HTMLPreElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Redirect unauthenticated users — the API route enforces the role check
  useEffect(() => {
    if (!loading && !user) router.push('/portal/login');
  }, [user, loading, router]);

  // Auto-scroll log to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logLines]);

  // Derive slug from title
  const handleTitleChange = useCallback((value: string) => {
    setForm((f) => ({
      ...f,
      title: value,
      slug: f.slug === '' || f.slug === slugify(f.title)
        ? slugify(value)
        : f.slug,
    }));
  }, []);

  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    setStatus('idle');
    setLogLines([]);
    setForm({
      url: '',
      title: '',
      slug: '',
      description: '',
      isPublic: true,
      previewCount: 6,
      featured: false,
      featuredCount: 3,
      dryRun: false,
    });
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.url.trim()) {
      toast('Paste a Google Photos album URL first.', 'error');
      return;
    }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setStatus('running');
    setLogLines([`▶ Starting import of: ${form.url}\n`]);

    try {
      const res = await fetch('/api/admin/import-album', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: form.url.trim(),
          title: form.title || undefined,
          slug: form.slug || undefined,
          description: form.description || undefined,
          isPublic: form.isPublic,
          previewCount: form.previewCount,
          featured: form.featured,
          featuredCount: form.featuredCount,
          dryRun: form.dryRun,
        }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Split on newlines and flush complete lines
        const parts = buffer.split('\n');
        buffer = parts.pop() ?? '';
        const lines = parts.map((l) => l + '\n');
        if (lines.length) {
          setLogLines((prev) => [...prev, ...lines]);
        }
      }

      // Flush any remaining buffer
      if (buffer) setLogLines((prev) => [...prev, buffer]);

      const finalLog = logLines.join('') + buffer;
      setStatus(finalLog.includes('exited with code 0') ? 'success' : 'error');
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setLogLines((prev) => [...prev, `\n❌ ${err.message}\n`]);
      setStatus('error');
    }
  }, [form, toast, logLines]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
          Import Google Photos Album
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Scrapes a shared Google Photos link, uploads photos to Firebase Storage,
          and indexes them in Firestore — all from your browser.
        </p>
      </div>

      {/* Environment warning */}
      <div className="flex gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-800 dark:text-amber-300">
        <AlertTriangle className="shrink-0 mt-0.5" size={16} />
        <div>
          <strong>Dev container / local server only.</strong>{' '}
          This import runs a headless Chromium browser (Playwright) on the server.
          It will not work on Vercel or any serverless host — use the CLI instead:
          <code className="block mt-1.5 px-2 py-1 bg-amber-100 dark:bg-amber-900/40 rounded text-xs break-all">
            npx tsx scripts/import-google-photos.ts --url &quot;https://photos.app.goo.gl/…&quot;
          </code>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        {/* URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Google Photos URL <span className="text-cranberry">*</span>
          </label>
          <Input
            type="url"
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            placeholder="https://photos.app.goo.gl/…"
            disabled={status === 'running'}
            required
          />
          {form.url && !/^https:\/\/photos\.app\.goo\.gl\/[A-Za-z0-9]+$/.test(form.url.trim()) && (
            <p className="text-xs text-red-500 mt-1">
              Must be a Google Photos shared album link: <code>https://photos.app.goo.gl/…</code>
            </p>
          )}
        </div>

        {/* Title + Slug */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Title <span className="text-gray-400 font-normal">(auto-derived if blank)</span>
            </label>
            <Input
              value={form.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Spring Gala 2026"
              disabled={status === 'running'}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Slug <span className="text-gray-400 font-normal">(auto-derived from title)</span>
            </label>
            <Input
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder="spring-gala-2026"
              disabled={status === 'running'}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Description <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="A short description of the album…"
            rows={2}
            disabled={status === 'running'}
            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cranberry/40 focus:border-cranberry resize-none disabled:opacity-60"
          />
        </div>

        {/* Options row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {/* Public toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.isPublic}
              onChange={(e) => setForm((f) => ({ ...f, isPublic: e.target.checked }))}
              disabled={status === 'running'}
              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-cranberry accent-cranberry"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Public album</span>
          </label>

          {/* Preview count */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
              Preview photos
            </label>
            <input
              type="number"
              min={0}
              max={20}
              value={form.previewCount}
              onChange={(e) => setForm((f) => ({ ...f, previewCount: Number(e.target.value) }))}
              disabled={status === 'running'}
              className="w-14 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-center text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cranberry/40 disabled:opacity-60"
            />
          </div>

          {/* Dry run */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.dryRun}
              onChange={(e) => setForm((f) => ({ ...f, dryRun: e.target.checked }))}
              disabled={status === 'running'}
              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-cranberry accent-cranberry"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Dry run (no uploads)</span>
          </label>
        </div>

        {/* Featured photos row */}
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
              disabled={status === 'running'}
              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-cranberry accent-cranberry"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Mark featured photos (homepage carousel)</span>
          </label>
          {form.featured && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Count:</span>
              <input
                type="number"
                min={1}
                max={10}
                value={form.featuredCount}
                onChange={(e) => setForm((f) => ({ ...f, featuredCount: Number(e.target.value) }))}
                disabled={status === 'running'}
                className="w-14 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-center text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cranberry/40 disabled:opacity-60"
              />
            </div>
          )}
        </div>

        {/* Submit / Cancel */}
        <div className="flex items-center gap-3 pt-1">
          {status === 'running' ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => { abortRef.current?.abort(); setStatus('error'); }}
            >
              Cancel
            </Button>
          ) : (
            <Button type="submit" disabled={!form.url.trim()}>
              <Upload size={15} className="mr-1.5" />
              {form.dryRun ? 'Preview (dry run)' : 'Import Album'}
            </Button>
          )}

          {status !== 'idle' && (
            <button
              type="button"
              onClick={handleReset}
              className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1"
            >
              <RotateCcw size={13} /> Reset
            </button>
          )}

          {status === 'running' && (
            <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <Spinner size="sm" /> Importing…
            </span>
          )}
          {status === 'success' && (
            <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 size={15} /> Done
            </span>
          )}
          {status === 'error' && (
            <span className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
              <XCircle size={15} /> Failed — check log below
            </span>
          )}
        </div>
      </form>

      {/* Live log output */}
      {logLines.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Import log
          </p>
          <pre
            ref={logRef}
            className="bg-gray-950 text-green-400 text-xs font-mono rounded-2xl p-4 overflow-y-auto max-h-[420px] whitespace-pre-wrap break-all leading-relaxed"
          >
            {logLines.join('')}
            {status === 'running' && (
              <span className="inline-block w-2 h-3.5 bg-green-400 ml-0.5 animate-pulse" />
            )}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
