import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import type { PortalDocument, DocumentCategory } from '@/types';
import {
  ClipboardList,
  ScrollText,
  Scale,
  BookOpen,
  BarChart3,
  DollarSign,
  FileText,
  FolderOpen,
  File,
  Pin,
  Download,
  ExternalLink,
  type LucideIcon,
} from 'lucide-react';

const categoryColors: Record<DocumentCategory, 'cranberry' | 'azure' | 'gold' | 'green' | 'gray'> = {
  Minutes: 'azure',
  Policies: 'cranberry',
  Bylaws: 'cranberry',
  Handbook: 'gold',
  Reports: 'green',
  Financial: 'gold',
  Templates: 'gray',
  'Google Drive': 'azure',
  Other: 'gray',
};

const categoryIcons: Record<DocumentCategory, LucideIcon> = {
  Minutes: ClipboardList,
  Policies: ScrollText,
  Bylaws: Scale,
  Handbook: BookOpen,
  Reports: BarChart3,
  Financial: DollarSign,
  Templates: FileText,
  'Google Drive': FolderOpen,
  Other: File,
};

const iconColorClasses: Record<string, string> = {
  cranberry: 'text-cranberry-600 dark:text-cranberry-400',
  azure: 'text-azure-600 dark:text-azure-400',
  gold: 'text-amber-600 dark:text-amber-400',
  green: 'text-emerald-600 dark:text-emerald-400',
  gray: 'text-gray-500 dark:text-gray-400',
};

interface DocumentCardProps {
  document: PortalDocument;
  onDelete?: (id: string) => void;
  onTogglePin?: (doc: PortalDocument) => void;
  canManage?: boolean;
}

export default function DocumentCard({ document: doc, onDelete, onTogglePin, canManage }: DocumentCardProps) {
  const DocIcon = categoryIcons[doc.category as DocumentCategory] || File;
  const colorKey = categoryColors[doc.category as DocumentCategory] || 'gray';
  const iconColor = iconColorClasses[colorKey] || iconColorClasses.gray;
  const url = doc.fileURL || doc.linkURL;

  return (
    <Card padding="md" className="group relative">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-cranberry-50 dark:bg-cranberry-900/20 flex items-center justify-center shrink-0">
          <DocIcon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {doc.pinned && <Pin className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{doc.title}</h3>
          </div>
          {doc.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{doc.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={categoryColors[doc.category as DocumentCategory] || 'gray'}>{doc.category}</Badge>
            <span className="text-xs text-gray-400">
              Uploaded by {doc.uploadedByName}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex gap-2">
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button size="sm" variant="secondary" className="w-full">
              {doc.fileURL ? (
                <><Download className="w-3.5 h-3.5 mr-1.5 inline" />Download</>
              ) : (
                <><ExternalLink className="w-3.5 h-3.5 mr-1.5 inline" />Open Link</>
              )}
            </Button>
          </a>
        )}
        {canManage && onTogglePin && (
          <Button size="sm" variant="secondary" onClick={() => onTogglePin(doc)}>
            {doc.pinned ? 'Unpin' : 'Pin'}
          </Button>
        )}
        {canManage && onDelete && (
          <Button size="sm" variant="danger" onClick={() => onDelete(doc.id)}>
            Delete
          </Button>
        )}
      </div>
    </Card>
  );
}
