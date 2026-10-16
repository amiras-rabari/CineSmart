// [P6] error matrix: RATE_LIMITED (with/without Retry-After), SERVICE_UNAVAILABLE, NETWORK_ERROR and
// INTERNAL_ERROR on every kind of screen, with the [ARCH-3] behaviour for each.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Profile } from '@/api/me';
import { Component as LoginPage } from '@/features/auth/LoginPage';
import { Component as HomePage } from '@/features/home/HomePage';
import { Component as RankedListPage } from '@/features/lists/RankedListPage';
import { Component as MovieDetailsPage } from '@/features/movie/MovieDetailsPage';
import { EMAIL_SEND_FAILED } from '@/features/profile/ChangeEmailForm';
import { Component as ProfilePage } from '@/features/profile/ProfilePage';
import { card, movieDetails, neutralState, pageOf } from '@/test/fixtures';
import { api, errorResponse } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoutes } from '@/test/render';
import { signInForTests } from '@/test/session';

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock('sonner', () => ({ toast: { error: toastError, info: vi.fn(), success: vi.fn() } }));

beforeEach(() => toastError.mockReset());

type Variant = 'limited' | 'limitedNoRetryAfter' | 'unavailable' | 'network' | 'internal';
const VARIANTS: Variant[] = [
  'limited',
  'limitedNoRetryAfter',
  'unavailable',
  'network',
  'internal',
];

/** The failure as the backend (or the network) would send it; `path` is the request's path. */
function failure(variant: Variant, path: string) {
  switch (variant) {
    case 'limited':
      return errorResponse(429, 'RATE_LIMITED', 'Too many requests. Try again later.', {
        path,
        headers: { 'Retry-After': '42' },
      });
    case 'limitedNoRetryAfter':
      return errorResponse(429, 'RATE_LIMITED', 'Too many failed login attempts.', { path });
    case 'unavailable':
      return errorResponse(503, 'SERVICE_UNAVAILABLE', 'Service temporarily unavailable.', {
        path,
      });
    case 'network':
      return HttpResponse.error();
    case 'internal':
      return errorResponse(500, 'INTERNAL_ERROR', 'Unexpected error', { path });
  }
}

/** [ARCH-3] query copy: heading + body (or the countdown) of `ErrorState`. */
const QUERY_COPY: Record<Variant, [heading: string, body: string]> = {
  limited: ["You're going a bit fast", 'Too many requests. Try again in 42 s.'],
  limitedNoRetryAfter: ["We couldn't load this", 'Too many requests. Please try again later.'],
  unavailable: [
    'Temporarily unavailable',
    'This is temporarily unavailable. Please try again in a moment.',
  ],
  network: ["We couldn't load this", "We couldn't load this. Check your connection and try again."],
  internal: ["We couldn't load this", "We couldn't load this."],
};

async function expectErrorState(variant: Variant) {
  const [heading, body] = QUERY_COPY[variant];
  const alert = await screen.findByRole('alert');
  expect(within(alert).getByRole('heading', { name: heading })).toBeInTheDocument();
  expect(within(alert).getByText(body)).toBeInTheDocument();
  const retry = within(alert).getByRole('button', { name: 'Retry' });
  if (variant === 'limited') expect(retry).toBeDisabled();
  else expect(retry).toBeEnabled();
}

describe.each(VARIANTS)('query screens: %s', (variant) => {
  it('home shows ErrorState', async () => {
    server.use(http.get(api('/home'), () => failure(variant, '/api/v1/home')));
    renderRoutes([{ path: '/', Component: HomePage }], '/');
    await expectErrorState(variant);
  });

  it('a ranked list shows ErrorState', async () => {
    server.use(
      http.get(api('/movies/trending'), () => failure(variant, '/api/v1/movies/trending')),
    );
    renderRoutes([{ path: '/lists/:listKey', Component: RankedListPage }], '/lists/trending');
    await expectErrorState(variant);
  });

  it('details shows ErrorState', async () => {
    server.use(
      http.get(api('/movies/118'), () => failure(variant, '/api/v1/movies/118')),
      http.get(api('/movies/118/similar'), () => HttpResponse.json([])),
    );
    renderRoutes([{ path: '/movies/:movieId', Component: MovieDetailsPage }], '/movies/118');
    await expectErrorState(variant);
  });
});

describe('query countdown', () => {
  it('retries by itself when the Retry-After countdown reaches 0', async () => {
    let calls = 0;
    server.use(
      http.get(api('/movies/trending'), () =>
        ++calls === 1
          ? errorResponse(429, 'RATE_LIMITED', 'Too many requests.', {
              headers: { 'Retry-After': '1' },
            })
          : HttpResponse.json(pageOf([card(1, { title: 'Back again' })])),
      ),
    );
    renderRoutes([{ path: '/lists/:listKey', Component: RankedListPage }], '/lists/trending');
    expect(await screen.findByText('Too many requests. Try again in 1 s.')).toBeInTheDocument();
    expect(await screen.findAllByText('Back again', {}, { timeout: 3000 })).not.toHaveLength(0);
    expect(calls).toBe(2);
  });
});

/** [ARCH-3] action copy (toast). */
const ACTION_COPY: Record<Variant, string> = {
  limited: "You're doing that too fast. Try again in 42 s.",
  limitedNoRetryAfter: 'Too many requests. Please try again later.',
  unavailable: 'This is temporarily unavailable. Please try again in a moment.',
  network: "We couldn't reach CineSmart. Check your connection and try again.",
  internal: 'Something went wrong. Please try again.',
};

describe.each(VARIANTS)('activity action: %s', (variant) => {
  it('rolls back and shows the toast', async () => {
    signInForTests();
    server.use(
      http.get(api('/movies/118'), () =>
        HttpResponse.json(movieDetails({ userState: neutralState })),
      ),
      http.get(api('/movies/118/similar'), () => HttpResponse.json([])),
      http.get(api('/me/watched'), () => HttpResponse.json([])),
      http.put(api('/movies/118/watchlist'), () =>
        failure(variant, '/api/v1/movies/118/watchlist'),
      ),
    );
    renderRoutes([{ path: '/movies/:movieId', Component: MovieDetailsPage }], '/movies/118');
    await userEvent.click(await screen.findByRole('button', { name: 'Add to watchlist' }));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastError.mock.calls[0]![0]).toBe(ACTION_COPY[variant]);
    expect(screen.getByRole('button', { name: 'Add to watchlist' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});

/** [ARCH-3] form copy (`FormAlert`); `null` = the countdown with submit disabled. */
const FORM_COPY: Record<Variant, string | null> = {
  limited: null,
  limitedNoRetryAfter: 'Too many requests. Please try again later.',
  unavailable: 'This is temporarily unavailable. Please try again in a moment.',
  network: "We couldn't reach CineSmart. Check your connection and try again.",
  internal: 'Something went wrong. Please try again.',
};

async function expectFormAlert(
  scope: ReturnType<typeof within>,
  submitName: string,
  expected: string | null,
) {
  if (expected === null) {
    expect(await scope.findByText('Too many requests. Try again in 42 s.')).toBeInTheDocument();
    expect(scope.getByRole('button', { name: submitName })).toBeDisabled();
  } else {
    expect(await scope.findByRole('alert')).toHaveTextContent(expected);
    expect(scope.getByRole('button', { name: submitName })).toBeEnabled();
  }
}

describe.each(VARIANTS)('forms: %s', (variant) => {
  it('login shows the form alert', async () => {
    server.use(http.post(api('/auth/login'), () => failure(variant, '/api/v1/auth/login')));
    renderRoutes([{ path: '/login', Component: LoginPage }], '/login');
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Username'), 'amir');
    await user.type(screen.getByLabelText('Password', { selector: 'input' }), 'secret-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    const expected =
      variant === 'limitedNoRetryAfter'
        ? 'Too many failed sign-in attempts from your network. Try again later.'
        : FORM_COPY[variant];
    await expectFormAlert(within(document.body), 'Sign in', expected);
  });

  describe('profile', () => {
    const profile: Profile = {
      userId: 42,
      username: 'Amir',
      email: 'amir@example.com',
      createdAt: '2026-09-30T18:22:41.115204Z',
      watchlistCount: 0,
      watchedCount: 0,
      ratingCount: 0,
    };

    beforeEach(() => {
      signInForTests();
      server.use(
        http.get(api('/me'), () => HttpResponse.json(profile)),
        http.get(api('/me/reactions'), () => HttpResponse.json([])),
      );
    });

    function form(name: string) {
      return within(screen.getByRole('button', { name }).closest('form')!);
    }

    it('change password shows the form alert', async () => {
      server.use(
        http.post(api('/auth/password/change'), () =>
          failure(variant, '/api/v1/auth/password/change'),
        ),
      );
      renderRoutes([{ path: '/profile', Component: ProfilePage }], '/profile');
      const f = form('Change password');
      await userEvent.type(f.getByLabelText('Current password'), 'old-password');
      await userEvent.type(f.getByLabelText('New password'), 'new-password-1');
      await userEvent.type(f.getByLabelText('Confirm new password'), 'new-password-1');
      await userEvent.click(f.getByRole('button', { name: 'Change password' }));
      await expectFormAlert(f, 'Change password', FORM_COPY[variant]);
    });

    it('change email shows the form alert', async () => {
      server.use(
        http.post(api('/auth/email/change'), () => failure(variant, '/api/v1/auth/email/change')),
      );
      renderRoutes([{ path: '/profile', Component: ProfilePage }], '/profile');
      const f = form('Change email');
      await userEvent.type(f.getByLabelText('Current password'), 'old-password');
      await userEvent.type(f.getByLabelText('New email'), 'new@example.com');
      await userEvent.click(f.getByRole('button', { name: 'Change email' }));
      const expected = variant === 'unavailable' ? EMAIL_SEND_FAILED : FORM_COPY[variant];
      await expectFormAlert(f, 'Change email', expected);
    });
  });
});

describe('form countdown', () => {
  it('login submit comes back when the Retry-After countdown ends', async () => {
    server.use(
      http.post(api('/auth/login'), () =>
        errorResponse(429, 'RATE_LIMITED', 'Too many requests.', {
          path: '/api/v1/auth/login',
          headers: { 'Retry-After': '1' },
        }),
      ),
    );
    renderRoutes([{ path: '/login', Component: LoginPage }], '/login');
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Username'), 'amir');
    await user.type(screen.getByLabelText('Password', { selector: 'input' }), 'secret-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Too many requests. Try again in 1 s.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
    expect(await screen.findByText('You can try again now.', {}, { timeout: 3000 })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });
});
