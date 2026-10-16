// TanStack Query defaults: plan [ARCH-3] (retry policy) and [ARCH-4] (caching).
import { QueryClient } from '@tanstack/react-query';
import { hasErrorCode } from '@/api/errors';

const SECOND = 1000;
const MINUTE = 60 * SECOND;

/** `staleTime` per key family ([ARCH-4]). */
export const staleTimes = {
  home: MINUTE,
  list: MINUTE,
  recs: 0,
  catalog: 60 * MINUTE,
  browse: MINUTE,
  search: MINUTE,
  movie: 30 * SECOND,
  similar: 5 * MINUTE,
  me: 0,
  watched: Infinity,
} as const;

/** Queries retry once, after 1 s, only for transient server/network failures; never for 4xx. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  return (
    failureCount < 1 &&
    hasErrorCode(error, 'NETWORK_ERROR', 'INTERNAL_ERROR', 'SERVICE_UNAVAILABLE')
  );
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetryQuery,
        retryDelay: SECOND,
        staleTime: MINUTE,
        gcTime: 10 * MINUTE,
        // Protects the shared 120/min IP budget (contract [LIMIT-1]).
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
}

export const queryClient = createQueryClient();
