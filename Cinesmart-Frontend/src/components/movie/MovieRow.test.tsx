import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MovieCard, Page } from '@/api/types';
import { renderRoutes } from '@/test/render';
import { MovieRow, type RowPageQuery } from './MovieRow';

function card(movieId: number): MovieCard {
  return {
    movieId,
    title: `Movie ${movieId}`,
    year: 2000,
    poster: null,
    imdbRating: 8,
    averageRating: null,
    likeCount: 0,
    dislikeCount: 0,
    inWatchlist: null,
    watched: null,
  };
}
const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

function pageOf(ids: number[], page: number, totalResults: number): Page<MovieCard> {
  return {
    results: ids.map(card),
    page,
    size: 10,
    totalResults,
    totalPages: Math.ceil(totalResults / 10),
  };
}

/** jsdom has no layout: fake a scroller scrolled to its end, then fire scroll. */
function scrollToEnd(list: HTMLElement) {
  Object.defineProperties(list, {
    scrollWidth: { configurable: true, value: 2000 },
    clientWidth: { configurable: true, value: 500 },
    scrollLeft: { configurable: true, value: 1500 },
  });
  fireEvent.scroll(list);
}

function renderRow(pages: Record<number, number[]>, totalResults: number) {
  const fetched: number[] = [];
  const pageQuery: RowPageQuery = (page) => ({
    queryKey: ['test-row', page],
    queryFn: () => {
      fetched.push(page);
      return Promise.resolve(pageOf(pages[page] ?? [], page, totalResults));
    },
  });
  renderRoutes(
    [
      {
        path: '/',
        element: (
          <MovieRow
            title="IMDb Top 250"
            seeAllHref="/lists/imdb-top-250"
            totalResults={totalResults}
            initial={range(1, 10).map(card)}
            pageQuery={pageQuery}
          />
        ),
      },
    ],
    '/',
  );
  const list = screen.getByRole('list', { name: 'IMDb Top 250' });
  const titles = () =>
    within(list)
      .queryAllByRole('link', { name: /^Movie \d+/ })
      .map((a) => a.getAttribute('aria-label'));
  return { list, fetched, titles };
}

describe('MovieRow', () => {
  it('appends the next page on scroll and de-duplicates by movieId', async () => {
    const { list, fetched, titles } = renderRow({ 1: range(9, 18) }, 25);
    expect(titles()).toHaveLength(10);
    // The See all tile appears only once the row can't load more.
    expect(within(list).queryByRole('link', { name: /See all/ })).not.toBeInTheDocument();

    scrollToEnd(list);
    await waitFor(() => expect(titles()).toHaveLength(18));
    expect(fetched).toEqual([1]);
    expect(new Set(titles()).size).toBe(18);
  });

  it('stops at totalResults and ends with a See all tile', async () => {
    const { list, fetched, titles } = renderRow({ 1: range(11, 20), 2: range(21, 25) }, 25);
    scrollToEnd(list);
    await waitFor(() => expect(titles()).toHaveLength(20));
    scrollToEnd(list);
    await waitFor(() => expect(titles()).toHaveLength(25));
    expect(within(list).getByRole('link', { name: /See all/ })).toHaveAttribute(
      'href',
      '/lists/imdb-top-250',
    );

    scrollToEnd(list);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetched).toEqual([1, 2]);
  });

  it('does not fetch while far from the end', () => {
    const { list, fetched } = renderRow({ 1: range(11, 20) }, 25);
    Object.defineProperties(list, {
      scrollWidth: { configurable: true, value: 3000 },
      clientWidth: { configurable: true, value: 500 },
      scrollLeft: { configurable: true, value: 100 },
    });
    fireEvent.scroll(list);
    expect(fetched).toEqual([]);
  });

  it('shows "Couldn\'t load more" with Retry when a page fails', async () => {
    const queryFn = vi
      .fn<() => Promise<Page<MovieCard>>>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue(pageOf(range(11, 20), 1, 25));
    renderRoutes(
      [
        {
          path: '/',
          element: (
            <MovieRow
              title="Trending"
              totalResults={25}
              initial={range(1, 10).map(card)}
              pageQuery={(page) => ({ queryKey: ['fail-row', page], queryFn })}
            />
          ),
        },
      ],
      '/',
    );
    scrollToEnd(screen.getByRole('list', { name: 'Trending' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getAllByRole('link', { name: /^Movie/ })).toHaveLength(20));
  });
});
