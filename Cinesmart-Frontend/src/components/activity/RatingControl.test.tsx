import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { parseRating } from '@/lib/rating';
import { neutralState } from '@/test/fixtures';
import { api } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoutes } from '@/test/render';
import { signInForTests } from '@/test/session';
import { RatingControl } from './RatingControl';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() } }));

function renderControl(rating: number | null) {
  return renderRoutes(
    [{ path: '/movies/:id', element: <RatingControl movieId={118} rating={rating} /> }],
    '/movies/118',
  );
}

function ratingHandlers() {
  const sent: string[] = [];
  server.use(
    http.put(api('/movies/118/rating'), async ({ request }) => {
      sent.push(`PUT ${JSON.stringify(await request.json())}`);
      return HttpResponse.json({ ...neutralState, rating: 8.5 });
    }),
    http.delete(api('/movies/118/rating'), () => {
      sent.push('DELETE');
      return HttpResponse.json(neutralState);
    }),
  );
  return sent;
}

describe('parseRating', () => {
  it.each([
    ['8.5', 8.5],
    ['8', 8],
    ['10', 10],
    ['1.0', 1],
    [' 7,5 ', 7.5],
    ['8.55', null],
    ['0.5', null],
    ['11', null],
    ['10.5', null],
    ['abc', null],
    ['', null],
  ])('%j → %j', (input, expected) => {
    expect(parseRating(input)).toBe(expected);
  });
});

describe('RatingControl', () => {
  it('rejects 8.55, 0.5 and 11 before sending; sends 8.5', async () => {
    signInForTests();
    const sent = ratingHandlers();
    renderControl(null);
    await userEvent.click(screen.getByRole('button', { name: 'Rate' }));
    const input = screen.getByRole('textbox', { name: 'Your rating' });
    const save = screen.getByRole('button', { name: 'Save' });

    for (const bad of ['8.55', '0.5', '11']) {
      await userEvent.clear(input);
      await userEvent.type(input, bad);
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(save).toBeDisabled();
    }
    await userEvent.type(input, '{Enter}');
    expect(sent).toEqual([]);

    await userEvent.clear(input);
    await userEvent.type(input, '8.5');
    expect(save).toBeEnabled();
    await userEvent.click(save);
    await waitFor(() => expect(sent).toEqual(['PUT {"rating":8.5}']));
  });

  it('Remove rating sends DELETE; Save is disabled while unchanged', async () => {
    signInForTests();
    const sent = ratingHandlers();
    renderControl(8.5);
    await userEvent.click(screen.getByRole('button', { name: 'Your rating: 8.5. Change rating' }));
    expect(screen.getByRole('textbox', { name: 'Your rating' })).toHaveValue('8.5');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Remove rating' }));
    await waitFor(() => expect(sent).toEqual(['DELETE']));
  });

  it('anonymous: opening asks to sign in instead', async () => {
    const { location } = renderRoutes(
      [
        { path: '/movies/:id', element: <RatingControl movieId={118} rating={null} /> },
        { path: '/login', element: <p>Login</p> },
      ],
      '/movies/118',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Rate' }));
    expect(location()).toBe('/login?redirect=%2Fmovies%2F118');
  });
});
