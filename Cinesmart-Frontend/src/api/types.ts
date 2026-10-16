// Shared API types: contract [CONV-4] [CONV-5] [CONV-6]. Names match the contract exactly.

/** contract [CONV-4] */
export interface Page<T> {
  results: T[];
  page: number;
  size: number;
  totalResults: number;
  totalPages: number;
}

/** contract [CONV-5] [ERR-1] */
export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'ACCOUNT_NOT_VERIFIED'
  | 'ACCOUNT_LOCKED'
  | 'TOKEN_INVALID'
  | 'EMAIL_TAKEN'
  | 'USERNAME_TAKEN'
  | 'MOVIE_NOT_FOUND'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR';

/** contract [CONV-5] */
export interface ApiErrorBody {
  status: number;
  code: ErrorCode;
  message: string;
  path: string;
  timestamp: string;
  fields?: Record<string, string>;
}

/** contract [CONV-6] */
export interface MovieCard {
  movieId: number;
  title: string;
  year: number | null;
  poster: string | null;
  imdbRating: number | null;
  averageRating: number | null;
  likeCount: number;
  dislikeCount: number;
  /** `null` when anonymous (or the token was ignored). */
  inWatchlist: boolean | null;
  watched: boolean | null;
}

export type Reaction = 'LIKE' | 'DISLIKE' | 'NEUTRAL';

export interface UserMovieState {
  inWatchlist: boolean;
  watched: boolean;
  rating: number | null;
  reaction: Reaction;
}

/** Genre or language. */
export interface NamedRef {
  id: number;
  name: string;
}

export interface PersonRef {
  personId: number;
  name: string;
}

export interface MessageResponse {
  message: string;
}

export interface LoginResponse {
  accessToken: string;
  /** Seconds (900). */
  expiresIn: number;
  user: { userId: number; username: string };
}
