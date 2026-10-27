import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  formatPercent,
  getInitials,
  capitalize,
  cn,
} from '@/lib/utils';

describe('Frontend Utils', () => {
  it('formats dates cleanly', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('2026-10-27')).toContain('2026');
  });

  it('formats currencies properly without NaN', () => {
    expect(formatCurrency(null)).toBe('—');
    expect(formatCurrency('1250.50', 'USD')).toContain('1,250.50');
    expect(formatCurrency('50', 'USD')).toContain('50.00');
  });

  it('calculates percentages and initials', () => {
    expect(formatPercent(55.2)).toBe('55%');
    expect(getInitials('Anya Forger')).toBe('AF');
    expect(getInitials('Sudipto Bhadra')).toBe('SB');
  });

  it('capitalizes strings and handles underscores', () => {
    expect(capitalize('in_progress')).toBe('In progress');
    expect(capitalize('confirmed')).toBe('Confirmed');
  });

  it('merges tailwind class names safely', () => {
    expect(cn('p-4', 'p-6')).toBe('p-6');
    expect(cn('text-red-500', undefined, 'font-bold')).toBe('text-red-500 font-bold');
  });
});
