'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { useDocuments, apiDelete } from '@/hooks/useFirestore';
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
import type { PortalDocument } from '@/types';

const categoryColors: Record<string, 'cranberry' | 'azure' | 'gold' | 'green' | 'gray'> = {
  Minutes: 'azure',
  Policies: 'cranberry',
  Handbook: 'gold',
  Reports: 'green',
};

export default function DocumentsPage() {
  const { member } = useAuth();
  const { toast } = useToast();
  const { data: docs, loading } = useDocuments();
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadForm, setUploadForm] = useState({ title: '', category: 'Minutes' });
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = (docs as PortalDocument[]).filter(
    (d) => d.title.toLowerCase().includes(search.toLowerCase()) || d.category?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !uploadForm.title.trim() || !member) return;

    const err = validateFile(file, { maxSizeMB: 25, allowedTypes: ['application/pdf', 'application/vnd', 'text/', 'image/'] });
    if (err) { toast(err, 'error'); return; }

    setUploading(true);
    try {
      const { url, path } = await uploadFile(file, 'documents', undefined, setUploadProgress);
      await addDoc(collection(getDb(), 'documents'), {
        title: uploadForm.title.trim(),
        category: uploadForm.category,
        fileURL: url,
        storagePath: path,
        uploadedBy: member.id,
        uploadedByName: member.displayName,
        createdAt: serverTimestamp(),
      });
      toast('Document uploaded!');
      setShowUpload(false);
      setUploadForm({ title: '', category: 'Minutes' });
      if (fileRef.current) fileRef.current.value = '';
    } catch (e: any) {
      toast(e.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const isBoardOrAbove = member?.role === 'board' || member?.role === 'president' || member?.role === 'treasurer';

  const handleDelete = async (docId: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      await apiDelete(`/api/portal/documents?id=${docId}`);
      toast('Document deleted.');
    } catch (err: any) {
      toast(err.message || 'Failed to delete', 'error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Documents</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Access meeting minutes, handbooks, and important club documents.</p>
        </div>
        {isBoardOrAbove && (
          <Button onClick={() => setShowUpload(!showUpload)}>{showUpload ? 'Cancel' : '+ Upload'}</Button>
        )}
      </div>

      {showUpload && (
        <Card padding="md">
          <h3 className="font-display font-bold text-gray-900 dark:text-white mb-4">Upload Document</h3>
          <div className="space-y-4">
            <Input label="Title" required value={uploadForm.title} onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })} placeholder="e.g., Meeting Minutes - February 2026" />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
              <select className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cranberry-500/20 focus:border-cranberry-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" value={uploadForm.category} onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}>
                <option value="Minutes">Minutes</option>
                <option value="Policies">Policies</option>
                <option value="Handbook">Handbook</option>
                <option value="Reports">Reports</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">File</label>
              <input type="file" ref={fileRef} accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-cranberry-50 file:text-cranberry-700 hover:file:bg-cranberry-100 dark:file:bg-cranberry-900/20 dark:file:text-cranberry-300" />
            </div>
            {uploading && (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-cranberry h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            )}
            <Button onClick={handleUpload} loading={uploading}>Upload</Button>
          </div>
        </Card>
      )}

      <SearchInput value={search} onChange={setSearch} placeholder="Search documents..." className="max-w-sm" />

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="📄" title="No documents found" description={search ? 'Try a different search.' : 'No documents have been uploaded yet.'} />
      ) : (
        <div className="space-y-3">
          {filtered.map((doc) => (
            <Card key={doc.id} interactive padding="md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">📄</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{doc.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={categoryColors[doc.category] || 'gray'}>{doc.category}</Badge>
                      <span className="text-xs text-gray-400">{doc.uploadedByName}</span>
                    </div>
                  </div>
                </div>
                {doc.fileURL && (
                  <div className="flex items-center gap-1">
                    <a href={doc.fileURL} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg text-gray-400 hover:text-cranberry hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" title="Download">⬇️</a>
                    {isBoardOrAbove && (
                      <button onClick={() => handleDelete(doc.id)} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors" title="Delete">🗑️</button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
