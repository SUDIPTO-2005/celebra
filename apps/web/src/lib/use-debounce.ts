import { useEffect, useState } from 'react';

/**
 * Custom hook to debounce any fast-changing value (e.g. search input).
 * Reduces unnecessary API requests, memory allocations, and React re-renders.
 */
export function useDebounce<T>(value: T, delayMs: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
