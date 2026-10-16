// "Me" queries ([ARCH-4]): login required, `staleTime` 0 (live counts and lists).
import { getProfile, getRatings, getReactions, getWatchlist } from '@/api/me';
import { keys, type Viewer } from './keys';
import { staleTimes } from './query-client';

export function profileQuery(v: Viewer) {
  return {
    queryKey: keys.me.profile(v),
    queryFn: ({ signal }: { signal: AbortSignal }) => getProfile(signal),
    staleTime: staleTimes.me,
  };
}

/** `page` is the API's 0-based page. */
export function watchlistQuery(v: Viewer, page: number, size: number) {
  return {
    queryKey: keys.me.watchlist(v, page, size),
    queryFn: ({ signal }: { signal: AbortSignal }) => getWatchlist({ page, size }, signal),
    staleTime: staleTimes.me,
  };
}

/** `page` is the API's 0-based page. */
export function ratingsQuery(v: Viewer, page: number, size: number) {
  return {
    queryKey: keys.me.ratings(v, page, size),
    queryFn: ({ signal }: { signal: AbortSignal }) => getRatings({ page, size }, signal),
    staleTime: staleTimes.me,
  };
}

export function reactionsQuery(v: Viewer) {
  return {
    queryKey: keys.me.reactions(v),
    queryFn: ({ signal }: { signal: AbortSignal }) => getReactions(signal),
    staleTime: staleTimes.me,
  };
}
