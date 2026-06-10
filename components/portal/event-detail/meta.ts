import type { EventType } from '@/types';

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

/** Emoji shown on the gradient hero fallback. */
export const typeIcons: Record<string, string> = {
  free: '🎉',
  paid: '🎟',
  service: '🤝',
  hybrid: '✨',
};

/** Safe lookups that fall back to the `free`/default styling. */
export const gradientFor = (type: EventType) => typeGradients[type] || typeGradients.free;
export const iconFor = (type: EventType) => typeIcons[type] || '📅';
export const colorFor = (type: EventType) => typeColors[type] || 'gray';
