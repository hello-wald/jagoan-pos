import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './use-debounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('debounces value updates according to the delay', () => {
    const { result, rerender } = renderHook(({ val }) => useDebounce(val, 300), {
      initialProps: { val: 'initial' },
    });

    expect(result.current).toBe('initial');

    // Update prop
    rerender({ val: 'updated' });

    // Should still be 'initial' before timer fires
    expect(result.current).toBe('initial');

    // Advance timer past delay
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should now be 'updated'
    expect(result.current).toBe('updated');
  });

  it('cancels previous timer if value changes rapidly', () => {
    const { result, rerender } = renderHook(({ val }) => useDebounce(val, 300), {
      initialProps: { val: 'first' },
    });

    rerender({ val: 'second' });
    act(() => {
      vi.advanceTimersByTime(150);
    });

    rerender({ val: 'third' });
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // 300ms has elapsed since first, but only 150ms since 'third'
    expect(result.current).toBe('first');

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(result.current).toBe('third');
  });
});
