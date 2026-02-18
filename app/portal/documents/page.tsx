'use client';

import { useState, useRef, useMemo } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { useDocuments, apiDelete, apiPatch } from '@/hooks/useFirestore';
import { useToast } from '@/components/ui/Toast';
import { uploadFile, validateFile } from '@/lib/firebase/upload';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db as getDb } from '@/lib/firebase/client';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import SearchInput from '@/components/ui/SearchInput';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import Tabs from '@/components/ui/Tabs';
import type { PortalDocument, DocumentCategory } from '@/types';
import { DOCUMENT_CATEGORIES } from '@/types';

// ── Visual config ────────────────────────────────────────────────
const categoryMeta: Record<DocumentCategory, { color: 'cranberry' | 'azure' | 'gold' | 'green' | 'gray'; icon: string; description: string }> = {
  Minutes:        { color: 'azure',     icon: '📋', description: 'Board & general meeting minutes' },
  Policies:       { color: 'cranberry', icon: '📜', description: 'Club policies and procedures' },
  Bylaws:         { color: 'cranberry', icon: '⚖️', description: 'Club bylaws and amendments' },
  Handbook:       { color: 'gold',      icon: '📖', description: 'Member handbooks and guides' },
  Reports:        { color: 'green',     icon: '📊', description: 'Monthly / annual reports' },
  Financial:      { color: 'gold',      icon: '💰', description: 'Budgets, treasurer reports, receipts' },
  Templates:      { color: 'gray',      icon: '📝', description: 'Reusable form & letter templates' },
  'Google Drive': { color: 'azure',     icon: '🔗', description: 'Shared Google Drive folders' },
  Other:          { color: 'gray',      icon: '📄', description: 'Miscellaneous documents' },
};

// ── Helpers ──────────────────────────────────────────────────────
/** Convert a normal Google Drive share link to an embeddable preview URL */
function toGDriveEmbedUrl(url: string): string | null {
  // Folder: https://drive.google.com/drive/folders/<ID>?…
  const folderMatch = url.match(/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return `https://drive.google.com/embeddedfolderview?id=${folderMatch[1]}#list`;
  // File: https://drive.google.com/file/d/<ID>/…
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  // Docs / Sheets / Slides
  const docsMatch = url.match(/(docs|spreadsheets|presentation)\.google\.com\/.*\/d\/([a-zA-Z0-9_-]+)/);
  if (docsMatch) return url.replace(/\/edit.*/, '/preview');
  return null;
}

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return ''; }
}

// ── Page ─────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const { member } = useAuth();
  const { toast } = useToast();
  const { data: rawDocs, loading } = useDocuments();
  const docs = rawDocs as PortalDocument[];

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [expandedDrive, setExpandedDrive] = useState<string | null>(null);
  const [uploadForm, setUploadForm] = useState<{
    title: string;
    category: DocumentCategory;
    description: string;
    linkURL: string;
  }>({ title: '', category: 'Minutes', description: '', linkURL: '' });
  const fileRef = useRef<HTMLInputElement>(null);

  const isBoardOrAbove = member?.role === 'board' || member?.role === 'president' || member?.role === 'treasurer';

  // ── Filtering ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = docs;
    if (activeTab !== 'all') list = list.filter((d) => d.category === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.category?.toLowerCase().includes(q) ||
          d.description?.toLowerCase().includes(q) ||
          d.uploadedByName?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [docs, activeTab, search]);

  const pinned = useMemo(() => filtered.filter((d) => d.pinned), [filtered]);
  const unpinned = useMemo(() => filtered.filter((d) => !d.pinned), [filtered]);

  // Group unpinned by category (for the "All" tab)
  const grouped = useMemo(() => {
    const map = new Map<string, PortalDocument[]>();
    unpinned.forEach((d) => {
      const cat = d.category || 'Other';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(d);
    });
    return map;
  }, [unpinned]);

  // Build tab list with counts
  const tabs = useMemo(() => {
    const counts = new Map<string, number>();
    docs.forEach((d) => counts.set(d.category, (counts.get(d.category) || 0) + 1));
    const items = [{ id: 'all', label: 'All', count: docs.length }];
    DOCUMENT_CATEGORIES.forEach((cat) => {
      const c = counts.get(cat);
      if (c) items.push({ id: cat, label: cat, count: c });
    });
    return items;
  }, [docs]);

  // ── Upload handler ─────────────────────────────────────────────
  const handleUpload = async () => {
    if (!member || !uploadForm.title.trim()) return;

    const isLink = uploadForm.category === 'Google Drive' || uploadForm.linkURL.trim();
    const file = fileRef.current?.files?.[0];

    if (!isLink && !file) { toast('Please select a file or enter a link.', 'error'); return; }

    if (file) {
      const err = validateFile(file, { maxSizeMB: 25, allowedTypes: ['application/pdf', 'application/vnd', 'text/', 'image/'] });
      if (err) { toast(err, 'error'); return; }
    }

    setUploading(true);
    try {
      let fileURL = '';
      let storagePath = '';

      if (file) {
        const result = await uploadFile(file, 'documents', undefined, setUploadProgress);
        fileURL = result.url;
        storagePath = result.path;
      }

      await addDoc(collection(getDb(), 'documents'), {
        title: uploadForm.title.trim(),
        description: uploadForm.description.trim() || null,
        category: uploadForm.category,
        ...(fileURL ? { fileURL, storagePath } : {}),
        ...(uploadForm.linkURL.trim() ? { linkURL: uploadForm.linkURL.trim() } : {}),
        pinned: false,
        uploadedBy: member.id,
        uploadedByName: member.displayName,
        createdAt: serverTimestamp(),
      });
      toast('Document uploaded!');
      setShowUpload(false);
      setUploadForm({ title: '', category: 'Minutes', description: '', linkURL: '' });
      if (fileRef.current) fileRef.current.value = '';
    } catch (e: any) {
      toast(e.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // ── Actions ────────────────────────────────────────────────────
  const handleDelete = async (docId: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      await apiDelete(`/api/portal/documents?id=${docId}`);
      toast('Document deleted.');
    } catch (err: any) {
      toast(err.message || 'Failed to delete', 'error');
    }
  };

  const handleTogglePin = async (doc: PortalDocument) => {
    try {
      await apiPatch(`/api/portal/documents`, { id: doc.id, pinned: !doc.pinned });
      toast(doc.pinned ? 'Unpinned.' : 'Pinned to top!');
    } catch (err: any) {
      toast(err.message || 'Failed to update', 'error');
    }
  };

  // ── Render a single document row ──────────────────────────────
  const renderDocRow = (doc: PortalDocument) => {
    const meta = categoryMeta[doc.category as DocumentCategory] || categoryMeta.Other;
    const url = doc.fileURL || doc.linkURL;
    const isGDrive = doc.category === 'Google Drive' && doc.linkURL;
    const embedUrl = isGDrive ? toGDriveEmbedUrl(doc.linkURL!) : null;

    return (
      <div key={doc.id}>
        <Card interactive padding="md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 text-lg">
                {meta.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {doc.pinned && <span className="text-xs" title="Pinned">📌</span>}
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{doc.title}</h3>
                </div>
                {doc.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{doc.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant={meta.color}>{doc.category}</Badge>
                  <span className="text-xs text-gray-400">{doc.uploadedByName}</span>
                  {doc.createdAt && <span className="text-xs text-gray-400">· {formatDate(doc.createdAt)}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Google Drive preview toggle */}
              {embedUrl && (
                <button
                  onClick={() => setExpandedDrive(expandedDrive === doc.id ? null : doc.id)}
                  className="p-2 rounded-lg text-gray-400 hover:text-azure-600 hover:bg-azure-50 dark:hover:bg-azure-900/10 transition-colors"
                  title="Preview in page"
                >
                  {expandedDrive === doc.id ? '🔽' : '▶️'}
                </button>
              )}
              {url && (
                <a href={url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg text-gray-400 hover:text-cranberry hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" title={doc.fileURL ? 'Download' : 'Open link'}>
                  {doc.fileURL ? '⬇️' : '🔗'}
                </a>
              )}
              {isBoardOrAbove && (
                <>
                  <button onClick={() => handleTogglePin(doc)} className="p-2 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors" title={doc.pinned ? 'Unpin' : 'Pin to top'}>
                    {doc.pinned ? '📌' : '📍'}
                  </button>
                  <button onClick={() => handleDelete(doc.id)} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors" title="Delete">
                    🗑️
                  </button>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Google Drive inline embed */}
        {embedUrl && expandedDrive === doc.id && (
          <div className="mt-1 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <iframe src={embedUrl} className="w-full h-[500px] bg-white" title={doc.title} allow="autoplay" />
          </div>
        )}
      </div>
    );
  };

  // ── Render a category group ────────────────────────────────────
  const renderCategoryGroup = (category: string, items: PortalDocument[]) => {
    const meta = categoryMeta[category as DocumentCategory] || categoryMeta.Other;
    return (
      <div key={category} className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <span className="text-lg">{meta.icon}</span>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{category}</h2>
          <span className="text-xs text-gray-400">({items.length})</span>
          <span className="text-xs text-gray-400 hidden sm:inline ml-1">— {meta.description}</span>
        </div>
        <div className="space-y-2">{items.map(renderDocRow)}</div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Documents</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Meeting minutes, bylaws, handbooks, reports &amp; shared Google Drive folders.
          </p>
        </div>
        {isBoardOrAbove && (
          <Button onClick={() => setShowUpload(!showUpload)}>{showUpload ? 'Cancel' : '+ Upload'}</Button>
        )}
      </div>

      {/* Upload form */}
      {showUpload && (
        <Card padding="md">
          <h3 className="font-display font-bold text-gray-900 dark:text-white mb-4">Upload Document</h3>
          <div className="space-y-4">
            <Input
              label="Title"
              required
              value={uploadForm.title}
              onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
              placeholder="e.g., Board Meeting Minutes — Feb 2026"
            />

            <Input
              label="Description (optional)"
              value={uploadForm.description}
              onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
              placeholder="Brief description of the document"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
              <select
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cranberry-500/20 focus:border-cranberry-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                value={uploadForm.category}
                onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value as DocumentCategory })}
              >
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {categoryMeta[cat].icon} {cat} — {categoryMeta[cat].description}
                  </option>
                ))}
              </select>
            </div>

            {/* If Google Drive or user wants to paste a link */}
            {uploadForm.category === 'Google Drive' ? (
              <Input
                label="Google Drive URL"
                required
                value={uploadForm.linkURL}
                onChange={(e) => setUploadForm({ ...uploadForm, linkURL: e.target.value })}
                placeholder="https://drive.google.com/drive/folders/..."
              />
            ) : (
              <>
                <Input
                  label="Link URL (optional — use instead of file)"
                  value={uploadForm.linkURL}
                  onChange={(e) => setUploadForm({ ...uploadForm, linkURL: e.target.value })}
                  placeholder="https://docs.google.com/document/d/..."
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">File</label>
                  <input
                    type="file"
                    ref={fileRef}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg"
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-cranberry-50 file:text-cranberry-700 hover:file:bg-cranberry-100 dark:file:bg-cranberry-900/20 dark:file:text-cranberry-300"
                  />
                </div>
              </>
            )}

            {uploading && (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-cranberry h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            )}
            <Button onClick={handleUpload} loading={uploading}>
              {uploadForm.category === 'Google Drive' ? 'Add Drive Link' : 'Upload'}
            </Button>
          </div>
        </Card>
      )}

      {/* Search + Category tabs */}
      <div className="space-y-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search documents..." className="max-w-sm" />
        <div className="overflow-x-auto -mx-1 px-1">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="📄"
          title="No documents found"
          description={
            search
              ? 'Try a different search term.'
              : activeTab !== 'all'
              ? `No ${activeTab} documents have been uploaded yet.`
              : 'No documents have been uploaded yet.'
          }
        />
      ) : (
        <div className="space-y-8">
          {/* Pinned docs */}
          {pinned.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className="text-lg">📌</span>
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Pinned</h2>
              </div>
              <div className="space-y-2">{pinned.map(renderDocRow)}</div>
            </div>
          )}

          {/* Categorised docs — grouped on "All" tab, flat on specific tab */}
          {activeTab === 'all' ? (
            Array.from(grouped.entries()).map(([cat, items]) => renderCategoryGroup(cat, items))
          ) : (
            <div className="space-y-2">{unpinned.map(renderDocRow)}</div>
          )}
        </div>
      )}
    </div>
  );
}
