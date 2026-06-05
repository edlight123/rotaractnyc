'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Tabs from '@/components/ui/Tabs';

const ADMIN_ROLES = ['board', 'president'];

// ─── Types ───

interface WorkspaceStatus {
  configured: boolean;
  serviceAccountConfigured: boolean;
  oauthConfigured: boolean;
  enabled: boolean;
  calendarEnabled: boolean;
  sheetsEnabled: boolean;
  driveEnabled: boolean;
  calendarId: string | null;
  sheetId: string | null;
  driveFolderId: string | null;
  updatedAt: string | null;
}

const DEFAULT_STATUS: WorkspaceStatus = {
  configured: false,
  serviceAccountConfigured: false,
  oauthConfigured: false,
  enabled: false,
  calendarEnabled: false,
  sheetsEnabled: false,
  driveEnabled: false,
  calendarId: null,
  sheetId: null,
  driveFolderId: null,
  updatedAt: null,
};

// ─── Page ───

export default function GoogleWorkspacePage() {
  const { member, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [status, setStatus] = useState<WorkspaceStatus>(DEFAULT_STATUS);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Settings form state
  const [calendarId, setCalendarId] = useState('');
  const [sheetId, setSheetId] = useState('');
  const [driveFolderId, setDriveFolderId] = useState('');
  const [saving, setSaving] = useState(false);

  // Calendar sync state
  const [syncing, setSyncing] = useState(false);

  // Sheets export state
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState('all');
  const [lastExportUrl, setLastExportUrl] = useState('');

  // Drive state
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [driveFolders, setDriveFolders] = useState<any[]>([]);
  const [driveLoading, setDriveLoading] = useState(false);

  const hasAccess = member && ADMIN_ROLES.includes(member.role);

  // ─── Fetch Status ───

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/google/status');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setStatus(data);
      setCalendarId(data.calendarId || '');
      setSheetId(data.sheetId || '');
      setDriveFolderId(data.driveFolderId || '');
    } catch {
      toast('Failed to load Google Workspace status.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (hasAccess) fetchStatus();
  }, [hasAccess, fetchStatus]);

  // Check for OAuth callback params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'connected') {
      toast('Google Workspace connected successfully!', 'success');
      fetchStatus();
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('error')) {
      toast(`Connection failed: ${params.get('error')}`, 'error');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [toast, fetchStatus]);

  // ─── Save Settings ───

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/google/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendarId: calendarId.trim() || null,
          sheetId: sheetId.trim() || null,
          driveFolderId: driveFolderId.trim() || null,
          enabled: true,
          calendarEnabled: !!calendarId.trim(),
          sheetsEnabled: status.configured,
          driveEnabled: !!driveFolderId.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      toast('Settings saved successfully!', 'success');
      fetchStatus();
    } catch (err: any) {
      toast(err.message || 'Failed to save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ─── OAuth Connect ───

  const handleConnect = async () => {
    try {
      const res = await fetch('/api/google/connect');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to get consent URL');
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  // ─── Calendar Sync ───

  const handleCalendarSync = async (syncAll = true) => {
    setSyncing(true);
    try {
      const res = await fetch('/api/google/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncAll }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Sync failed');
      }

      const data = await res.json();
      toast(data.message, 'success');
      if (data.errors?.length) {
        toast(`${data.errors.length} event(s) had errors.`, 'error');
      }
    } catch (err: any) {
      toast(err.message || 'Calendar sync failed.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // ─── Sheets Export ───

  const handleSheetsExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/google/sheets/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exportType }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Export failed');
      }

      const data = await res.json();
      setLastExportUrl(data.url);
      toast(data.message, 'success');
    } catch (err: any) {
      toast(err.message || 'Export failed.', 'error');
    } finally {
      setExporting(false);
    }
  };

  // ─── Drive Files ───

  const fetchDriveFiles = useCallback(async (folderId?: string) => {
    setDriveLoading(true);
    try {
      const params = new URLSearchParams();
      if (folderId) params.set('folderId', folderId);
      const res = await fetch(`/api/google/drive/files?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setDriveFiles(data.files || []);
      setDriveFolders(data.folders || []);
    } catch {
      toast('Failed to load Drive files.', 'error');
    } finally {
      setDriveLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (activeTab === 'drive' && status.driveEnabled && status.driveFolderId) {
      fetchDriveFiles();
    }
  }, [activeTab, status.driveEnabled, status.driveFolderId, fetchDriveFiles]);

  // ─── Auth Guard ───

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Only board members and the president can manage Google Workspace settings.
          </p>
        </div>
      </div>
    );
  }

  // ─── Tabs ───

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'sheets', label: 'Sheets' },
    { id: 'drive', label: 'Drive' },
    { id: 'setup', label: 'Setup Guide' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
            Google Workspace
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Connect your club&apos;s Google Calendar, Sheets &amp; Drive.
          </p>
        </div>
        <div className="ml-auto">
          {status.configured ? (
            <Badge variant="green">Configured</Badge>
          ) : (
            <Badge variant="red">Not Configured</Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Loading */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800 h-32" />
          ))}
        </div>
      ) : (
        <>
          {/* ─── Overview Tab ─── */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Connection Status */}
              <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Connection Status</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatusCard
                      title="Service Account"
                      connected={status.serviceAccountConfigured}
                      description="Server-to-server API access"
                    />
                    <StatusCard
                      title="OAuth2 Client"
                      connected={status.oauthConfigured}
                      description="User-delegated access"
                    />
                    <StatusCard
                      title="Integration"
                      connected={status.enabled}
                      description={status.updatedAt ? `Updated ${new Date(status.updatedAt).toLocaleDateString()}` : 'Not yet enabled'}
                    />
                  </div>

                  {status.oauthConfigured && !status.enabled && (
                    <div className="pt-2">
                      <Button onClick={handleConnect} variant="azure">
                        Connect Google Account
                      </Button>
                    </div>
                  )}
                </div>
              </section>

              {/* Resource IDs */}
              <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Resource Configuration</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Enter the IDs of the Google resources to connect.
                  </p>
                </div>
                <div className="p-6 space-y-4">
                  <InputField
                    label="Google Calendar ID"
                    value={calendarId}
                    onChange={setCalendarId}
                    placeholder="your-calendar-id@group.calendar.google.com"
                    helpText="Found in Calendar Settings → Integrate Calendar → Calendar ID"
                  />
                  <InputField
                    label="Google Spreadsheet ID"
                    value={sheetId}
                    onChange={setSheetId}
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                    helpText="The long ID from the spreadsheet URL. Leave empty to auto-create."
                  />
                  <InputField
                    label="Google Drive Folder ID"
                    value={driveFolderId}
                    onChange={setDriveFolderId}
                    placeholder="1a2b3c4d5e6f7g8h9i0j"
                    helpText="The folder ID from the Drive URL. Share this folder with the service account email."
                  />

                  <div className="flex justify-end pt-2">
                    <Button onClick={handleSaveSettings} loading={saving}>
                      Save Configuration
                    </Button>
                  </div>
                </div>
              </section>

              {/* Quick Actions */}
              <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <ActionCard
                      title="Sync Calendar"
                      description="Push all events to Google Calendar"
                      icon="📅"
                      onClick={() => handleCalendarSync(true)}
                      loading={syncing}
                      disabled={!status.calendarEnabled || !status.calendarId}
                    />
                    <ActionCard
                      title="Export to Sheets"
                      description="Export club data to Google Sheets"
                      icon="📊"
                      onClick={handleSheetsExport}
                      loading={exporting}
                      disabled={!status.configured}
                    />
                    <ActionCard
                      title="Browse Drive"
                      description="View files in shared Drive folder"
                      icon="📁"
                      onClick={() => setActiveTab('drive')}
                      disabled={!status.driveEnabled || !status.driveFolderId}
                    />
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ─── Calendar Tab ─── */}
          {activeTab === 'calendar' && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Calendar Sync</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Sync portal events to your shared Google Calendar.
                    </p>
                  </div>
                  {status.calendarEnabled ? (
                    <Badge variant="green">Enabled</Badge>
                  ) : (
                    <Badge variant="gray">Disabled</Badge>
                  )}
                </div>
                <div className="p-6 space-y-4">
                  {!status.calendarId ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <p className="text-3xl mb-3">📅</p>
                      <p className="font-medium">No Calendar ID configured</p>
                      <p className="text-sm mt-1">Go to the Overview tab to set your Google Calendar ID.</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Calendar ID</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">{status.calendarId}</p>
                          </div>
                          <Badge variant="green">Connected</Badge>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">Sync Options</h3>
                        <div className="flex flex-wrap gap-3">
                          <Button
                            onClick={() => handleCalendarSync(true)}
                            loading={syncing}
                            variant="azure"
                          >
                            Sync All Events
                          </Button>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          This will push all published events to Google Calendar. Existing events will be updated, new ones created.
                        </p>
                      </div>

                      <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">How It Works</h3>
                        <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1.5">
                          <li className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">✓</span>
                            Events are matched by portal ID — no duplicates
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">✓</span>
                            Updated events in the portal are updated in Calendar
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">✓</span>
                            Cancelled events are marked cancelled in Calendar
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">✓</span>
                            Event descriptions include a link back to the portal
                          </li>
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* ─── Sheets Tab ─── */}
          {activeTab === 'sheets' && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Export to Google Sheets</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Export club data (members, dues, events, attendance) to a spreadsheet.
                    </p>
                  </div>
                  {status.configured ? (
                    <Badge variant="green">Ready</Badge>
                  ) : (
                    <Badge variant="gray">Not Configured</Badge>
                  )}
                </div>
                <div className="p-6 space-y-4">
                  {!status.configured ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <p className="text-3xl mb-3">📊</p>
                      <p className="font-medium">Google API not configured</p>
                      <p className="text-sm mt-1">Set up a service account or OAuth connection first.</p>
                    </div>
                  ) : (
                    <>
                      {/* Export type selector */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          What to export
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {[
                            { id: 'all', label: 'Everything', icon: '📦' },
                            { id: 'members', label: 'Members', icon: '👥' },
                            { id: 'dues', label: 'Dues', icon: '💳' },
                            { id: 'events', label: 'Events', icon: '📅' },
                            { id: 'attendance', label: 'Attendance', icon: '✅' },
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => setExportType(opt.id)}
                              className={`p-3 rounded-xl border text-center text-sm font-medium transition-all ${
                                exportType === opt.id
                                  ? 'border-azure bg-azure-50 text-azure-900 dark:bg-azure-900/20 dark:text-azure-300 dark:border-azure-700'
                                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                              }`}
                            >
                              <span className="text-lg block mb-1">{opt.icon}</span>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <Button
                          onClick={handleSheetsExport}
                          loading={exporting}
                          variant="azure"
                        >
                          Export Now
                        </Button>
                        {lastExportUrl && (
                          <a
                            href={lastExportUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-azure hover:text-azure-800 dark:hover:text-azure-300 underline"
                          >
                            Open Spreadsheet ↗
                          </a>
                        )}
                      </div>

                      {status.sheetId && (
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Current Spreadsheet</p>
                          <a
                            href={`https://docs.google.com/spreadsheets/d/${status.sheetId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-azure hover:underline font-mono mt-0.5 block"
                          >
                            {status.sheetId}
                          </a>
                        </div>
                      )}

                      <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Sheet Tabs</h3>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-400" />
                            Members — Full roster with contact info
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-400" />
                            Dues — Payment status per member per cycle
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-purple-400" />
                            Events — All events with metadata
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-400" />
                            Attendance — RSVPs &amp; check-ins
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* ─── Drive Tab ─── */}
          {activeTab === 'drive' && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Google Drive</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Browse and manage files in the shared club folder.
                    </p>
                  </div>
                  {status.driveEnabled ? (
                    <Badge variant="green">Connected</Badge>
                  ) : (
                    <Badge variant="gray">Not Configured</Badge>
                  )}
                </div>
                <div className="p-6">
                  {!status.driveFolderId ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <p className="text-3xl mb-3">📁</p>
                      <p className="font-medium">No Drive Folder configured</p>
                      <p className="text-sm mt-1">Go to the Overview tab to set your Google Drive Folder ID.</p>
                    </div>
                  ) : driveLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="animate-pulse flex gap-3 items-center">
                          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-800 rounded" />
                          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded flex-1" />
                          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Folders */}
                      {driveFolders.map((folder: any) => (
                        <a
                          key={folder.id}
                          href={folder.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 transition-colors"
                        >
                          <span className="text-xl">📁</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">
                            {folder.name}
                          </span>
                          <span className="text-xs text-gray-400">Folder</span>
                        </a>
                      ))}
                      {/* Files */}
                      {driveFiles.map((file: any) => (
                        <a
                          key={file.id}
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 transition-colors"
                        >
                          <span className="text-xl">{getFileIcon(file.mimeType)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {file.name}
                            </p>
                            {file.modifiedTime && (
                              <p className="text-xs text-gray-400">
                                Modified {new Date(file.modifiedTime).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          {file.size && (
                            <span className="text-xs text-gray-400">
                              {formatFileSize(Number(file.size))}
                            </span>
                          )}
                        </a>
                      ))}
                      {driveFiles.length === 0 && driveFolders.length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <p>No files found in this folder.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {status.driveFolderId && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                      <a
                        href={`https://drive.google.com/drive/folders/${status.driveFolderId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-azure hover:text-azure-800 dark:hover:text-azure-300 underline"
                      >
                        Open in Google Drive ↗
                      </a>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* ─── Setup Guide Tab ─── */}
          {activeTab === 'setup' && <SetupGuide />}
        </>
      )}
    </div>
  );
}

// ─── Sub-Components ───

function StatusCard({ title, connected, description }: { title: string; connected: boolean; description: string }) {
  return (
    <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/50">
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-600'}`} />
        <span className="text-sm font-medium text-gray-900 dark:text-white">{title}</span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
}

function ActionCard({
  title, description, icon, onClick, loading, disabled,
}: {
  title: string; description: string; icon: string;
  onClick: () => void; loading?: boolean; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-left hover:border-azure dark:hover:border-azure-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
    >
      <span className="text-2xl block mb-2">{icon}</span>
      <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-azure">
        {loading ? 'Working…' : title}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
    </button>
  );
}

function InputField({
  label, value, onChange, placeholder, helpText,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; helpText: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-azure focus:border-transparent font-mono"
      />
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{helpText}</p>
    </div>
  );
}

function SetupGuide() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Setup Guide</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Step-by-step instructions to connect Google Workspace.
          </p>
        </div>
        <div className="p-6 space-y-8">
          {/* Step 1 */}
          <SetupStep
            step={1}
            title="Create a Google Cloud Project"
            items={[
              'Go to console.cloud.google.com',
              'Create a new project (e.g. "Rotaract NYC Portal")',
              'Enable these APIs: Google Calendar API, Google Sheets API, Google Drive API',
              'Go to APIs & Services → Library and search for each one',
            ]}
          />

          {/* Step 2 */}
          <SetupStep
            step={2}
            title="Create a Service Account"
            items={[
              'Go to APIs & Services → Credentials',
              'Click "Create Credentials" → "Service Account"',
              'Name it (e.g. "rotaract-portal-sa")',
              'Click on the created service account → Keys tab',
              'Add Key → Create new key → JSON',
              'Download the JSON file',
              'Set the entire JSON as the GOOGLE_SERVICE_ACCOUNT_KEY env variable',
              'Note the service account email (e.g. rotaract-portal-sa@project.iam.gserviceaccount.com)',
            ]}
          />

          {/* Step 3 */}
          <SetupStep
            step={3}
            title="Set Up Google Calendar"
            items={[
              'Create a new Google Calendar for the club (or use an existing one)',
              'Go to Calendar Settings → Share with specific people',
              'Add the service account email with "Make changes to events" permission',
              'Go to Integrate Calendar → copy the Calendar ID',
              'Paste it in the Calendar ID field on the Overview tab',
            ]}
          />

          {/* Step 4 */}
          <SetupStep
            step={4}
            title="Set Up Google Drive"
            items={[
              'Create a shared folder in Google Drive (e.g. "Rotaract NYC Documents")',
              'Right-click the folder → Share',
              'Add the service account email as an Editor',
              'Copy the folder ID from the URL (the long string after /folders/)',
              'Paste it in the Drive Folder ID field on the Overview tab',
            ]}
          />

          {/* Step 5 */}
          <SetupStep
            step={5}
            title="Set Up Google Sheets (optional)"
            items={[
              'Sheets will auto-create a new spreadsheet on first export',
              'Or create one manually and share it with the service account email',
              'If creating manually, paste the spreadsheet ID in the Spreadsheet ID field',
              'The spreadsheet ID is the long string in the URL between /d/ and /edit',
            ]}
          />

          {/* Step 6 */}
          <SetupStep
            step={6}
            title="(Optional) OAuth2 Setup"
            items={[
              'Only needed if you want user-level access (not just service account)',
              'Go to APIs & Services → Credentials → Create OAuth 2.0 Client ID',
              'Application type: Web application',
              'Authorized redirect URI: https://your-domain.com/api/google/callback',
              'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env variables',
              'Set GOOGLE_REDIRECT_URI if different from default',
            ]}
          />

          {/* Env vars summary */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Environment Variables
            </h3>
            <div className="space-y-2 font-mono text-xs">
              <EnvVar name="GOOGLE_SERVICE_ACCOUNT_KEY" required description="Full JSON of the service account key file" />
              <EnvVar name="GOOGLE_CLIENT_ID" description="OAuth2 client ID (optional)" />
              <EnvVar name="GOOGLE_CLIENT_SECRET" description="OAuth2 client secret (optional)" />
              <EnvVar name="GOOGLE_REDIRECT_URI" description="OAuth2 redirect URI (defaults to /api/google/callback)" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function SetupStep({ step, title, items }: { step: number; title: string; items: string[] }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <span className="w-7 h-7 rounded-full bg-azure text-white text-xs font-bold flex items-center justify-center">
          {step}
        </span>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <ol className="ml-10 space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
            <span className="text-gray-300 dark:text-gray-600 mt-0.5 shrink-0">{i + 1}.</span>
            {item}
          </li>
        ))}
      </ol>
    </div>
  );
}

function EnvVar({ name, required, description }: { name: string; required?: boolean; description: string }) {
  return (
    <div className="flex items-start gap-2">
      <code className="text-azure-800 dark:text-azure-300 shrink-0">{name}</code>
      {required && <span className="text-red-500 text-xs">*</span>}
      <span className="text-gray-500 dark:text-gray-400">— {description}</span>
    </div>
  );
}

// ─── Utilities ───

function getFileIcon(mimeType: string): string {
  if (mimeType.includes('folder')) return '📁';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
  if (mimeType.includes('document') || mimeType.includes('word')) return '📄';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
  if (mimeType.includes('pdf')) return '📕';
  if (mimeType.includes('image')) return '🖼️';
  if (mimeType.includes('video')) return '🎬';
  if (mimeType.includes('audio')) return '🎵';
  if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦';
  return '📎';
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
