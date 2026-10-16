// Discovery API: contract [DISC-1] [DISC-2] [DISC-3] [DISC-4] [DISC-5] [DISC-6] [DISC-7]
// (all JWT optional).
import { request } from './http';
import type { MovieCard, Page } from './types';

export type RankedListKey = 'trending' | 'top-rated' | 'most-liked' | 'imdb-top-250';
export type HomeSectionKey = 'for-you' | RankedListKey;

/** contract [DISC-1] */
export interface HomeSection {
  key: HomeSectionKey;
  title: string;
  endpoint: string;
  totalResults: number;
  results: MovieCard[];
}
export interface HomeResponse {
  sections: HomeSection[];
}

/** API pages are 0-based (contract [CONV-4]); pages convert from their 1-based URL page. */
export interface PageParams {
  page: number;
  size: number;
}

export type MoviePageFetcher = (
  params: PageParams,
  signal?: AbortSignal,
) => Promise<Page<MovieCard>>;

export const RANKED_LIST_KEYS: readonly RankedListKey[] = [
  'trending',
  'top-rated',
  'most-liked',
  'imdb-top-250',
];

export function isRankedListKey(value: string | undefined): value is RankedListKey {
  return RANKED_LIST_KEYS.includes(value as RankedListKey);
}

export function getHome(signal?: AbortSignal): Promise<HomeResponse> {
  return request('GET', '/home', { auth: 'optional', signal });
}

function rankedList(path: string): MoviePageFetcher {
  return ({ page, size }, signal) =>
    request('GET', path, { auth: 'optional', query: { page, size }, signal });
}

/** contract [DISC-4] */
export const getTrending = rankedList('/movies/trending');
/** contract [DISC-5]: ≥ 5 user ratings; often empty. */
export const getTopRated = rankedList('/movies/top-rated');
/** contract [DISC-6] */
export const getMostLiked = rankedList('/movies/most-liked');
/** contract [DISC-7]: capped at 250. */
export const getImdbTop250 = rankedList('/movies/imdb-top-250');

export const rankedListFetchers: Record<RankedListKey, MoviePageFetcher> = {
  trending: getTrending,
  'top-rated': getTopRated,
  'most-liked': getMostLiked,
  'imdb-top-250': getImdbTop250,
};

/** Browse filters, combined with AND (contract [DISC-2]). Unset filters are not sent. */
export interface BrowseFilters {
  genreId?: number;
  languageId?: number;
  year?: number;
}

/** contract [DISC-2]: fixed order (IMDb rating). Any other param → 400, so only these are sent. */
export function browseMovies(
  { genreId, languageId, year, page, size }: BrowseFilters & PageParams,
  signal?: AbortSignal,
): Promise<Page<MovieCard>> {
  return request('GET', '/movies', {
    auth: 'optional',
    query: { genreId, languageId, year, page, size },
    signal,
  });
}

/** contract [DISC-3]: `q` must already be trimmed and 3–100 characters. Relevance order. */
export function searchMovies(
  { q, page, size }: { q: string } & PageParams,
  signal?: AbortSignal,
): Promise<Page<MovieCard>> {
  return request('GET', '/movies/search', { auth: 'optional', query: { q, page, size }, signal });
}
