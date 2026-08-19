import { useEffect, useState } from 'react';

/**
 * Custom hook to debounce any rapidly changing value (e.g. search inputs).
 * @param value The value to debounce.
 * @param delay Milliseconds to wait before updating the debounced value (default: 300ms).
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
