'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { useAuth } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import { ExternalLink, Upload, RotateCcw, CheckCircle2, XCircle, Github } from 'lucide-react';
import { getFirebaseDb } from '@/lib/firebase/client';

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

type ImportStatus = 'idle' | 'pending' | 'running' | 'success' | 'error';
type ImportMode   = 'actions' | 'local' | null;

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

  const [status, setStatus]   = useState<ImportStatus>('idle');
  const [mode, setMode]       = useState<ImportMode>(null);
  const [jobId, setJobId]     = useState<string | null>(null);
  const [logText, setLogText] = useState('');
  const logRef        = useRef<HTMLPreElement>(null);
  const unsubRef      = useRef<(() => void) | null>(null);

  // Redirect unauthenticated users — the API route enforces role check
  useEffect(() => {
    if (!loading && !user) router.push('/portal/login');
  }, [user, loading, router]);

  // Auto-scroll log to bottom whenever it grows
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logText]);

  // Clean up Firestore listener on unmount
  useEffect(() => () => { unsubRef.current?.(); }, []);

  // Derive slug from title automatically
  const handleTitleChange = useCallback((value: string) => {
    setForm((f) => ({
      ...f,
      title: value,
      slug: f.slug === '' || f.slug === slugify(f.title) ? slugify(value) : f.slug,
    }));
  }, []);

  const handleReset = useCallback(() => {
    unsubRef.current?.();
    unsubRef.current = null;
    setStatus('idle');
    setMode(null);
    setJobId(null);
    setLogText('');
    setForm({ url: '', title: '', slug: '', description: '', isPublic: true, previewCount: 6, featured: false, featuredCount: 3, dryRun: false });
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.url.trim()) { toast('Paste a Google Photos album URL first.', 'error'); return; }

    // Unsubscribe from any previous job
    unsubRef.current?.();
    unsubRef.current = null;

    setStatus('pending');
    setLogText('⏳ Submitting import request…\n');

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
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const { jobId: id, mode: importMode } = await res.json() as { jobId: string; mode: ImportMode };
      setJobId(id);
      setMode(importMode);
      setLogText(importMode === 'actions'
        ? '⏳ Waiting for GitHub Actions runner to pick up the job…\n'
        : '⏳ Waiting for local import process to start…\n');

      // Subscribe to the Firestore job doc for live log updates
      const db = getFirebaseDb();
      const unsub = onSnapshot(doc(db, 'import_jobs', id), (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();

        // Show log text (grows as the script runs)
        if (data.logText) setLogText(data.logText);

        // Sync status
        if (data.status === 'running' && status !== 'running') setStatus('running');
        if (data.status === 'done')  { setStatus('success'); unsub(); unsubRef.current = null; }
        if (data.status === 'error') { setStatus('error');   unsub(); unsubRef.current = null; }
      });

      unsubRef.current = unsub;

    } catch (err: any) {
      setLogText((t) => t + `\n❌ ${err.message}\n`);
      setStatus('error');
    }
  }, [form, toast, status]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><Spinner size="lg" /></div>;
  }

  const isRunning = status === 'pending' || status === 'running';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
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

      {/* Mode banner — shown after a job starts */}
      {mode === 'actions' && (
        <div className="flex gap-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 text-sm text-blue-800 dark:text-blue-300">
          <Github className="shrink-0 mt-0.5" size={16} />
          <div>
            <strong>Running via GitHub Actions.</strong>{' '}
            A runner is executing the import in the background — log updates appear below as they happen.
            {jobId && (
              <a
                href={`https://github.com/${process.env.NEXT_PUBLIC_GITHUB_OWNER ?? ''}/${process.env.NEXT_PUBLIC_GITHUB_REPO ?? ''}/actions`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 mt-1.5 text-blue-600 dark:text-blue-400 hover:underline text-xs"
              >
                View full Actions log <ExternalLink size={11} />
              </a>
            )}
          </div>
        </div>
      )}

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
            disabled={isRunning}
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
            <Input value={form.title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Spring Gala 2026" disabled={isRunning} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Slug <span className="text-gray-400 font-normal">(auto-derived from title)</span>
            </label>
            <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="spring-gala-2026" disabled={isRunning} />
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
            disabled={isRunning}
            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cranberry/40 focus:border-cranberry resize-none disabled:opacity-60"
          />
        </div>

        {/* Options row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm((f) => ({ ...f, isPublic: e.target.checked }))} disabled={isRunning} className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-cranberry accent-cranberry" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Public album</span>
          </label>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">Preview photos</label>
            <input type="number" min={0} max={20} value={form.previewCount} onChange={(e) => setForm((f) => ({ ...f, previewCount: Number(e.target.value) }))} disabled={isRunning} className="w-14 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-center text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cranberry/40 disabled:opacity-60" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.dryRun} onChange={(e) => setForm((f) => ({ ...f, dryRun: e.target.checked }))} disabled={isRunning} className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-cranberry accent-cranberry" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Dry run (no uploads)</span>
          </label>
        </div>

        {/* Featured photos */}
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.featured} onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))} disabled={isRunning} className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-cranberry accent-cranberry" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Mark featured photos (homepage carousel)</span>
          </label>
          {form.featured && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Count:</span>
              <input type="number" min={1} max={10} value={form.featuredCount} onChange={(e) => setForm((f) => ({ ...f, featuredCount: Number(e.target.value) }))} disabled={isRunning} className="w-14 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-center text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cranberry/40 disabled:opacity-60" />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" disabled={isRunning || !form.url.trim()}>
            <Upload size={15} className="mr-1.5" />
            {form.dryRun ? 'Preview (dry run)' : 'Import Album'}
          </Button>

          {status !== 'idle' && (
            <button type="button" onClick={handleReset} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1">
              <RotateCcw size={13} /> Reset
            </button>
          )}

          {isRunning && <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400"><Spinner size="sm" /> {status === 'pending' ? 'Queued…' : 'Importing…'}</span>}
          {status === 'success' && <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400"><CheckCircle2 size={15} /> Done</span>}
          {status === 'error'   && <span className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400"><XCircle size={15} /> Failed — see log</span>}
        </div>
      </form>

      {/* Live log console */}
      {logText && (
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Import log
          </p>
          <pre
            ref={logRef}
            className="bg-gray-950 text-green-400 text-xs font-mono rounded-2xl p-4 overflow-y-auto max-h-[420px] whitespace-pre-wrap break-all leading-relaxed"
          >
            {logText}
            {isRunning && <span className="inline-block w-2 h-3.5 bg-green-400 ml-0.5 animate-pulse" />}
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
