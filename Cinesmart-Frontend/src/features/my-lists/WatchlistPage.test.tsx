import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import type { WatchlistItem } from '@/api/me';
import { card, neutralState, pageOf } from '@/test/fixtures';
import { api } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoutes } from '@/test/render';
import { signInForTests } from '@/test/session';
import { Component as WatchlistPage } from './WatchlistPage';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() } }));

const item = (movieId: number): WatchlistItem => ({
  ...card(movieId, { inWatchlist: true, watched: false }),
  addedAt: '2026-10-11T20:15:03.481922Z',
});

describe('WatchlistPage', () => {
  it('removing the only item on the last page moves back a page', async () => {
    signInForTests();
    let ids = Array.from({ length: 21 }, (_, i) => i + 1);
    const deleted: number[] = [];
    server.use(
      http.get(api('/me/watched'), () => HttpResponse.json([])),
      http.get(api('/me/watchlist'), ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get('page'));
        const slice = ids.slice(page * 20, page * 20 + 20).map(item);
        return HttpResponse.json(pageOf(slice, { page, totalResults: ids.length }));
      }),
      http.delete(api('/movies/:id/watchlist'), ({ params }) => {
        const id = Number(params.id);
        deleted.push(id);
        ids = ids.filter((x) => x !== id);
        return HttpResponse.json(neutralState);
      }),
    );
    const { location } = renderRoutes(
      [{ path: '/watchlist', Component: WatchlistPage }],
      '/watchlist?page=2',
    );

    expect(await screen.findByText('21 titles')).toBeInTheDocument();
    expect(screen.getByText('Added Oct 11, 2026')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove from watchlist: Film 21' }));

    await waitFor(() => expect(location()).toBe('/watchlist'));
    expect(await screen.findByText('20 titles')).toBeInTheDocument();
    expect(deleted).toEqual([21]);
    await waitFor(() => expect(screen.getAllByRole('link', { name: /Film \d+/ })).toHaveLength(20));
  });

  it('empty → empty state with a Browse link', async () => {
    signInForTests();
    server.use(http.get(api('/me/watchlist'), () => HttpResponse.json(pageOf([]))));
    renderRoutes([{ path: '/watchlist', Component: WatchlistPage }], '/watchlist');
    expect(await screen.findByText('Your watchlist is empty.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse movies' })).toHaveAttribute('href', '/browse');
  });
});
