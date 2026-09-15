'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { toPlainText } from '@/lib/utils/format';

interface SearchResult {
  title: string;
  href: string;
  type: 'page' | 'event' | 'article';
  description?: string;
}

// Static pages always available
const staticPages: SearchResult[] = [
  { title: 'Home', href: '/', type: 'page' },
  { title: 'About', href: '/about', type: 'page' },
  { title: 'Events', href: '/events', type: 'page' },
  { title: 'News & Stories', href: '/news', type: 'page' },
  { title: 'Gallery', href: '/gallery', type: 'page' },
  { title: 'Leadership', href: '/leadership', type: 'page' },
  { title: 'Membership', href: '/membership', type: 'page' },
  { title: 'FAQ', href: '/faq', type: 'page' },
  { title: 'Contact', href: '/contact', type: 'page' },
  { title: 'Donate', href: '/donate', type: 'page' },
  { title: 'Member Portal', href: '/portal/login', type: 'page' },
];

export default function SearchModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [dynamicResults, setDynamicResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Load dynamic data once on first open
  useEffect(() => {
    if (!open || loaded) return;
    (async () => {
      try {
        const [eventsRes, newsRes] = await Promise.all([
          fetch('/api/events').then((r) => r.json()).catch(() => []),
          fetch('/api/news').then((r) => r.json()).catch(() => []),
        ]);
        const items: SearchResult[] = [];
        if (Array.isArray(eventsRes)) {
          eventsRes.forEach((e: any) =>
            items.push({ title: e.title, href: `/events/${e.slug}`, type: 'event', description: toPlainText(e.description).slice(0, 80) })
          );
        }
        if (Array.isArray(newsRes)) {
          newsRes.forEach((a: any) =>
            items.push({ title: a.title, href: `/news/${a.slug}`, type: 'article', description: a.excerpt?.slice(0, 80) })
          );
        }
        setDynamicResults(items);
        setLoaded(true);
      } catch {
        setLoaded(true);
      }
    })();
  }, [open, loaded]);

  // Filter results
  useEffect(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      setResults(staticPages);
      setSelectedIndex(0);
      return;
    }
    const all = [...staticPages, ...dynamicResults];
    const filtered = all.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
    );
    setResults(filtered);
    setSelectedIndex(0);
  }, [query, dynamicResults]);

  // Autofocus
  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const navigate = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router]
  );

  // Keyboard
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        navigate(results[selectedIndex].href);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, results, selectedIndex, navigate, onClose]);

  if (!open) return null;

  const typeIcons: Record<string, string> = {
    page: '📄',
    event: '📅',
    article: '📰',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <svg aria-hidden="true" className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, events, news..."
            className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 outline-none text-sm"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto py-2">
          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400">No results found.</p>
          ) : (
            results.map((result, i) => (
              <button
                key={result.href}
                onClick={() => navigate(result.href)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                  i === selectedIndex
                    ? 'bg-cranberry-50 dark:bg-cranberry-900/20 text-cranberry'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                )}
              >
                <span className="text-base">{typeIcons[result.type] || '📄'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{result.title}</p>
                  {result.description && (
                    <p className="text-xs text-gray-400 truncate">{result.description}</p>
                  )}
                </div>
                <span className="text-[10px] uppercase tracking-wider text-gray-400 shrink-0">{result.type}</span>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-800 flex items-center gap-4 text-[10px] text-gray-400">
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span>ESC Close</span>
        </div>
      </div>
    </div>
  );
}
