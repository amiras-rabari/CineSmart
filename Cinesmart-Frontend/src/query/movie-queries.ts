// Details and similar titles ([ARCH-4] keys and stale times).
import { getMovie } from '@/api/catalog';
import { getSimilar } from '@/api/recommendations';
import { keys, type Viewer } from './keys';
import { staleTimes } from './query-client';
import { cardsHaveFlags, fetchWithUserData } from './user-data-retry';

/** Similar titles shown under the details ([ROUTES-6]). */
export const SIMILAR_SIZE = 10;

export function movieQuery(v: Viewer, movieId: number) {
  return {
    queryKey: keys.movie(v, movieId),
    // Safety net ([ARCH-2]): signed in but `userState` null → refresh once, fetch once more.
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      fetchWithUserData(
        () => getMovie(movieId, signal),
        (movie) => movie.userState !== null,
      ),
    staleTime: staleTimes.movie,
  };
}

export function similarQuery(v: Viewer, movieId: number, size = SIMILAR_SIZE) {
  return {
    queryKey: keys.similar(v, movieId, size),
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      fetchWithUserData(() => getSimilar(movieId, size, signal), cardsHaveFlags),
    staleTime: staleTimes.similar,
  };
}
