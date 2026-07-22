'use client';

/**
 * Documents — a Drive-first launcher.
 *
 * The club's single source of truth for documents is the RotaractNYC shared
 * Google Drive. Rather than maintain a parallel file store, this page is a
 * curated set of shortcuts into the real Drive folders, with an optional
 * in-page preview. Board-only areas (governance, finance, fundraising,
 * marketing) are gated by role.
 */

import { useState } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import PageHeader from '@/components/portal/PageHeader';
import {
  BookOpen,
  GraduationCap,
  Palette,
  ClipboardList,
  Scale,
  DollarSign,
  Gift,
  Megaphone,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';

type Access = 'all' | 'board' | 'treasurer';

type DriveFolder = {
  name: string;
  description: string;
  folderId: string;
  Icon: LucideIcon;
  accent: 'cranberry' | 'gold' | 'azure';
  access: Access;
};

// Folder IDs are the real RotaractNYC shared-drive folders.
const FOLDERS: DriveFolder[] = [
  {
    name: 'Start Here',
    description: 'Club handbook, annual calendar, onboarding, and key links.',
    folderId: '15m8gxL5AoSNK93MPNBeYiZiP6ZEZPYSA',
    Icon: BookOpen, accent: 'cranberry', access: 'all',
  },
  {
    name: 'Member Resources',
    description: 'Committee guides and resources for active members.',
    folderId: '1rsVEs_SW6h95hgS7_sDESrdJqp0qDuTv',
    Icon: GraduationCap, accent: 'azure', access: 'all',
  },
  {
    name: 'Committee Leadership',
    description: 'Playbooks, charters, and chair resources.',
    folderId: '1YPBzgysC2YnCJkQ6PSpshH4y3fcHYWFr',
    Icon: ClipboardList, accent: 'azure', access: 'all',
  },
  {
    name: 'Brand Assets',
    description: 'Logos, letterheads, and branded templates.',
    folderId: '1TVAplu88cSKTFlQZHipvQ043RwnRRhHh',
    Icon: Palette, accent: 'gold', access: 'all',
  },
  {
    name: 'Governance & Admin',
    description: 'Bylaws, board minutes, policies, and legal records.',
    folderId: '1X91MqPQxr-L8A0Qxa_mthvc2cdoaZ0qL',
    Icon: Scale, accent: 'cranberry', access: 'board',
  },
  {
    name: 'Finance',
    description: 'Budgets, treasurer reports, and payment records.',
    folderId: '1C1qlZB-SpoOLzp8sPxRVqiF1zzMNWP44',
    Icon: DollarSign, accent: 'gold', access: 'treasurer',
  },
  {
    name: 'Fundraising & Sponsorships',
    description: 'Grants, partnership proposals, and donor records.',
    folderId: '1wE1Rzoy-rCNEsUHzJJkkZTeU51AlxjgI',
    Icon: Gift, accent: 'cranberry', access: 'board',
  },
  {
    name: 'Marketing & Communications',
    description: 'Social media, newsletters, press, and photos.',
    folderId: '1m_U34c_TiO7WVw44T1znsOo4kj6hDLN0',
    Icon: Megaphone, accent: 'azure', access: 'board',
  },
];

const accentClasses: Record<DriveFolder['accent'], { bg: string; text: string }> = {
  cranberry: { bg: 'bg-cranberry-50 dark:bg-cranberry-900/20', text: 'text-cranberry dark:text-cranberry-400' },
  gold: { bg: 'bg-gold-100 dark:bg-gold-900/20', text: 'text-gold-700 dark:text-gold-300' },
  azure: { bg: 'bg-azure-50 dark:bg-azure-900/20', text: 'text-azure dark:text-azure-400' },
};

const folderUrl = (id: string) => `https://drive.google.com/drive/folders/${id}`;
const embedUrl = (id: string) => `https://drive.google.com/embeddedfolderview?id=${id}#grid`;

export default function DocumentsPage() {
  const { member } = useAuth();
  const [preview, setPreview] = useState<string | null>(null);

  const isBoard = member?.role === 'board' || member?.role === 'president' || member?.role === 'treasurer';
  const isTreasurer = member?.role === 'treasurer' || member?.role === 'president';

  const canSee = (a: Access) => a === 'all' || (a === 'board' && isBoard) || (a === 'treasurer' && isTreasurer);
  const visible = FOLDERS.filter((f) => canSee(f.access));

  return (
    <div className="max-w-5xl mx-auto space-y-6 page-enter">
      <PageHeader
        eyebrow="Resources"
        title="Documents"
        subtitle="Everything lives in the club's shared Google Drive — the single source of truth. Open a folder to browse or preview it here."
        actions={
          <a
            href={folderUrl('0ADWZPQOHjpGhUk9PVA')}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-sm btn-outline"
          >
            Open the shared Drive
            <ExternalLink className="w-4 h-4" />
          </a>
        }
      />

      <div className="grid sm:grid-cols-2 gap-4">
        {visible.map((f) => {
          const c = accentClasses[f.accent];
          const open = preview === f.folderId;
          return (
            <div key={f.folderId} className="p-card p-5">
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-tile flex items-center justify-center shrink-0 ${c.bg}`}>
                  <f.Icon className={`w-5 h-5 ${c.text}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-serif text-lg font-semibold text-gray-900 dark:text-white leading-tight">{f.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{f.description}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <a
                      href={folderUrl(f.folderId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-cranberry hover:text-cranberry-800 dark:text-cranberry-400 transition-colors"
                    >
                      Open in Drive <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => setPreview(open ? null : f.folderId)}
                      className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                      aria-expanded={open}
                    >
                      {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      Preview
                    </button>
                  </div>
                </div>
              </div>

              {open && (
                <div className="mt-4 rounded-tile overflow-hidden border border-black/[0.06] dark:border-white/[0.07]">
                  <iframe
                    src={embedUrl(f.folderId)}
                    className="w-full h-[320px] bg-white"
                    title={`${f.name} — Google Drive`}
                    loading="lazy"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center leading-relaxed pt-2">
        Documents are managed in Google Drive so the club keeps one source of truth.
        {isBoard && ' To add or reorganize files, use Drive directly — changes appear here automatically.'}
      </p>
    </div>
  );
}
