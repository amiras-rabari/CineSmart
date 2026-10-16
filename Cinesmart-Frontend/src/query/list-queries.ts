// Query options for ranked lists, For You, home row pages, browse and search
// ([ARCH-4] keys and stale times).
import {
  browseMovies,
  getHome,
  rankedListFetchers,
  searchMovies,
  type HomeSectionKey,
  type RankedListKey,
} from '@/api/discovery';
import { getRecommendations } from '@/api/recommendations';
import type { RowPageQuery } from '@/components/movie/MovieRow';
import { ROW_PAGE_SIZE } from '@/lib/ranked-lists';
import { keys, type BrowseParams, type Viewer } from './keys';
import { staleTimes } from './query-client';
import { cardsHaveFlags, fetchWithUserData } from './user-data-retry';

export function homeQuery(v: Viewer) {
  return {
    queryKey: keys.home(v),
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      fetchWithUserData(
        () => getHome(signal),
        (home) => home.sections.every((section) => cardsHaveFlags(section.results)),
      ),
    staleTime: staleTimes.home,
  };
}

/** `page` is the API's 0-based page. */
export function rankedListQuery(v: Viewer, key: RankedListKey, page: number, size: number) {
  return {
    queryKey: keys.list(v, key, page, size),
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      fetchWithUserData(
        () => rankedListFetchers[key]({ page, size }, signal),
        (data) => cardsHaveFlags(data.results),
      ),
    staleTime: staleTimes.list,
  };
}

/** `page` is the API's 0-based page. Login required. */
export function recsQuery(v: Viewer, page: number, size: number) {
  return {
    queryKey: keys.recs(v, page, size),
    queryFn: ({ signal }: { signal: AbortSignal }) => getRecommendations({ page, size }, signal),
    staleTime: staleTimes.recs,
  };
}

/** Next pages of a home row: For You → [REC-1], the others → their ranked list. */
export function sectionPageQuery(v: Viewer, key: HomeSectionKey): RowPageQuery {
  return (page) =>
    key === 'for-you'
      ? recsQuery(v, page, ROW_PAGE_SIZE)
      : rankedListQuery(v, key, page, ROW_PAGE_SIZE);
}

/** `page` is the API's 0-based page; unset filters are left out of the key and the request. */
export function browseQuery(v: Viewer, params: BrowseParams) {
  return {
    queryKey: keys.browse(v, params),
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      fetchWithUserData(
        () => browseMovies(params, signal),
        (data) => cardsHaveFlags(data.results),
      ),
    staleTime: staleTimes.browse,
  };
}

/** `q` is trimmed and valid (3–100 chars); `page` is the API's 0-based page. */
export function searchQuery(v: Viewer, q: string, page: number, size: number) {
  return {
    queryKey: keys.search(v, q, page, size),
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      fetchWithUserData(
        () => searchMovies({ q, page, size }, signal),
        (data) => cardsHaveFlags(data.results),
      ),
    staleTime: staleTimes.search,
  };
}
