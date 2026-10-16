// Activity API: contract [ACT-1] … [ACT-9]. Login required; one shared write budget of 60/min
// ([LIMIT-2]). Every call answers 200 with the updated UserMovieState.
import { request } from './http';
import type { Reaction, UserMovieState } from './types';

const path = (movieId: number, what: string) => `/movies/${movieId}/${what}`;

/** contract [ACT-2] */
export function addToWatchlist(movieId: number): Promise<UserMovieState> {
  return request('PUT', path(movieId, 'watchlist'), { auth: 'required' });
}

/** contract [ACT-3] */
export function removeFromWatchlist(movieId: number): Promise<UserMovieState> {
  return request('DELETE', path(movieId, 'watchlist'), { auth: 'required' });
}

/** contract [ACT-4] */
export function markWatched(movieId: number): Promise<UserMovieState> {
  return request('PUT', path(movieId, 'watched'), { auth: 'required' });
}

/** contract [ACT-5] */
export function unmarkWatched(movieId: number): Promise<UserMovieState> {
  return request('DELETE', path(movieId, 'watched'), { auth: 'required' });
}

/** contract [ACT-6]: 1.0–10.0 with one decimal; rounded here before sending. */
export function rateMovie(movieId: number, rating: number): Promise<UserMovieState> {
  return request('PUT', path(movieId, 'rating'), {
    auth: 'required',
    body: { rating: Math.round(rating * 10) / 10 },
  });
}

/** contract [ACT-7] */
export function removeRating(movieId: number): Promise<UserMovieState> {
  return request('DELETE', path(movieId, 'rating'), { auth: 'required' });
}

/** contract [ACT-8]. The UI never sends NEUTRAL: clearing is a DELETE ([ARCH-5]). */
export function setReaction(
  movieId: number,
  reaction: Exclude<Reaction, 'NEUTRAL'>,
): Promise<UserMovieState> {
  return request('PUT', path(movieId, 'reaction'), { auth: 'required', body: { reaction } });
}

/** contract [ACT-9]: the reaction then reads NEUTRAL. */
export function removeReaction(movieId: number): Promise<UserMovieState> {
  return request('DELETE', path(movieId, 'reaction'), { auth: 'required' });
}
