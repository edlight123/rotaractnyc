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
  onMessage?: () => void;
  compact?: boolean;
}

export default function MemberCard({ member: m, onMessage, compact = false }: MemberCardProps) {
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
          <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-cranberry dark:group-hover:text-cranberry-400 transition-colors">{m.displayName}</h3>
          <Badge variant={roleColors[m.role] || 'gray'} className="mt-1">{m.role}</Badge>
          {m.committee && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1.5">
              <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {m.committee}
            </p>
          )}
          {m.occupation && (
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
              <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              {m.occupation}{m.employer ? ` at ${m.employer}` : ''}
            </p>
          )}
        </div>
      </div>

      {!compact && (
        <div className="mt-4 pt-3.5 border-t border-gray-100 dark:border-gray-800 flex gap-2">
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
