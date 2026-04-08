import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import type { Member } from '@/types';

const roleColors: Record<string, 'cranberry' | 'gold' | 'azure' | 'gray'> = {
  president: 'cranberry',
  treasurer: 'gold',
  board: 'azure',
  member: 'gray',
};

interface MemberCardProps {
  member: Member;
  viewerRole?: string;
  onMessage?: () => void;
  compact?: boolean;
}

export default function MemberCard({ member: m, viewerRole, onMessage, compact = false }: MemberCardProps) {
  const isBoard = ['president', 'board', 'treasurer'].includes(viewerRole || '');
  const whatsAppNumber = m.whatsAppSameAsPhone ? m.phone : m.whatsAppPhone;
  const whatsAppLink = whatsAppNumber ? `https://wa.me/${whatsAppNumber.replace(/\D/g, '')}` : null;

  return (
    <Card interactive padding="md" className="group">
      <div className="flex items-start gap-3.5">
        <div className="relative">
          <Avatar src={m.photoURL} alt={m.displayName} size={compact ? 'md' : 'lg'} />
          {m.role !== 'member' && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center shadow-sm">
              <div className={`w-3 h-3 rounded-full ${m.role === 'president' ? 'bg-cranberry' : m.role === 'treasurer' ? 'bg-gold' : 'bg-azure'}`} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-cranberry dark:group-hover:text-cranberry-400 transition-colors">
            {m.displayName}
          </h3>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <Badge variant={roleColors[m.role] || 'gray'}>{m.role}</Badge>
            {m.status === 'alumni' && <Badge variant="gold">Alumni</Badge>}
          </div>
          {m.status === 'alumni' && m.joinedAt && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1.5">
              <svg aria-hidden="true" className="w-3 h-3 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              {new Date(m.joinedAt).getFullYear()}
              {' – '}
              {m.alumniSince ? new Date(m.alumniSince).getFullYear() : 'present'}
            </p>
          )}
          {m.committee && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1.5">
              <svg aria-hidden="true" className="w-3 h-3 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {m.committee}
            </p>
          )}
          {m.occupation && (
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
              <svg aria-hidden="true" className="w-3 h-3 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              {m.occupation}{m.employer ? ` at ${m.employer}` : ''}
            </p>
          )}
        </div>
      </div>

      {!compact && (
        <div className="mt-4 pt-3.5 border-t border-gray-100 dark:border-gray-800 flex gap-2">
          {isBoard && whatsAppLink && (
            <a href={whatsAppLink} target="_blank" rel="noopener noreferrer" className="flex-none">
              <Button size="sm" variant="ghost" className="!text-green-600 hover:!bg-green-50 dark:hover:!bg-green-900/20 !px-2">
                <svg aria-hidden="true" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.75.75 0 00.917.918l4.458-1.495A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.37 0-4.567-.818-6.3-2.187l-.44-.358-3.095 1.037 1.037-3.095-.358-.44A9.95 9.95 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
              </Button>
            </a>
          )}
          {m.linkedIn && (
            <a href={m.linkedIn} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button size="sm" variant="ghost" className="w-full">LinkedIn</Button>
            </a>
          )}
          {onMessage && (
            <Button size="sm" variant="outline" className="flex-1" onClick={onMessage}>
              Message
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
