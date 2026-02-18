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
import type { PortalDocument, DocumentCategory } from '@/types';
import { DOCUMENT_CATEGORIES } from '@/types';
import {
  ClipboardList,
  ScrollText,
  Scale,
  BookOpen,
  BarChart3,
  DollarSign,
  FileText,
  FolderOpen,
  Folder,
  File,
  Pin,
  PinOff,
  Trash2,
  Download,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Upload,
  Link,
  Plus,
  Search,
  type LucideIcon,
} from 'lucide-react';

// ── Visual config ────────────────────────────────────────────────
const categoryMeta: Record<DocumentCategory, { color: 'cranberry' | 'azure' | 'gold' | 'green' | 'gray'; Icon: LucideIcon; description: string }> = {
  Minutes:        { color: 'azure',     Icon: ClipboardList, description: 'Board & general meeting minutes' },
  Policies:       { color: 'cranberry', Icon: ScrollText,    description: 'Club policies and procedures' },
  Bylaws:         { color: 'cranberry', Icon: Scale,         description: 'Club bylaws and amendments' },
  Handbook:       { color: 'gold',      Icon: BookOpen,      description: 'Member handbooks and guides' },
  Reports:        { color: 'green',     Icon: BarChart3,     description: 'Monthly / annual reports' },
  Financial:      { color: 'gold',      Icon: DollarSign,    description: 'Budgets, treasurer reports, receipts' },
  Templates:      { color: 'gray',      Icon: FileText,      description: 'Reusable form & letter templates' },
  'Google Drive': { color: 'azure',     Icon: FolderOpen,    description: 'Shared Google Drive folders' },
  Other:          { color: 'gray',      Icon: File,          description: 'Miscellaneous documents' },
};

const folderColorClasses: Record<string, { bg: string; text: string; border: string }> = {
  cranberry: { bg: 'bg-cranberry-50 dark:bg-cranberry-900/20', text: 'text-cranberry-600 dark:text-cranberry-400', border: 'border-cranberry-200 dark:border-cranberry-800' },
  azure:     { bg: 'bg-azure-50 dark:bg-azure-900/20',       text: 'text-azure-600 dark:text-azure-400',       border: 'border-azure-200 dark:border-azure-800' },
  gold:      { bg: 'bg-amber-50 dark:bg-amber-900/20',       text: 'text-amber-600 dark:text-amber-400',       border: 'border-amber-200 dark:border-amber-800' },
  green:     { bg: 'bg-emerald-50 dark:bg-emerald-900/20',   text: 'text-emerald-600 dark:text-emerald-400',   border: 'border-emerald-200 dark:border-emerald-800' },
  gray:      { bg: 'bg-gray-50 dark:bg-gray-800/50',         text: 'text-gray-500 dark:text-gray-400',         border: 'border-gray-200 dark:border-gray-700' },
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
  const [openFolder, setOpenFolder] = useState<DocumentCategory | null>(null);
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
    if (openFolder) list = list.filter((d) => d.category === openFolder);
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
  }, [docs, openFolder, search]);

  const pinned = useMemo(() => docs.filter((d) => d.pinned), [docs]);

  // Group docs by category with counts
  const folderCounts = useMemo(() => {
    const counts = new Map<DocumentCategory, number>();
    docs.forEach((d) => {
      const cat = (d.category || 'Other') as DocumentCategory;
      counts.set(cat, (counts.get(cat) || 0) + 1);
    });
    return counts;
  }, [docs]);

  // Categories that have docs (for folder view)
  const activeFolders = useMemo(() => {
    return DOCUMENT_CATEGORIES.filter((cat) => (folderCounts.get(cat) || 0) > 0);
  }, [folderCounts]);

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
    const DocIcon = meta.Icon;
    const colors = folderColorClasses[meta.color] || folderColorClasses.gray;
    const url = doc.fileURL || doc.linkURL;
    const isGDrive = doc.category === 'Google Drive' && doc.linkURL;
    const embedUrl = isGDrive ? toGDriveEmbedUrl(doc.linkURL!) : null;

    return (
      <div key={doc.id}>
        <Card interactive padding="md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4 min-w-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors.bg}`}>
                <DocIcon className={`w-5 h-5 ${colors.text}`} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {doc.pinned && <Pin className="w-3.5 h-3.5 text-amber-500" />}
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{doc.title}</h3>
                </div>
                {doc.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{doc.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {!openFolder && <Badge variant={meta.color}>{doc.category}</Badge>}
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
                  {expandedDrive === doc.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              )}
              {url && (
                <a href={url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg text-gray-400 hover:text-cranberry hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" title={doc.fileURL ? 'Download' : 'Open link'}>
                  {doc.fileURL ? <Download className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
                </a>
              )}
              {isBoardOrAbove && (
                <>
                  <button onClick={() => handleTogglePin(doc)} className="p-2 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors" title={doc.pinned ? 'Unpin' : 'Pin to top'}>
                    {doc.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                  </button>
                  <button onClick={() => handleDelete(doc.id)} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors" title="Delete">
                    <Trash2 className="w-4 h-4" />
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

  // ── Render a folder card ───────────────────────────────────────
  const renderFolderCard = (category: DocumentCategory) => {
    const meta = categoryMeta[category];
    const FolderIcon = meta.Icon;
    const colors = folderColorClasses[meta.color] || folderColorClasses.gray;
    const count = folderCounts.get(category) || 0;

    return (
      <button
        key={category}
        onClick={() => { setOpenFolder(category); setSearch(''); }}
        className={`group relative flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all hover:shadow-md hover:scale-[1.02] ${colors.border} ${colors.bg} cursor-pointer text-left`}
      >
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colors.bg}`}>
          <Folder className={`w-8 h-8 ${colors.text}`} />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{category}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{count} {count === 1 ? 'document' : 'documents'}</p>
        </div>
        <ChevronRight className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:${colors.text} transition-colors`} />
      </button>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          {openFolder ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setOpenFolder(null); setSearch(''); }}
                className="p-2 -ml-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
                title="Back to folders"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <FolderOpen className={`w-5 h-5 ${(folderColorClasses[categoryMeta[openFolder].color] || folderColorClasses.gray).text}`} />
                  <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{openFolder}</h1>
                </div>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{categoryMeta[openFolder].description}</p>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Documents</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Meeting minutes, bylaws, handbooks, reports &amp; shared Google Drive folders.
              </p>
            </>
          )}
        </div>
        {isBoardOrAbove && (
          <Button onClick={() => setShowUpload(!showUpload)}>
            {showUpload ? 'Cancel' : <><Plus className="w-4 h-4 mr-1.5 inline" />Upload</>}
          </Button>
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
                    {cat} — {categoryMeta[cat].description}
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

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : !openFolder ? (
        /* ── Folder grid view ─────────────────────────── */
        <div className="space-y-8">
          {/* Pinned docs (always visible at root) */}
          {pinned.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Pin className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Pinned</h2>
              </div>
              <div className="space-y-2">{pinned.map(renderDocRow)}</div>
            </div>
          )}

          {/* Folders */}
          {activeFolders.length > 0 ? (
            <div>
              <div className="flex items-center gap-2 px-1 mb-4">
                <Folder className="w-4 h-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Folders</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {activeFolders.map(renderFolderCard)}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<File className="w-12 h-12" />}
              title="No documents yet"
              description="No documents have been uploaded yet."
            />
          )}
        </div>
      ) : (
        /* ── Open folder — list docs ─────────────────── */
        <div className="space-y-4">
          <SearchInput value={search} onChange={setSearch} placeholder={`Search in ${openFolder}...`} className="max-w-sm" />

          {filtered.length === 0 ? (
            <EmptyState
              icon={<FolderOpen className="w-12 h-12" />}
              title="No documents found"
              description={
                search
                  ? 'Try a different search term.'
                  : `No ${openFolder} documents have been uploaded yet.`
              }
            />
          ) : (
            <div className="space-y-2">{filtered.map(renderDocRow)}</div>
          )}
        </div>
      )}
    </div>
  );
}
