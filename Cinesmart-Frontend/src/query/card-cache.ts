// Card flags after an activity action ([ARCH-4] step 2): patch every cached card of this movie in
// place (home sections, lists, browse, search, similar, recs, me lists). No refetch, so no extra
// load on the rate limits.
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import type { MovieCard } from '@/api/types';
import type { Viewer } from './keys';

export type CardFlags = Partial<Pick<MovieCard, 'inWatchlist' | 'watched'>>;

function isCard(value: unknown): value is MovieCard {
  return typeof value === 'object' && value !== null && 'movieId' in value && 'title' in value;
}

function patchCards(cards: unknown[], movieId: number, flags: CardFlags): unknown[] | null {
  let changed = false;
  const next = cards.map((card) => {
    if (!isCard(card) || card.movieId !== movieId) return card;
    changed = true;
    return { ...card, ...flags };
  });
  return changed ? next : null;
}

/** Returns the patched data, or the same object when it holds no card of this movie. */
export function patchData(data: unknown, movieId: number, flags: CardFlags): unknown {
  if (Array.isArray(data)) return patchCards(data, movieId, flags) ?? data;
  if (typeof data !== 'object' || data === null) return data;

  // Page<MovieCard> (lists, browse, search, recs, me lists)
  if ('results' in data && Array.isArray(data.results)) {
    const results = patchCards(data.results, movieId, flags);
    return results ? { ...data, results } : data;
  }
  // HomeResponse
  if ('sections' in data && Array.isArray(data.sections)) {
    let changed = false;
    const sections = data.sections.map((section: unknown) => {
      const patched = patchData(section, movieId, flags);
      if (patched !== section) changed = true;
      return patched;
    });
    return changed ? { ...data, sections } : data;
  }
  return data;
}

/** What `patchCardFlags` replaced, to put back on rollback. */
export type CardSnapshot = [QueryKey, unknown][];

/** Patches the flags of one movie in every cached card list of this viewer. */
export function patchCardFlags(
  queryClient: QueryClient,
  v: Viewer,
  movieId: number,
  flags: CardFlags,
): CardSnapshot {
  const snapshot: CardSnapshot = [];
  for (const query of queryClient.getQueryCache().findAll({ queryKey: [v] })) {
    const data = query.state.data;
    if (data === undefined) continue;
    const patched = patchData(data, movieId, flags);
    if (patched === data) continue;
    snapshot.push([query.queryKey, data]);
    queryClient.setQueryData(query.queryKey, patched);
  }
  return snapshot;
}

export function restoreCards(queryClient: QueryClient, snapshot: CardSnapshot): void {
  for (const [queryKey, data] of snapshot) queryClient.setQueryData(queryKey, data);
}
