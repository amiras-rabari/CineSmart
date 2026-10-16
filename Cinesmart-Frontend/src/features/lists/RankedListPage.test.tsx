import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { MovieCard } from '@/api/types';
import { pageItems } from '@/components/movie/page-items';
import { parsePageParam } from '@/hooks/use-page-param';
import { api } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoutes } from '@/test/render';
import { Component as RankedListPage } from './RankedListPage';

function cards(count: number, from = 1): MovieCard[] {
  return Array.from({ length: count }, (_, i) => ({
    movieId: from + i,
    title: `Film ${from + i}`,
    year: 1999,
    poster: null,
    imdbRating: 9.1,
    averageRating: null,
    likeCount: 0,
    dislikeCount: 0,
    inWatchlist: null,
    watched: null,
  }));
}

function renderList(entry: string) {
  return renderRoutes([{ path: '/lists/:listKey', Component: RankedListPage }], entry);
}

describe('RankedListPage', () => {
  it('an unknown list key shows the 404 page without a request', () => {
    renderList('/lists/nope');
    expect(
      screen.getByRole('heading', { level: 1, name: "We couldn't find that page." }),
    ).toBeInTheDocument();
  });

  it('?page=2 requests API page 1 with size 20 and paginates', async () => {
    let seen: URLSearchParams | undefined;
    server.use(
      http.get(api('/movies/imdb-top-250'), ({ request }) => {
        seen = new URL(request.url).searchParams;
        return HttpResponse.json({
          results: cards(20, 21),
          page: 1,
          size: 20,
          totalResults: 250,
          totalPages: 13,
        });
      }),
    );
    renderList('/lists/imdb-top-250?page=2');
    expect(screen.getByRole('heading', { level: 1, name: 'IMDb Top 250' })).toBeInTheDocument();
    expect(await screen.findByText('250 titles')).toBeInTheDocument();
    expect(seen?.get('page')).toBe('1');
    expect(seen?.get('size')).toBe('20');
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(20);
    expect(screen.getByRole('link', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Page 13' })).toHaveAttribute(
      'href',
      '/lists/imdb-top-250?page=13',
    );
    expect(screen.getByRole('link', { name: /Previous/ })).toHaveAttribute(
      'href',
      '/lists/imdb-top-250',
    );
  });

  it('an empty top-rated list shows its empty state', async () => {
    server.use(
      http.get(api('/movies/top-rated'), () =>
        HttpResponse.json({ results: [], page: 0, size: 20, totalResults: 0, totalPages: 0 }),
      ),
    );
    renderList('/lists/top-rated');
    expect(await screen.findByText(/No movie has 5 ratings yet/)).toBeInTheDocument();
  });
});

describe('page helpers', () => {
  it.each([
    [null, 1],
    ['', 1],
    ['3', 3],
    ['0', 1],
    ['-2', 1],
    ['abc', 1],
    ['2.5', 1],
  ])('parsePageParam(%j) → %d', (input, expected) => {
    expect(parsePageParam(input)).toBe(expected);
  });

  it('pageItems shows first, last, current ± 1 and gaps', () => {
    expect(pageItems(1, 1)).toEqual([1]);
    expect(pageItems(1, 13)).toEqual([1, 2, 'gap', 13]);
    expect(pageItems(7, 13)).toEqual([1, 'gap', 6, 7, 8, 'gap', 13]);
    expect(pageItems(3, 13)).toEqual([1, 2, 3, 4, 'gap', 13]);
    expect(pageItems(13, 13)).toEqual([1, 'gap', 12, 13]);
  });
});
