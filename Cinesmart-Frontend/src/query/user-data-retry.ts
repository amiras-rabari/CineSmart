// Safety net from plan [ARCH-2]: a JWT-optional GET answers anonymously (flags `null`) when the
// token was expired or revoked, never 401 (contract [CONV-2]). If that happens while signed in,
// refresh once and fetch once more.
import type { MovieCard } from '@/api/types';
import { refreshSession } from '@/session/refresh';
import { getSession } from '@/session/session-store';

export async function fetchWithUserData<T>(
  fetch: () => Promise<T>,
  hasUserData: (data: T) => boolean,
): Promise<T> {
  const data = await fetch();
  if (getSession().status !== 'authenticated' || hasUserData(data)) return data;
  const refreshed = await refreshSession().catch(() => false);
  return refreshed ? fetch() : data;
}

/** Cards carry user flags (or there are no cards to tell). */
export function cardsHaveFlags(cards: readonly MovieCard[]): boolean {
  return cards.every((card) => card.inWatchlist !== null);
}
