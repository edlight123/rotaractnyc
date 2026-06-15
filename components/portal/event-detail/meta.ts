import type { EventType } from '@/types';
import { PartyPopper, Ticket, HandHeart, Sparkles, CalendarDays, type LucideIcon } from 'lucide-react';

/** Badge colour per event type. */
export const typeColors: Record<string, 'green' | 'cranberry' | 'azure' | 'gold' | 'gray'> = {
  free: 'green',
  paid: 'gold',
  service: 'azure',
  hybrid: 'cranberry',
};

/** Hero gradient (used when an event has no image). */
export const typeGradients: Record<string, string> = {
  free: 'from-emerald-500 to-teal-600',
  paid: 'from-amber-500 to-orange-600',
  service: 'from-blue-500 to-blue-700',
  hybrid: 'from-cranberry to-cranberry-800',
};

/** Lucide icon shown on the gradient hero fallback. */
export const typeIconComponents: Record<string, LucideIcon> = {
  free: PartyPopper,
  paid: Ticket,
  service: HandHeart,
  hybrid: Sparkles,
};

/** Safe lookups that fall back to the `free`/default styling. */
export const gradientFor = (type: EventType) => typeGradients[type] || typeGradients.free;
export const iconFor = (type: EventType): LucideIcon => typeIconComponents[type] || CalendarDays;
export const colorFor = (type: EventType) => typeColors[type] || 'gray';
