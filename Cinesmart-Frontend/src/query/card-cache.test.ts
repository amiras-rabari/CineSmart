import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import type { HomeResponse } from '@/api/discovery';
import type { MovieCard, Page } from '@/api/types';
import { card, pageOf } from '@/test/fixtures';
import { patchCardFlags, restoreCards } from './card-cache';
import { keys } from './keys';

function seed() {
  const qc = new QueryClient();
  const v = 42;
  const home: HomeResponse = {
    sections: [
      {
        key: 'trending',
        title: 'Trending',
        endpoint: '/x',
        totalResults: 2,
        results: [card(1), card(2)],
      },
      { key: 'imdb-top-250', title: 'Top', endpoint: '/y', totalResults: 1, results: [card(2)] },
    ],
  };
  qc.setQueryData(keys.home(v), home);
  qc.setQueryData(keys.list(v, 'trending', 1, 10), pageOf([card(2), card(3)]));
  qc.setQueryData(keys.search(v, 'inter', 0, 20), pageOf([card(2)]));
  qc.setQueryData(keys.similar(v, 9, 10), [card(2), card(5)]);
  qc.setQueryData(keys.home('anon'), home);
  return { qc, v, home };
}

describe('patchCardFlags', () => {
  it('patches the movie in home, list, search and similar caches of this viewer only', () => {
    const { qc, v, home } = seed();
    const snapshot = patchCardFlags(qc, v, 2, { inWatchlist: true });

    const patchedHome = qc.getQueryData<HomeResponse>(keys.home(v))!;
    expect(patchedHome.sections[0]!.results.map((c) => c.inWatchlist)).toEqual([null, true]);
    expect(patchedHome.sections[1]!.results[0]!.inWatchlist).toBe(true);
    expect(
      qc.getQueryData<Page<MovieCard>>(keys.list(v, 'trending', 1, 10))!.results[0]!.inWatchlist,
    ).toBe(true);
    expect(
      qc.getQueryData<Page<MovieCard>>(keys.search(v, 'inter', 0, 20))!.results[0]!.inWatchlist,
    ).toBe(true);
    expect(qc.getQueryData<MovieCard[]>(keys.similar(v, 9, 10))!.map((c) => c.inWatchlist)).toEqual(
      [true, null],
    );
    // Other viewers and other fields are untouched.
    expect(qc.getQueryData(keys.home('anon'))).toBe(home);
    expect(patchedHome.sections[0]!.results[1]!.watched).toBeNull();
    expect(snapshot).toHaveLength(4);

    restoreCards(qc, snapshot);
    expect(qc.getQueryData(keys.home(v))).toEqual(home);
  });

  it('leaves caches without that movie as they are', () => {
    const { qc, v } = seed();
    expect(patchCardFlags(qc, v, 999, { watched: true })).toEqual([]);
  });
});
