import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRetryAfter } from './use-retry-after';

describe('useRetryAfter', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('counts down to zero', () => {
    const { result } = renderHook(() => useRetryAfter(3));
    expect(result.current).toEqual({ remaining: 3, active: true });
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.remaining).toBe(2);
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current).toEqual({ remaining: 0, active: false });
  });

  it('is inactive without a value', () => {
    const { result } = renderHook(() => useRetryAfter(null));
    expect(result.current).toEqual({ remaining: 0, active: false });
  });

  it('restarts when the reset key changes', () => {
    const { result, rerender } = renderHook(({ s, k }) => useRetryAfter(s, k), {
      initialProps: { s: 2, k: {} as object },
    });
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.active).toBe(false);
    rerender({ s: 2, k: {} });
    expect(result.current).toEqual({ remaining: 2, active: true });
  });
});
