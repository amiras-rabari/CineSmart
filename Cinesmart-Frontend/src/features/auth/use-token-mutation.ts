import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { parseToken } from '@/lib/validation';

/**
 * Email-link pages ([ROUTES-10]): reads `token` from the URL and, with `auto`, POSTs it
 * exactly once per page load. Tokens are single use, so the ref guard must survive
 * StrictMode's double effect. A missing/invalid token → `token: null`, no request.
 */
export function useTokenMutation<T>(
  mutationFn: (token: string) => Promise<T>,
  { auto }: { auto: boolean },
) {
  const [params] = useSearchParams();
  const token = parseToken(params.get('token'));
  const mutation = useMutation({ mutationFn });
  const { mutate } = mutation;
  const started = useRef(false);

  useEffect(() => {
    if (!auto || !token || started.current) return;
    started.current = true;
    mutate(token);
  }, [auto, token, mutate]);

  return { token, mutation };
}
