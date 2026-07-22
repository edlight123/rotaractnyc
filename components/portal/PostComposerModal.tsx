'use client';

import { useState, useRef, useEffect, useCallback, type ChangeEvent, type DragEvent } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { useToast } from '@/components/ui/Toast';
import { uploadFile, validateFile } from '@/lib/firebase/upload';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import type { PostType } from '@/types';

/* ─── Types ─── */
type Audience = 'all' | 'board';

interface PostComposerModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    content: string;
    type: PostType;
    imageURLs?: string[];
    linkURL?: string;
    audience: Audience;
  }) => Promise<void>;
}

interface ImageUpload {
  id: string;
  file: File;
  preview: string;
  progress: number;
  url?: string;
  error?: string;
}

/* ─── Constants ─── */
const MAX_CHARS = 1000;
const MAX_IMAGES = 4;
const DRAFT_KEY = 'rotaract-post-draft';

const POST_TYPES: { id: PostType; label: string; icon: string; activeClass: string }[] = [
  { id: 'text',         label: 'Update',       icon: '💬', activeClass: 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' },
  { id: 'announcement', label: 'Announcement', icon: '📢', activeClass: 'bg-cranberry text-white' },
  { id: 'spotlight',    label: 'Spotlight',     icon: '⭐', activeClass: 'bg-gold-600 text-white' },
];

const EMOJIS = [
  ['😀', '😄', '😁', '😅', '😂', '🙂', '😊', '🥰', '😍', '🤩', '😎', '🤔', '🤗', '🫡'],
  ['👍', '👏', '🙌', '🤝', '💪', '✊', '👋', '✌️', '🤞', '🫶'],
  ['❤️', '🧡', '💛', '💚', '💙', '💜', '💖', '💯', '❤️‍🔥'],
  ['🎉', '🏆', '🥇', '🎯', '🔥', '⭐', '💡', '📣', '☕', '🥂', '🎓', '🌍', '🙏'],
];

/* ─── Draft helpers (safe JSON, no fragile string splitting) ─── */
function loadDraft(): { content: string; postType: PostType; audience: Audience; linkURL: string } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (d && typeof d.content === 'string' && d.content.trim()) return d;
  } catch { /* corrupted — ignore */ }
  return null;
}

function saveDraft(content: string, postType: PostType, audience: Audience, linkURL: string) {
  try {
    if (!content.trim() && !linkURL.trim()) { localStorage.removeItem(DRAFT_KEY); return; }
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ content, postType, audience, linkURL }));
  } catch { /* quota — ignore */ }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}

/* ═══════════════════════════════════════════
   PostComposerModal
   ═══════════════════════════════════════════ */
export default function PostComposerModal({ open, onClose, onSubmit }: PostComposerModalProps) {
  const { member } = useAuth();
  const { toast } = useToast();

  // Core
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<PostType>('text');
  const [audience, setAudience] = useState<Audience>('all');
  const [posting, setPosting] = useState(false);

  // Attachments
  const [images, setImages] = useState<ImageUpload[]>([]);
  const [linkURL, setLinkURL] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);

  // UI
  const [showEmoji, setShowEmoji] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const draftTimer = useRef<ReturnType<typeof setTimeout>>();

  /* ── Draft: restore on open ── */
  useEffect(() => {
    if (!open) return;
    const draft = loadDraft();
    if (draft) {
      setContent(draft.content);
      setPostType(draft.postType || 'text');
      setAudience(draft.audience || 'all');
      setLinkURL(draft.linkURL || '');
      if (draft.linkURL) setShowLinkInput(true);
      toast('Draft restored', 'info');
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Draft: debounced auto-save ── */
  useEffect(() => {
    if (!open) return;
    clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => saveDraft(content, postType, audience, linkURL), 800);
    return () => clearTimeout(draftTimer.current);
  }, [open, content, postType, audience, linkURL]);

  /* ── Auto-resize textarea ── */
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.max(ta.scrollHeight, 120)}px`;
  }, [content]);

  /* ── Focus textarea when modal opens ── */
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => textareaRef.current?.focus({ preventScroll: true }), 120);
    return () => clearTimeout(t);
  }, [open]);

  /* ── Close emoji picker on click outside ── */
  useEffect(() => {
    if (!showEmoji) return;
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmoji]);

  /* ── Image upload ── */
  const processFiles = useCallback(async (files: FileList | File[]) => {
    const batch = Array.from(files).slice(0, MAX_IMAGES - images.length);
    if (!batch.length) return;

    const newImgs: ImageUpload[] = batch.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
    }));
    setImages((prev) => [...prev, ...newImgs].slice(0, MAX_IMAGES));

    for (const img of newImgs) {
      const err = validateFile(img.file, { maxSizeMB: 5, allowedTypes: ['image/'] });
      if (err) {
        setImages((prev) => prev.map((i) => (i.id === img.id ? { ...i, error: err, progress: 100 } : i)));
        continue;
      }
      try {
        const result = await uploadFile(img.file, 'post-attachments', undefined, (pct) => {
          setImages((prev) => prev.map((i) => (i.id === img.id ? { ...i, progress: pct } : i)));
        });
        setImages((prev) => prev.map((i) => (i.id === img.id ? { ...i, url: result.url, progress: 100 } : i)));
      } catch {
        setImages((prev) => prev.map((i) => (i.id === img.id ? { ...i, error: 'Upload failed', progress: 100 } : i)));
      }
    }
  }, [images.length]);

  const removeImage = (id: string) => {
    setImages((prev) => {
      const removed = prev.find((i) => i.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((i) => i.id !== id);
    });
  };

  /* ── Drag & drop ── */
  const onDragEnter = (e: DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = (e: DragEvent) => { e.preventDefault(); if (e.currentTarget === e.target) setDragging(false); };
  const onDragOver  = (e: DragEvent) => { e.preventDefault(); };
  const onDrop      = (e: DragEvent) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files); };

  /* ── Emoji insert at cursor ── */
  const insertEmoji = (emoji: string) => {
    const ta = textareaRef.current;
    const pos = ta?.selectionStart ?? content.length;
    const next = content.slice(0, pos) + emoji + content.slice(ta?.selectionEnd ?? pos);
    setContent(next);
    requestAnimationFrame(() => { ta?.focus(); ta?.setSelectionRange(pos + emoji.length, pos + emoji.length); });
  };

  /* ── Link handling ── */
  const confirmLink = () => {
    const val = linkURL.trim();
    if (!val) { setShowLinkInput(false); setLinkURL(''); return; }
    try {
      const url = new URL(val.startsWith('http') ? val : `https://${val}`);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
      setLinkURL(url.href);
      setShowLinkInput(false);
    } catch {
      toast('Enter a valid URL', 'error');
    }
  };
  const removeLink = () => { setLinkURL(''); setShowLinkInput(false); };

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!content.trim() || content.length > MAX_CHARS) return;
    if (images.some((i) => !i.url && !i.error)) {
      toast('Wait for images to finish uploading', 'warning');
      return;
    }

    const urls = images.filter((i) => i.url).map((i) => i.url!);
    let finalType = postType;
    if (finalType === 'text' && urls.length) finalType = 'image';
    if (finalType === 'text' && linkURL && !urls.length) finalType = 'link';

    setPosting(true);
    try {
      await onSubmit({
        content: content.trim(),
        type: finalType,
        imageURLs: urls.length ? urls : undefined,
        linkURL: linkURL || undefined,
        audience,
      });
      resetAll();
      clearDraft();
      onClose();
    } catch {
      toast('Failed to create post', 'error');
    } finally {
      setPosting(false);
    }
  };

  const resetAll = () => {
    setContent('');
    setPostType('text');
    setAudience('all');
    setLinkURL('');
    setShowLinkInput(false);
    setShowEmoji(false);
    images.forEach((i) => URL.revokeObjectURL(i.preview));
    setImages([]);
  };

  const handleClose = () => { setShowEmoji(false); setShowLinkInput(false); onClose(); };

  /* ── Derived ── */
  const charsLeft = MAX_CHARS - content.length;
  const isOverLimit = charsLeft < 0;
  const canSubmit = content.trim().length > 0 && !isOverLimit && !posting;
  const isBoardMember = member?.role === 'board' || member?.role === 'president' || member?.role === 'treasurer';

  /* ═══════════════════════════════════════════
     Render
     ═══════════════════════════════════════════ */
  return (
    <Modal open={open} onClose={handleClose} size="lg" noPadding>
      <div className="flex flex-col max-h-[85vh]">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-5 sm:px-6 pt-5 pb-4 shrink-0">
          <Avatar src={member?.photoURL} alt={member?.displayName || ''} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {member?.displayName || 'Member'}
            </p>
            {isBoardMember && (
              <button
                type="button"
                onClick={() => setAudience((a) => (a === 'all' ? 'board' : 'all'))}
                className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-cranberry dark:hover:text-cranberry-400 transition-colors mt-0.5"
              >
                {audience === 'all' ? (
                  <><GlobeIcon className="w-3 h-3" /> All Members</>
                ) : (
                  <><LockIcon className="w-3 h-3" /> Board Only</>
                )}
                <ChevronIcon className="w-2.5 h-2.5 opacity-50" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* ── Post type pills ── */}
        <div className="flex gap-1.5 px-5 sm:px-6 pb-3 shrink-0 overflow-x-auto scrollbar-none">
          {POST_TYPES.map((pt) => (
            <button
              key={pt.id}
              type="button"
              onClick={() => setPostType(pt.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                postType === pt.id
                  ? pt.activeClass + ' shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <span className="text-sm leading-none">{pt.icon}</span>{pt.label}
            </button>
          ))}
        </div>

        {/* ── Scrollable content area ── */}
        <div
          className="relative flex-1 min-h-0 overflow-y-auto px-5 sm:px-6"
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          {/* Drag overlay */}
          {dragging && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-cranberry-400 bg-cranberry-50/80 dark:bg-cranberry-900/30 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2 text-cranberry-600 dark:text-cranberry-400">
                <ImageIcon className="w-8 h-8" />
                <p className="text-sm font-semibold">Drop images here</p>
              </div>
            </div>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            data-autofocus
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              postType === 'announcement' ? 'Write your announcement…'
                : postType === 'spotlight' ? 'Recognize someone amazing…'
                : 'What would you like to share?'
            }
            className="w-full bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 text-[15px] leading-relaxed resize-none focus:outline-none min-h-[120px]"
            maxLength={MAX_CHARS + 50}
          />

          {/* Image grid */}
          {images.length > 0 && (
            <div className={`grid gap-2 pb-3 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {images.map((img) => (
                <div key={img.id} className="relative group rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-video">
                  <img src={img.preview} alt="" className="w-full h-full object-cover" />
                  {/* Upload spinner */}
                  {img.progress < 100 && !img.error && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    </div>
                  )}
                  {/* Error */}
                  {img.error && (
                    <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                      <p className="text-xs font-medium text-white bg-red-600 px-2 py-1 rounded-lg">{img.error}</p>
                    </div>
                  )}
                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-black/60 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-black/80 transition-all"
                    aria-label="Remove image"
                  >
                    <XIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Link preview */}
          {linkURL && !showLinkInput && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/60 mb-3 group">
              <div className="w-9 h-9 rounded-lg bg-azure-100 dark:bg-azure-900/30 flex items-center justify-center shrink-0">
                <LinkIcon className="w-4 h-4 text-azure-600 dark:text-azure-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">
                  {(() => { try { return new URL(linkURL).hostname.replace('www.', ''); } catch { return 'Link'; } })()}
                </p>
                <p className="text-xs text-gray-400 truncate">{linkURL}</p>
              </div>
              <button
                type="button"
                onClick={removeLink}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                aria-label="Remove link"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* ── Link URL input ── */}
        {showLinkInput && !linkURL && (
          <div className="px-5 sm:px-6 pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="url"
                  placeholder="Paste a URL…"
                  value={linkURL}
                  onChange={(e) => setLinkURL(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && confirmLink()}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cranberry/20 focus:border-cranberry-300 dark:focus:border-cranberry-700 transition-all"
                  autoFocus
                />
              </div>
              <Button size="sm" variant="secondary" onClick={confirmLink}>Add</Button>
              <button
                type="button"
                onClick={() => { setShowLinkInput(false); setLinkURL(''); }}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Footer toolbar ── */}
        <div className="border-t border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center justify-between px-5 sm:px-6 py-3">
            {/* Left: action buttons */}
            <div className="flex items-center gap-0.5 relative">
              {/* Images */}
              <ToolbarBtn
                icon={<ImageIcon className="w-5 h-5" />}
                label={images.length >= MAX_IMAGES ? `Max ${MAX_IMAGES} images` : 'Add images'}
                disabled={images.length >= MAX_IMAGES}
                onClick={() => fileInputRef.current?.click()}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  if (e.target.files) processFiles(e.target.files);
                  e.target.value = '';
                }}
              />

              {/* Link */}
              <ToolbarBtn
                icon={<LinkIcon className="w-5 h-5" />}
                label="Add link"
                active={!!linkURL || showLinkInput}
                onClick={() => linkURL ? removeLink() : setShowLinkInput(!showLinkInput)}
              />

              {/* Emoji */}
              <div className="relative" ref={emojiRef}>
                <ToolbarBtn
                  icon={<EmojiIcon className="w-5 h-5" />}
                  label="Add emoji"
                  active={showEmoji}
                  onClick={() => setShowEmoji(!showEmoji)}
                />
                {showEmoji && (
                  <div className="absolute bottom-full left-0 mb-2 w-[300px] sm:w-[340px] max-h-[240px] overflow-y-auto p-card shadow-2xl p-3 z-50 animate-scale-in origin-bottom-left">
                    {EMOJIS.map((row, ri) => (
                      <div key={ri} className="flex flex-wrap gap-0.5 mb-1.5 last:mb-0">
                        {row.map((emoji, ei) => (
                          <button
                            key={ei}
                            type="button"
                            onClick={() => insertEmoji(emoji)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-90"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2" />

              {/* Character counter */}
              <span className={`text-xs tabular-nums font-semibold ${
                isOverLimit ? 'text-red-500' : charsLeft <= 100 ? 'text-amber-600' : 'text-gray-400'
              }`}>
                {charsLeft}
              </span>
            </div>

            {/* Right: submit */}
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              loading={posting}
              className="!rounded-full !px-5 sm:!px-6"
            >
              Post
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Toolbar button ─── */
function ToolbarBtn({ icon, label, active, disabled, onClick }: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`p-2.5 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? 'text-cranberry bg-cranberry-50 dark:bg-cranberry-900/20'
          : 'text-gray-500 dark:text-gray-400 hover:text-cranberry hover:bg-cranberry-50 dark:hover:bg-cranberry-900/10'
      }`}
    >
      {icon}
    </button>
  );
}

/* ─── Icons ─── */
const XIcon = ({ className }: { className?: string }) => (
  <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
);

const ImageIcon = ({ className }: { className?: string }) => (
  <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
);

const LinkIcon = ({ className }: { className?: string }) => (
  <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.313a4.5 4.5 0 00-6.364 0L4.5 14.25m11.19-5.562l4.5-4.5a4.5 4.5 0 00-6.364-6.364l-4.5 4.5" /></svg>
);

const EmojiIcon = ({ className }: { className?: string }) => (
  <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" /></svg>
);

const GlobeIcon = ({ className }: { className?: string }) => (
  <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);

const LockIcon = ({ className }: { className?: string }) => (
  <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
);

const ChevronIcon = ({ className }: { className?: string }) => (
  <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
);
