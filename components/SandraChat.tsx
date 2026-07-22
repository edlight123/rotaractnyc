'use client';

/**
 * Sandra — floating chat widget. Rendered on both the public site and the
 * member portal; the /api/sandra endpoint decides what Sandra may answer based
 * on the viewer's session (public / member / board), so this one component is
 * safe on either surface.
 */

import { useEffect, useRef, useState } from 'react';
import { useChat } from 'ai/react';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';

const SUGGESTIONS = [
  'How do I join the club?',
  'What events are coming up?',
  'What are the committees?',
];

/** Strip any stray Markdown the model emits — the chat renders plain text. */
const clean = (s: string) =>
  s
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^\s*[-*]\s+/gm, '• ');

/** Turn URLs and /portal paths into clickable links (chat renders plain text). */
const LINK_RE = /(https?:\/\/[^\s<>]+|\/portal\/[a-zA-Z0-9/_-]+)/g;
function renderRich(text: string): Array<string | JSX.Element> {
  const out: Array<string | JSX.Element> = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    let url = m[0];
    let trail = '';
    const t = url.match(/[.,!?;:)]+$/);
    if (t) { trail = t[0]; url = url.slice(0, -trail.length); }
    const external = url.startsWith('http');
    out.push(
      <a
        key={key++}
        href={url}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className="underline font-medium text-cranberry hover:text-cranberry-800 dark:text-cranberry-300 break-words"
      >
        {url}
      </a>,
    );
    if (trail) out.push(trail);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function SandraChat() {
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { messages, input, handleInputChange, handleSubmit, append, isLoading, error } = useChat({
    api: '/api/sandra',
  });

  // Auto-scroll to the latest message
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close Sandra' : 'Ask Sandra'}
        aria-expanded={open}
        className="fixed z-[60] bottom-[calc(env(safe-area-inset-bottom)+5rem)] right-4 lg:bottom-6 lg:right-6
                   flex items-center gap-2 rounded-full bg-cranberry text-white pl-4 pr-5 py-3
                   shadow-lg hover:bg-cranberry-800 hover:shadow-xl transition-all
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cranberry-500 focus-visible:ring-offset-2"
      >
        {open ? <X className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
        <span className="text-sm font-semibold">{open ? 'Close' : 'Ask Sandra'}</span>
      </button>

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Chat with Sandra"
          className="fixed z-[60] bottom-[calc(env(safe-area-inset-bottom)+9rem)] right-4 lg:bottom-24 lg:right-6
                     flex flex-col w-[min(24rem,calc(100vw-2rem))] h-[min(32rem,calc(100vh-12rem))]
                     rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900
                     shadow-2xl overflow-hidden animate-scale-in origin-bottom-right"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-cranberry-900 via-cranberry to-cranberry-800 text-white shrink-0">
            <div className="w-9 h-9 rounded-full bg-white/15 grid place-items-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold leading-tight">Sandra</p>
              <p className="text-[11px] text-white/75 leading-tight">Rotaract NYC assistant</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="ml-auto p-1.5 rounded-lg hover:bg-white/15 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin">
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-100 dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-800 dark:text-gray-200">
                  Hi! I’m Sandra, the club’s assistant. Ask me about joining, events, committees, or anything about Rotaract NYC.
                </div>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => append({ role: 'user', content: s })}
                      className="text-xs font-medium text-cranberry border border-cranberry/30 rounded-full px-3 py-1.5
                                 hover:bg-cranberry-50 dark:hover:bg-cranberry-900/20 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={
                    m.role === 'user'
                      ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-cranberry text-white px-3.5 py-2.5 text-sm whitespace-pre-wrap'
                      : 'max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-3.5 py-2.5 text-sm whitespace-pre-wrap'
                  }
                >
                  {m.role === 'user' ? m.content : renderRich(clean(m.content))}
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-tl-sm bg-gray-100 dark:bg-gray-800 px-3.5 py-3">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                Sandra couldn’t respond just now. Please try again, or email rotaractnewyorkcity@gmail.com.
              </div>
            )}
          </div>

          {/* Composer */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-gray-200 dark:border-gray-800 p-3 shrink-0">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Ask Sandra…"
              aria-label="Message Sandra"
              className="flex-1 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800
                         px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cranberry-500/30 focus:border-cranberry-500
                         dark:text-gray-100"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              aria-label="Send"
              className="w-10 h-10 shrink-0 grid place-items-center rounded-full bg-cranberry text-white
                         hover:bg-cranberry-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
