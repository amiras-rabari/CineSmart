// Watched-ID set ([ARCH-5]): loaded once per signed-in viewer from contract [ME-4], then kept in
// sync from every action response. Card markers read it, since `watched` on cards can be stale.
// Removed with the viewer's other queries on logout/expiry ([ARCH-4]).
import { useQuery, type QueryClient } from '@tanstack/react-query';
import { getWatched } from '@/api/me';
import { useSession } from '@/session/session-store';
import { keys, type Viewer } from './keys';
import { staleTimes } from './query-client';

export function watchedQuery(v: Viewer) {
  return {
    queryKey: keys.me.watched(v),
    queryFn: async ({ signal }: { signal: AbortSignal }) =>
      new Set((await getWatched(signal)).map((item) => item.movieId)),
    staleTime: staleTimes.watched,
  };
}

/** The set while signed in and loaded; `undefined` otherwise (callers fall back to `card.watched`). */
export function useWatchedSet(): ReadonlySet<number> | undefined {
  const { status, user } = useSession();
  const signedIn = status === 'authenticated';
  const v: Viewer = user?.userId ?? 'anon';
  const query = useQuery({ ...watchedQuery(v), enabled: signedIn });
  return signedIn ? query.data : undefined;
}

/** Applies one movie's watched state (only when the set is loaded). */
export function setWatched(
  queryClient: QueryClient,
  v: Viewer,
  movieId: number,
  watched: boolean,
): void {
  queryClient.setQueryData<Set<number>>(keys.me.watched(v), (set) => {
    if (!set || set.has(movieId) === watched) return set;
    const next = new Set(set);
    if (watched) next.add(movieId);
    else next.delete(movieId);
    return next;
  });
}
