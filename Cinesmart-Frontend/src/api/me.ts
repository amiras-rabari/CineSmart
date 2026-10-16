// "Me" API: contract [ME-1] … [ME-5]. Login required; one shared read budget of 120/min ([LIMIT-2]).
import type { PageParams } from './discovery';
import { request } from './http';
import type { MovieCard, Page } from './types';

/** contract [ME-1] */
export interface Profile {
  userId: number;
  username: string;
  email: string;
  createdAt: string;
  watchlistCount: number;
  watchedCount: number;
  ratingCount: number;
}

/** contract [ME-2]: newest added first. */
export interface WatchlistItem extends MovieCard {
  addedAt: string;
}

/** contract [ME-3]: most recently rated first. */
export interface RatedItem extends MovieCard {
  rating: number;
  ratedAt: string;
}

/** contract [ME-4] */
export interface WatchedItem {
  movieId: number;
  watchedAt: string;
}

/** contract [ME-5]: only LIKE and DISLIKE are listed. */
export interface ReactionItem {
  movieId: number;
  reaction: 'LIKE' | 'DISLIKE';
  reactedAt: string;
}

export function getProfile(signal?: AbortSignal): Promise<Profile> {
  return request('GET', '/me', { auth: 'required', signal });
}

export function getWatchlist(
  { page, size }: PageParams,
  signal?: AbortSignal,
): Promise<Page<WatchlistItem>> {
  return request('GET', '/me/watchlist', { auth: 'required', query: { page, size }, signal });
}

export function getRatings(
  { page, size }: PageParams,
  signal?: AbortSignal,
): Promise<Page<RatedItem>> {
  return request('GET', '/me/ratings', { auth: 'required', query: { page, size }, signal });
}

/** The whole list in one response (size = `watchedCount`). */
export function getWatched(signal?: AbortSignal): Promise<WatchedItem[]> {
  return request('GET', '/me/watched', { auth: 'required', signal });
}

export function getReactions(signal?: AbortSignal): Promise<ReactionItem[]> {
  return request('GET', '/me/reactions', { auth: 'required', signal });
}
