import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { MovieCard } from '@/api/types';
import { api, errorResponse } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoutes } from '@/test/render';
import { Component as BrowsePage } from './BrowsePage';

const NOTICE = "That filter isn't available, so it was removed.";

function cards(count: number): MovieCard[] {
  return Array.from({ length: count }, (_, i) => ({
    movieId: i + 1,
    title: `Film ${i + 1}`,
    year: 2014,
    poster: null,
    imdbRating: 8.1,
    averageRating: null,
    likeCount: 0,
    dislikeCount: 0,
    inWatchlist: null,
    watched: null,
  }));
}

const pageOf = (results: MovieCard[]) => ({
  results,
  page: 0,
  size: 20,
  totalResults: results.length,
  totalPages: results.length ? 1 : 0,
});

/** Records every /movies query string; `respond` decides the answer. */
function browseHandler(
  respond: (params: URLSearchParams) => Response = () => HttpResponse.json(pageOf(cards(3))),
) {
  const seen: string[] = [];
  server.use(
    http.get(api('/languages'), () => HttpResponse.json([{ id: 1, name: 'English' }])),
    http.get(api('/movies'), ({ request }) => {
      const params = new URL(request.url).searchParams;
      seen.push(params.toString());
      return respond(params);
    }),
  );
  return seen;
}

function renderBrowse(entry: string) {
  return renderRoutes([{ path: '/browse', Component: BrowsePage }], entry);
}

describe('BrowsePage', () => {
  it('no filters → all movies, page 0 size 20, no empty params sent', async () => {
    const seen = browseHandler();
    renderBrowse('/browse');
    expect(screen.getByRole('heading', { level: 1, name: 'All movies' })).toBeInTheDocument();
    expect(await screen.findByText('3 movies')).toBeInTheDocument();
    expect(seen).toEqual(['page=0&size=20']);
  });

  it('a non-numeric filter is dropped with the notice; the others are kept', async () => {
    const seen = browseHandler();
    const { location } = renderBrowse('/browse?genreId=abc&year=2014&page=2');
    expect(await screen.findByText(NOTICE)).toBeInTheDocument();
    expect(location()).toBe('/browse?year=2014');
    await screen.findByText('3 movies');
    expect(seen).toEqual(['year=2014&page=0&size=20']);
    expect(screen.getByRole('heading', { level: 1, name: '2014' })).toBeInTheDocument();
  });

  it('a filter the API rejects (400 fields.genreId) is dropped, the year kept', async () => {
    const seen = browseHandler((params) =>
      params.has('genreId')
        ? errorResponse(400, 'VALIDATION_FAILED', 'Invalid request fields', {
            fields: { genreId: 'Unknown genre' },
          })
        : HttpResponse.json(pageOf(cards(2))),
    );
    const { location } = renderBrowse('/browse?genreId=99999&year=2014');
    expect(await screen.findByText('2 movies')).toBeInTheDocument();
    expect(screen.getByText(NOTICE)).toBeInTheDocument();
    expect(location()).toBe('/browse?year=2014');
    expect(seen).toEqual(['genreId=99999&year=2014&page=0&size=20', 'year=2014&page=0&size=20']);
  });

  it('no results for the filters → empty state with Clear filters', async () => {
    browseHandler(() => HttpResponse.json(pageOf([])));
    renderBrowse('/browse?year=1921');
    expect(await screen.findByText('No movies match these filters.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
  });
});
