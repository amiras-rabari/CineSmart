import { useEffect, useState } from 'react';

/**
 * Live countdown from a `Retry-After` value ([COMP-4]). Restarts when `seconds` or `resetKey`
 * changes (pass the error object as `resetKey` so two 429s with the same value both restart it).
 */
export function useRetryAfter(seconds: number | null | undefined, resetKey?: unknown) {
  const total = seconds && seconds > 0 ? Math.ceil(seconds) : 0;
  const [state, setState] = useState({ total, resetKey, remaining: total });

  const changed = state.total !== total || state.resetKey !== resetKey;
  if (changed) setState({ total, resetKey, remaining: total });

  useEffect(() => {
    if (total <= 0) return;
    const deadline = Date.now() + total * 1000;
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setState((s) => (s.remaining === left ? s : { ...s, remaining: left }));
      if (left === 0) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
  }, [total, resetKey]);

  const remaining = changed ? total : state.remaining;
  return { remaining, active: remaining > 0 };
}
