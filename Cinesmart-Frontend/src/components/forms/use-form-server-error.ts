import { useState } from 'react';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { isRateLimited } from '@/api/errors';
import { useRetryAfter } from '@/hooks/use-retry-after';
import { applyServerErrors } from './apply-server-errors';

interface ServerErrorState {
  error: unknown;
  message: string | null;
}

/**
 * Holds a form's last server error: maps fields via `applyServerErrors` and runs the
 * `Retry-After` countdown that keeps the submit button disabled ([ARCH-3]).
 */
export function useFormServerError<T extends FieldValues>(
  setError: UseFormSetError<T>,
  knownFields: readonly Path<T>[],
) {
  const [state, setState] = useState<ServerErrorState | null>(null);
  const error = state?.error ?? null;
  const retryAfter = isRateLimited(error) ? error.retryAfter : null;
  const { active } = useRetryAfter(retryAfter, error);

  return {
    error,
    message: state?.message ?? null,
    /** A rate-limit countdown is running. */
    blocked: active,
    /** `message` replaces the form-level text (e.g. a screen-specific 503 message). */
    handle(err: unknown, message?: string) {
      setState({ error: err, message: message ?? applyServerErrors(err, setError, knownFields) });
    },
    clear() {
      setState(null);
    },
  };
}
