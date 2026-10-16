import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { MovieCard } from '@/api/types';
import { api } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoutes } from '@/test/render';
import { Component as SearchPage } from './SearchPage';

const interstellar: MovieCard = {
  movieId: 118,
  title: 'Interstellar',
  year: 2014,
  poster: null,
  imdbRating: 8.7,
  averageRating: 8.4,
  likeCount: 9,
  dislikeCount: 1,
  inWatchlist: null,
  watched: null,
};

function searchHandler(results: MovieCard[] = [interstellar]) {
  const seen: URLSearchParams[] = [];
  server.use(
    http.get(api('/movies/search'), ({ request }) => {
      seen.push(new URL(request.url).searchParams);
      return HttpResponse.json({
        results,
        page: 0,
        size: 20,
        totalResults: results.length,
        totalPages: results.length ? 1 : 0,
      });
    }),
  );
  return seen;
}

function renderSearch(entry: string) {
  return renderRoutes([{ path: '/search', Component: SearchPage }], entry);
}

describe('SearchPage', () => {
  it('q "ab" → hint, no request', async () => {
    const seen = searchHandler();
    renderSearch('/search?q=ab');
    expect(await screen.findByRole('alert')).toHaveTextContent('Type at least 3 characters.');
    expect(screen.getByRole('searchbox', { name: 'Search movies or people' })).toHaveValue('ab');
    expect(seen).toHaveLength(0);
  });

  it('a valid q is sent trimmed and shows the results', async () => {
    const seen = searchHandler();
    renderSearch('/search?q=%20%20inter%20%20');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Results for “inter”' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Interstellar/ })).toBeInTheDocument();
    expect(screen.getByText('1 title')).toBeInTheDocument();
    expect(seen).toHaveLength(1);
    expect(seen[0]?.get('q')).toBe('inter');
    expect(seen[0]?.get('page')).toBe('0');
    expect(seen[0]?.get('size')).toBe('20');
  });

  it('no match → empty state with tips', async () => {
    searchHandler([]);
    renderSearch('/search?q=zzqxv');
    expect(await screen.findByText('No movies or people match “zzqxv”.')).toBeInTheDocument();
    expect(screen.getByText(/Check the spelling/)).toBeInTheDocument();
  });

  it('submitting a too-short query shows the hint and does not navigate', async () => {
    const seen = searchHandler();
    const { location } = renderSearch('/search');
    const box = screen.getByRole('searchbox', { name: 'Search movies or people' });
    await userEvent.type(box, ' ab {Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent('Type at least 3 characters.');
    expect(location()).toBe('/search');
    await userEvent.clear(box);
    await userEvent.type(box, 'nolan{Enter}');
    expect(location()).toBe('/search?q=nolan');
    expect(await screen.findByRole('link', { name: /Interstellar/ })).toBeInTheDocument();
    expect(seen.map((p) => p.get('q'))).toEqual(['nolan']);
  });
});
