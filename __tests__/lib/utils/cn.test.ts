/**
 * Tests for lib/utils/cn.ts (clsx + tailwind-merge wrapper)
 */

import { cn } from '@/lib/utils/cn';

describe('cn', () => {
  it('merges multiple class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('filters out falsy values (undefined, null, false)', () => {
    expect(cn('base', undefined, null, false, 'active')).toBe('base active');
  });

  it('handles conditional class objects', () => {
    expect(cn('base', { active: true, disabled: false })).toBe('base active');
  });

  it('handles arrays of classes', () => {
    expect(cn(['a', 'b'], 'c')).toBe('a b c');
  });

  it('resolves Tailwind conflicts — last value wins', () => {
    // tailwind-merge should keep the last conflicting utility
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });

  it('resolves Tailwind color conflicts', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('keeps non-conflicting Tailwind utilities', () => {
    const result = cn('p-4', 'mt-2', 'text-lg');
    expect(result).toContain('p-4');
    expect(result).toContain('mt-2');
    expect(result).toContain('text-lg');
  });

  it('resolves conflicting margin utilities', () => {
    expect(cn('mx-4', 'mx-2')).toBe('mx-2');
  });

  it('returns empty string for no arguments', () => {
    expect(cn()).toBe('');
  });

  it('returns empty string for only falsy arguments', () => {
    expect(cn(undefined, null, false, '')).toBe('');
  });

  it('handles a real-world component pattern', () => {
    const isActive = true;
    const isDisabled = false;
    const result = cn(
      'px-4 py-2 rounded font-medium',
      isActive && 'bg-blue-600 text-white',
      isDisabled && 'opacity-50 cursor-not-allowed',
    );
    expect(result).toContain('px-4');
    expect(result).toContain('bg-blue-600');
    expect(result).not.toContain('opacity-50');
  });
});
