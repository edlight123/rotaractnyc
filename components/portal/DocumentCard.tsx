import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import type { PortalDocument, DocumentCategory } from '@/types';

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

const categoryIcons: Record<DocumentCategory, string> = {
  Minutes: '📋',
  Policies: '📜',
  Bylaws: '⚖️',
  Handbook: '📖',
  Reports: '📊',
  Financial: '💰',
  Templates: '📝',
  'Google Drive': '🔗',
  Other: '📄',
};

interface DocumentCardProps {
  document: PortalDocument;
  onDelete?: (id: string) => void;
  onTogglePin?: (doc: PortalDocument) => void;
  canManage?: boolean;
}

export default function DocumentCard({ document: doc, onDelete, onTogglePin, canManage }: DocumentCardProps) {
  const icon = categoryIcons[doc.category as DocumentCategory] || '📄';
  const url = doc.fileURL || doc.linkURL;

  return (
    <Card padding="md" className="group relative">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-cranberry-50 dark:bg-cranberry-900/20 flex items-center justify-center text-lg shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {doc.pinned && <span className="text-xs" title="Pinned">📌</span>}
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
              {doc.fileURL ? 'Download' : 'Open Link'}
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
