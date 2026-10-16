import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserMovieState } from '@/api/types';
import { api, errorResponse } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { card, movieDetails, neutralState } from '@/test/fixtures';
import { renderRoutes } from '@/test/render';
import { signInForTests } from '@/test/session';
import { SIGN_IN_PROMPT } from './use-movie-actions';
import { Component as MovieDetailsPage } from './MovieDetailsPage';

const { toastError, toastInfo } = vi.hoisted(() => ({ toastError: vi.fn(), toastInfo: vi.fn() }));
vi.mock('sonner', () => ({ toast: { error: toastError, info: toastInfo, success: vi.fn() } }));

beforeEach(() => {
  toastError.mockReset();
  toastInfo.mockReset();
});

function renderDetails(entry = '/movies/118') {
  return renderRoutes(
    [
      { path: '/movies/:movieId', Component: MovieDetailsPage },
      { path: '/login', element: <p>Login page</p> },
    ],
    entry,
  );
}

/** Details + similar (+ the watched set when signed in). */
function detailsHandlers(userState: UserMovieState | null) {
  server.use(
    http.get(api('/movies/118'), () => HttpResponse.json(movieDetails({ userState }))),
    http.get(api('/movies/118/similar'), () =>
      HttpResponse.json([card(412, { title: 'Inception', inWatchlist: userState ? false : null })]),
    ),
    http.get(api('/me/watched'), () => HttpResponse.json([])),
  );
}

describe('MovieDetailsPage (anonymous)', () => {
  it('shows every section and no user state', async () => {
    detailsHandlers(null);
    renderDetails();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Interstellar' }),
    ).toBeInTheDocument();
    expect(screen.getByText('2014 · 2h 49m · Movie')).toBeInTheDocument();
    expect(screen.getByText('8.7/10')).toBeInTheDocument();
    expect(screen.getByText('2.2M votes')).toBeInTheDocument();
    expect(screen.getByText('73%')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sci-Fi' })).toHaveAttribute(
      'href',
      '/browse?genreId=15',
    );
    expect(screen.getByRole('link', { name: 'Christopher Nolan' })).toHaveAttribute(
      'href',
      '/search?q=Christopher%20Nolan',
    );
    expect(screen.getByText('November 7, 2014')).toBeInTheDocument();
    const netflix = screen.getByRole('link', { name: /Netflix/ });
    expect(netflix).toHaveAttribute('target', '_blank');
    expect(netflix).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText('Apple TV').closest('a')).toBeNull();
    expect(screen.getByRole('button', { name: 'Add to watchlist' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(await screen.findByRole('heading', { name: 'More like this' })).toBeInTheDocument();
  });

  it('an action asks to sign in and comes back here', async () => {
    detailsHandlers(null);
    const { location } = renderDetails();
    await userEvent.click(await screen.findByRole('button', { name: 'Add to watchlist' }));
    expect(location()).toBe('/login?redirect=%2Fmovies%2F118');
    expect(toastInfo).toHaveBeenCalledWith(SIGN_IN_PROMPT);
  });

  it('an unknown id shows "Movie not found"; a non-numeric id the 404 page', async () => {
    server.use(
      http.get(api('/movies/999999'), () =>
        errorResponse(404, 'MOVIE_NOT_FOUND', 'Movie was not found with id: 999999'),
      ),
    );
    renderDetails('/movies/999999');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Movie not found.' }),
    ).toBeInTheDocument();
  });

  it('/movies/abc → 404 page without a request', () => {
    renderDetails('/movies/abc');
    expect(
      screen.getByRole('heading', { level: 1, name: "We couldn't find that page." }),
    ).toBeInTheDocument();
  });
});

describe('MovieDetailsPage (signed in)', () => {
  it('watchlist flips at once, then applies the server state', async () => {
    signInForTests();
    detailsHandlers(neutralState);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      http.put(api('/movies/118/watchlist'), async ({ request }) => {
        expect(request.headers.get('Authorization')).toBe('Bearer test-token');
        await gate;
        // The server also says "watched" (e.g. marked in another tab): its state wins.
        return HttpResponse.json({ ...neutralState, inWatchlist: true, watched: true });
      }),
    );
    renderDetails();
    await userEvent.click(await screen.findByRole('button', { name: 'Add to watchlist' }));

    const remove = screen.getByRole('button', { name: 'Remove from watchlist' });
    expect(remove).toHaveAttribute('aria-pressed', 'true');
    expect(remove).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Mark as watched' })).toBeInTheDocument();

    release();
    expect(await screen.findByRole('button', { name: 'Watched' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Remove from watchlist' })).not.toHaveAttribute(
      'aria-busy',
    );
  });

  it('watchlist rolls back with a toast when the server fails', async () => {
    signInForTests();
    detailsHandlers(neutralState);
    server.use(
      http.put(api('/movies/118/watchlist'), async () => {
        await delay(20);
        return errorResponse(500, 'INTERNAL_ERROR', 'boom');
      }),
    );
    renderDetails();
    await userEvent.click(await screen.findByRole('button', { name: 'Add to watchlist' }));
    expect(screen.getByRole('button', { name: 'Remove from watchlist' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Add to watchlist' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(toastError).toHaveBeenCalledWith('Something went wrong. Please try again.', {
      id: 'error:INTERNAL_ERROR',
    });
  });

  it('like → dislike → dislike again sends PUT LIKE, PUT DISLIKE, DELETE; busy while pending', async () => {
    signInForTests();
    detailsHandlers(neutralState);
    const sent: string[] = [];
    let state: UserMovieState = neutralState;
    server.use(
      http.put(api('/movies/118/reaction'), async ({ request }) => {
        const { reaction } = (await request.json()) as { reaction: 'LIKE' | 'DISLIKE' };
        sent.push(`PUT ${reaction}`);
        // The first request stays in flight while the test clicks Dislike.
        await delay(sent.length === 1 ? 300 : 20);
        state = { ...state, reaction };
        return HttpResponse.json(state);
      }),
      http.delete(api('/movies/118/reaction'), async () => {
        sent.push('DELETE');
        await delay(20);
        state = { ...state, reaction: 'NEUTRAL' };
        return HttpResponse.json(state);
      }),
    );
    renderDetails();
    const group = within(await screen.findByRole('group', { name: 'Your reaction' }));
    const like = group.getByRole('button', { name: 'Like' });
    const dislike = group.getByRole('button', { name: 'Dislike' });

    const settled = async (count: number) => {
      await waitFor(() => expect(sent).toHaveLength(count));
      await waitFor(() => expect(dislike).not.toHaveAttribute('aria-busy'));
    };

    await userEvent.click(like);
    await waitFor(() => expect(like).toHaveAttribute('aria-pressed', 'true'));
    expect(like).toHaveAttribute('aria-disabled', 'true');
    expect(dislike).toHaveAttribute('aria-disabled', 'true');
    // Ignored while pending (no second request).
    await userEvent.click(dislike);
    await settled(1);

    await userEvent.click(dislike);
    await settled(2);
    expect(dislike).toHaveAttribute('aria-pressed', 'true');
    expect(like).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(dislike);
    await settled(3);
    expect(dislike).toHaveAttribute('aria-pressed', 'false');
    expect(like).toHaveAttribute('aria-pressed', 'false');

    expect(sent).toEqual(['PUT LIKE', 'PUT DISLIKE', 'DELETE']);
    expect(
      screen.getByText('Your rating counts toward the CineSmart average within the hour.'),
    ).toBeInTheDocument();
  });
});
