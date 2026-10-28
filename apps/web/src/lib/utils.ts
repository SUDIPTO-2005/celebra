import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatCurrency(amount: string | null | undefined, currency = 'USD'): string {
  if (amount === null || amount === undefined) return '—';
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num);
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}

export const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  planning: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-red-100 text-red-700',
  // RSVP
  yes: 'bg-green-100 text-green-700',
  no: 'bg-red-100 text-red-700',
  maybe: 'bg-yellow-100 text-yellow-700',
  pending: 'bg-gray-100 text-gray-600',
  // Tasks
  todo: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  // Priority
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
  // Quote
  requested: 'bg-yellow-100 text-yellow-700',
  quoted: 'bg-blue-100 text-blue-700',
  // Booking
  pending_booking: 'bg-yellow-100 text-yellow-700',
  confirmed_booking: 'bg-green-100 text-green-700',
};

/**
 * Type-safe helper to safely unpack paginated or unpaginated API responses.
 * Avoids unsafe `any` casting across client components.
 */
export function extractResults<T>(
  response: T[] | { results?: T[] } | null | undefined
): T[] {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if ('results' in response && Array.isArray(response.results)) {
    return response.results;
  }
  return [];
}
