'use client';

import { useState, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';

// ─── CSV template ────────────────────────────────────────────────────────────

const TEMPLATE_HEADERS = [
  'firstName',
  'lastName',
  'email',
  'status',
  'role',
  'memberType',
  'committee',
  'phone',
  'occupation',
  'employer',
  'linkedIn',
  'joinedAt',
  'birthday',
];

const TEMPLATE_EXAMPLE = [
  'Jane',
  'Smith',
  'jane.smith@example.com',
  'active',       // active | alumni | pending | inactive
  'member',       // member | board | treasurer | president
  'professional', // professional | student
  'Service',
  '+1 212-555-0100',
  'Product Manager',
  'Acme Corp',
  'https://linkedin.com/in/janesmith',
  '2023-09-01',  // YYYY-MM-DD
  '1995-07-15',  // YYYY-MM-DD
];

function downloadTemplate() {
  const rows = [TEMPLATE_HEADERS.join(','), TEMPLATE_EXAMPLE.join(',')];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'rotaract_members_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface ParsedRow {
  rowNum: number;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  role: string;
  memberType: string;
  committee: string;
  phone: string;
  occupation: string;
  employer: string;
  linkedIn: string;
  joinedAt: string;
  birthday: string;
  _errors: string[];
}

interface ImportResult {
  email: string;
  status: 'created' | 'skipped' | 'error';
  reason?: string;
}

interface ImportSummary {
  total: number;
  created: number;
  skipped: number;
  errors: number;
  results: ImportResult[];
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validateRow(row: Omit<ParsedRow, '_errors' | 'rowNum'>): string[] {
  const errors: string[] = [];
  if (!row.firstName?.trim()) errors.push('firstName required');
  if (!row.lastName?.trim()) errors.push('lastName required');
  if (!row.email?.trim()) errors.push('email required');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) errors.push('invalid email');
  if (row.status && !['pending', 'active', 'inactive', 'alumni', ''].includes(row.status))
    errors.push(`status must be active/alumni/pending/inactive`);
  if (row.role && !['member', 'board', 'treasurer', 'president', ''].includes(row.role))
    errors.push(`role must be member/board/treasurer/president`);
  return errors;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface ImportMembersModalProps {
  open: boolean;
  onClose: () => void;
  onImported?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ImportMembersModal({ open, onClose, onImported }: ImportMembersModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'preview' | 'results'>('upload');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState('');

  const reset = () => {
    setStep('upload');
    setRows([]);
    setSummary(null);
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // ── Parse the uploaded CSV ──────────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    setFileName(file.name);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      transform: (v) => v.trim(),
      complete: (result) => {
        if (result.errors.length && result.data.length === 0) {
          toast('Could not parse file. Make sure it is a valid CSV.', 'error');
          return;
        }

        const parsed: ParsedRow[] = result.data.map((raw, i) => {
          const row: ParsedRow = {
            rowNum: i + 2, // +2 because row 1 = header
            firstName: raw['firstName'] || raw['first_name'] || raw['First Name'] || '',
            lastName: raw['lastName'] || raw['last_name'] || raw['Last Name'] || '',
            email: raw['email'] || raw['Email'] || '',
            status: raw['status'] || raw['Status'] || 'active',
            role: raw['role'] || raw['Role'] || 'member',
            memberType: raw['memberType'] || raw['member_type'] || raw['Member Type'] || '',
            committee: raw['committee'] || raw['Committee'] || '',
            phone: raw['phone'] || raw['Phone'] || '',
            occupation: raw['occupation'] || raw['Occupation'] || '',
            employer: raw['employer'] || raw['Employer'] || '',
            linkedIn: raw['linkedIn'] || raw['linkedin'] || raw['LinkedIn'] || '',
            joinedAt: raw['joinedAt'] || raw['joined_at'] || raw['Join Date'] || '',
            birthday: raw['birthday'] || raw['Birthday'] || '',
            _errors: [],
          };
          row._errors = validateRow(row);
          return row;
        });

        if (parsed.length === 0) {
          toast('The file has no data rows.', 'error');
          return;
        }

        setRows(parsed);
        setStep('preview');
      },
      error: () => {
        toast('Failed to parse file.', 'error');
      },
    });
  }, [toast]);

  const validRows = rows.filter((r) => r._errors.length === 0);
  const invalidRows = rows.filter((r) => r._errors.length > 0);

  // ── Submit import ───────────────────────────────────────────────────────
  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch('/api/portal/members/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: validRows }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Import failed');
      }
      const data: ImportSummary = await res.json();
      setSummary(data);
      setStep('results');
      onImported?.();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Import failed', 'error');
    } finally {
      setImporting(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import Members"
      size="xl"
    >
      <div className="space-y-5">

        {/* ── Step: Upload ──────────────────────────────────────────────── */}
        {step === 'upload' && (
          <div className="space-y-5">
            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">How to use</p>
              <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-1 list-decimal list-inside">
                <li>Download the CSV template below.</li>
                <li>Fill it in with your members. You can do this in Excel or Google Sheets — just export/save as <strong>.csv</strong> when done.</li>
                <li>Upload the CSV file here.</li>
                <li>Review the preview, then click Import.</li>
              </ol>
            </div>

            {/* Column reference */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Column Reference</p>
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Column</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Required</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Allowed values</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {[
                      { col: 'firstName', req: true, vals: 'Any text' },
                      { col: 'lastName', req: true, vals: 'Any text' },
                      { col: 'email', req: true, vals: 'Valid email' },
                      { col: 'status', req: false, vals: 'active · alumni · pending · inactive  (default: active)' },
                      { col: 'role', req: false, vals: 'member · board · treasurer · president  (default: member)' },
                      { col: 'memberType', req: false, vals: 'professional · student' },
                      { col: 'committee', req: false, vals: 'Any text' },
                      { col: 'phone', req: false, vals: 'Any text' },
                      { col: 'occupation', req: false, vals: 'Any text' },
                      { col: 'employer', req: false, vals: 'Any text' },
                      { col: 'linkedIn', req: false, vals: 'URL' },
                      { col: 'joinedAt', req: false, vals: 'YYYY-MM-DD' },
                      { col: 'birthday', req: false, vals: 'YYYY-MM-DD' },
                    ].map(({ col, req, vals }) => (
                      <tr key={col} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-3 py-1.5 font-mono text-gray-800 dark:text-gray-200">{col}</td>
                        <td className="px-3 py-1.5">
                          {req
                            ? <span className="text-cranberry font-semibold">Yes</span>
                            : <span className="text-gray-400">No</span>}
                        </td>
                        <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">{vals}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download CSV Template
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 bg-cranberry text-white rounded-xl text-sm font-semibold hover:bg-cranberry-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" /></svg>
                Upload CSV File
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Preview ─────────────────────────────────────────────── */}
        {step === 'preview' && (
          <div className="space-y-4">
            {/* Summary bar */}
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg font-medium text-gray-700 dark:text-gray-300">
                📄 {fileName}
              </span>
              <span className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-lg font-medium">
                ✅ {validRows.length} valid
              </span>
              {invalidRows.length > 0 && (
                <span className="px-3 py-1.5 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-lg font-medium">
                  ❌ {invalidRows.length} with errors (will be skipped)
                </span>
              )}
            </div>

            {/* Invalid rows callout */}
            {invalidRows.length > 0 && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">Rows with errors (will not be imported)</p>
                <div className="space-y-0.5 max-h-28 overflow-y-auto">
                  {invalidRows.map((r) => (
                    <p key={r.rowNum} className="text-xs text-red-600 dark:text-red-400">
                      Row {r.rowNum} — {r.email || '(no email)'}: {r._errors.join(', ')}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Preview table */}
            <div className="overflow-x-auto max-h-72 rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                  <tr>
                    {['#', 'Name', 'Email', 'Status', 'Role', 'Committee', 'Occupation'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {rows.map((r) => (
                    <tr
                      key={r.rowNum}
                      className={r._errors.length > 0 ? 'bg-red-50/60 dark:bg-red-950/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'}
                    >
                      <td className="px-3 py-1.5 text-gray-400">{r.rowNum}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-gray-900 dark:text-white">{r.firstName} {r.lastName}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-gray-600 dark:text-gray-300">{r.email}</td>
                      <td className="px-3 py-1.5">{r.status || 'active'}</td>
                      <td className="px-3 py-1.5">{r.role || 'member'}</td>
                      <td className="px-3 py-1.5 text-gray-500">{r.committee || '—'}</td>
                      <td className="px-3 py-1.5 text-gray-500">{r.occupation || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Button variant="ghost" onClick={reset}>← Back</Button>
              <Button
                onClick={handleImport}
                disabled={importing || validRows.length === 0}
                className="gap-2"
              >
                {importing ? (
                  <><Spinner size="sm" /> Importing…</>
                ) : (
                  `Import ${validRows.length} Member${validRows.length !== 1 ? 's' : ''}`
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step: Results ─────────────────────────────────────────────── */}
        {step === 'results' && summary && (
          <div className="space-y-4">
            {/* Big summary */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-4">
                <p className="text-2xl font-display font-bold text-emerald-600 dark:text-emerald-400">{summary.created}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">Created</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4">
                <p className="text-2xl font-display font-bold text-amber-600 dark:text-amber-400">{summary.skipped}</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 font-medium">Skipped (duplicate)</p>
              </div>
              <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-4">
                <p className="text-2xl font-display font-bold text-red-600 dark:text-red-400">{summary.errors}</p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 font-medium">Errors</p>
              </div>
            </div>

            {/* Per-row result list */}
            <div className="overflow-x-auto max-h-64 rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Email</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Result</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {summary.results.map((r) => (
                    <tr key={r.email} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="px-3 py-1.5 font-mono text-gray-700 dark:text-gray-300">{r.email}</td>
                      <td className="px-3 py-1.5">
                        {r.status === 'created' && <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✅ Created</span>}
                        {r.status === 'skipped' && <span className="text-amber-600 dark:text-amber-400 font-semibold">⚠️ Skipped</span>}
                        {r.status === 'error' && <span className="text-red-600 dark:text-red-400 font-semibold">❌ Error</span>}
                      </td>
                      <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">{r.reason || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="ghost" onClick={reset}>Import Another File</Button>
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
