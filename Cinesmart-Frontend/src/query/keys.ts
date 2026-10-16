// Query keys: plan [ARCH-4]. Every key with user-specific data starts with the viewer,
// because card flags and userState live inside public responses (contract [CONV-2]).

export type Viewer = number | 'anon';

export function viewerOf(userId: number | null | undefined): Viewer {
  return userId ?? 'anon';
}

export interface BrowseParams {
  genreId?: number;
  languageId?: number;
  year?: number;
  page: number;
  size: number;
}

export const keys = {
  /** Everything cached for one viewer (removed on logout/expiry). */
  viewer: (v: Viewer) => [v] as const,

  genres: () => ['genres'] as const,
  languages: () => ['languages'] as const,

  home: (v: Viewer) => [v, 'home'] as const,
  lists: (v: Viewer) => [v, 'list'] as const,
  list: (v: Viewer, key: string, page: number, size: number) =>
    [v, 'list', key, page, size] as const,
  recsAll: (v: Viewer) => [v, 'recs'] as const,
  recs: (v: Viewer, page: number, size: number) => [v, 'recs', page, size] as const,
  browse: (v: Viewer, params: BrowseParams) => [v, 'browse', params] as const,
  search: (v: Viewer, q: string, page: number, size: number) =>
    [v, 'search', q, page, size] as const,
  movie: (v: Viewer, id: number) => [v, 'movie', id] as const,
  similar: (v: Viewer, id: number, size: number) => [v, 'similar', id, size] as const,

  me: {
    profile: (v: Viewer) => [v, 'me', 'profile'] as const,
    watchlistAll: (v: Viewer) => [v, 'me', 'watchlist'] as const,
    watchlist: (v: Viewer, page: number, size: number) =>
      [v, 'me', 'watchlist', page, size] as const,
    ratingsAll: (v: Viewer) => [v, 'me', 'ratings'] as const,
    ratings: (v: Viewer, page: number, size: number) => [v, 'me', 'ratings', page, size] as const,
    watched: (v: Viewer) => [v, 'me', 'watched'] as const,
    reactions: (v: Viewer) => [v, 'me', 'reactions'] as const,
  },
} as const;
