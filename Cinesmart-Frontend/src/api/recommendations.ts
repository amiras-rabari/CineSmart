// Recommendations API: contract [REC-1] [REC-2].
import type { PageParams } from './discovery';
import { request } from './http';
import type { MovieCard, Page } from './types';

/** contract [REC-1]: a card plus why it was picked. */
export interface RecommendationCard extends MovieCard {
  reason: string;
}
export type RecommendationPage = Page<RecommendationCard>;

/** Cold-start reason (contract [REC-1]). */
export const COLD_START_REASON = 'Popular on CineSmart';

/** contract [REC-1]: login required; recomputed per request. */
export function getRecommendations(
  { page, size }: PageParams,
  signal?: AbortSignal,
): Promise<RecommendationPage> {
  return request('GET', '/recommendations', { auth: 'required', query: { page, size }, signal });
}

/** contract [REC-2]: plain array; signed in, watched and disliked movies are excluded. */
export function getSimilar(
  movieId: number,
  size: number,
  signal?: AbortSignal,
): Promise<MovieCard[]> {
  return request('GET', `/movies/${movieId}/similar`, {
    auth: 'optional',
    query: { size },
    signal,
  });
}
