// Genres and languages ([ARCH-4]): no viewer prefix (no user data), 1 h stale time, shared by the
// Browse menu and the /browse filters so a second open makes no new request.
import { getGenres, getLanguages } from '@/api/catalog';
import { keys } from './keys';
import { staleTimes } from './query-client';

export function genresQuery() {
  return {
    queryKey: keys.genres(),
    queryFn: ({ signal }: { signal: AbortSignal }) => getGenres(signal),
    staleTime: staleTimes.catalog,
  };
}

export function languagesQuery() {
  return {
    queryKey: keys.languages(),
    queryFn: ({ signal }: { signal: AbortSignal }) => getLanguages(signal),
    staleTime: staleTimes.catalog,
  };
}
