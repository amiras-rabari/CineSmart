// Catalog API: contract [CAT-1] [CAT-2] [CAT-3] (JWT optional).
import { request } from './http';
import type { NamedRef, PersonRef, UserMovieState } from './types';

/** contract [CAT-2]: sorted by name; only genres with ≥ 1 movie. */
export function getGenres(signal?: AbortSignal): Promise<NamedRef[]> {
  return request('GET', '/genres', { auth: 'optional', signal });
}

/** contract [CAT-3]: most-used first, then name. */
export function getLanguages(signal?: AbortSignal): Promise<NamedRef[]> {
  return request('GET', '/languages', { auth: 'optional', signal });
}

export type AvailabilityType = 'sub' | 'rent' | 'buy' | 'free';

export interface Availability {
  platform: string;
  type: AvailabilityType | null;
  url: string | null;
}

/** contract [CAT-1] */
export interface MovieDetails {
  movieId: number;
  imdbId: string | null;
  title: string;
  year: number | null;
  /** `YYYY-MM-DD` */
  released: string | null;
  /** Minutes. */
  runtime: number | null;
  plot: string | null;
  poster: string | null;
  contentType: string | null;
  studio: string | null;
  ratings: {
    imdb: number | null;
    imdbVotes: number | null;
    rottenTomatoes: number | null;
    metascore: number | null;
  };
  genres: NamedRef[];
  languages: NamedRef[];
  directors: PersonRef[];
  writers: PersonRef[];
  cast: PersonRef[];
  otherCrew?: Record<string, PersonRef[]>;
  /** Hourly batch: lags up to 1 h ([CFG-1]). */
  platformStats: {
    averageRating: number | null;
    ratingCount: number;
    likeCount: number;
    dislikeCount: number;
  };
  /** Canada; sorted by platform. */
  availability: Availability[];
  /** `null` when anonymous (or the token was ignored). */
  userState: UserMovieState | null;
}

/** contract [CAT-1]: 404 MOVIE_NOT_FOUND for an unknown id. */
export function getMovie(movieId: number, signal?: AbortSignal): Promise<MovieDetails> {
  return request('GET', `/movies/${movieId}`, { auth: 'optional', signal });
}
