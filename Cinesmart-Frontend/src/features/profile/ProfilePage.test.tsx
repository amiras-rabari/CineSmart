import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Profile } from '@/api/me';
import type * as CrossTab from '@/session/cross-tab';
import { api, errorResponse, loginResponse } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoutes } from '@/test/render';
import { signInForTests, testUser } from '@/test/session';
import { getSession } from '@/session/session-store';
import { EMAIL_SEND_FAILED } from './ChangeEmailForm';
import { PASSWORD_CHANGED } from './ChangePasswordForm';
import { Component as ProfilePage } from './ProfilePage';

const { toastSuccess, broadcastSession } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  broadcastSession: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), info: vi.fn(), success: toastSuccess } }));
vi.mock('@/session/cross-tab', async (importOriginal) => ({
  ...(await importOriginal<typeof CrossTab>()),
  broadcastSession,
}));

const profile: Profile = {
  userId: 42,
  username: 'Amir',
  email: 'amir@example.com',
  createdAt: '2026-09-30T18:22:41.115204Z',
  watchlistCount: 6,
  watchedCount: 12,
  ratingCount: 2,
};

let refreshCalls = 0;

beforeEach(() => {
  toastSuccess.mockReset();
  broadcastSession.mockReset();
  refreshCalls = 0;
  signInForTests('old-token');
  server.use(
    http.get(api('/me'), () => HttpResponse.json(profile)),
    http.get(api('/me/reactions'), () =>
      HttpResponse.json([
        { movieId: 1, reaction: 'LIKE', reactedAt: '2026-10-12T10:02:13Z' },
        { movieId: 2, reaction: 'LIKE', reactedAt: '2026-10-11T10:02:13Z' },
        { movieId: 3, reaction: 'DISLIKE', reactedAt: '2026-10-01T08:15:09Z' },
      ]),
    ),
    http.post(api('/auth/refresh'), () => {
      refreshCalls++;
      return HttpResponse.json(loginResponse('refreshed'));
    }),
  );
});

function renderProfile() {
  return renderRoutes([{ path: '/profile', Component: ProfilePage }], '/profile');
}

function form(name: string) {
  return within(screen.getByRole('button', { name }).closest('form')!);
}

describe('ProfilePage', () => {
  it('shows the account and the activity counts, incl. liked/disliked from /me/reactions', async () => {
    renderProfile();
    expect(await screen.findByText('amir@example.com')).toBeInTheDocument();
    expect(screen.getByText('September 2026')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Watchlist: 6. Open' })).toHaveAttribute(
      'href',
      '/watchlist',
    );
    expect(screen.getByRole('link', { name: 'Ratings: 2. Open' })).toHaveAttribute(
      'href',
      '/ratings',
    );
    const liked = screen.getByText('Liked').parentElement!;
    await waitFor(() => expect(liked).toHaveTextContent('2'));
    expect(screen.getByText('Disliked').parentElement).toHaveTextContent('1');
  });
});

describe('change password', () => {
  async function submit(current: string, next: string) {
    const f = form('Change password');
    await userEvent.type(f.getByLabelText('Current password'), current);
    await userEvent.type(f.getByLabelText('New password'), next);
    await userEvent.type(f.getByLabelText('Confirm new password'), next);
    await userEvent.click(f.getByRole('button', { name: 'Change password' }));
  }

  it('wrong current password → field error, no refresh attempted', async () => {
    server.use(
      http.post(api('/auth/password/change'), () =>
        errorResponse(400, 'VALIDATION_FAILED', 'Invalid request fields', {
          fields: { currentPassword: 'is incorrect' },
        }),
      ),
    );
    renderProfile();
    await submit('wrong-pass', 'new-password-1');
    expect(await screen.findByText('Is incorrect.')).toBeInTheDocument();
    expect(refreshCalls).toBe(0);
    expect(getSession().accessToken).toBe('old-token');
  });

  it('locked account (429 ACCOUNT_LOCKED) → lock message, no countdown', async () => {
    server.use(
      http.post(api('/auth/password/change'), () =>
        errorResponse(429, 'ACCOUNT_LOCKED', 'Too many failed attempts. Try again later.'),
      ),
    );
    renderProfile();
    await submit('wrong-pass', 'new-password-1');
    expect(
      await screen.findByText(
        'Too many failed attempts. This account is locked for up to an hour.',
      ),
    ).toBeInTheDocument();
    expect(form('Change password').getByRole('button', { name: 'Change password' })).toBeEnabled();
  });

  it('success → new token stored and broadcast, toast, form reset', async () => {
    let auth: string | null = null;
    server.use(
      http.post(api('/auth/password/change'), async ({ request }) => {
        auth = request.headers.get('Authorization');
        expect(await request.json()).toEqual({
          currentPassword: 'old-password',
          newPassword: 'new-password-1',
        });
        return HttpResponse.json(loginResponse('new-token', testUser));
      }),
    );
    renderProfile();
    await submit('old-password', 'new-password-1');
    await waitFor(() => expect(getSession().accessToken).toBe('new-token'));
    expect(auth).toBe('Bearer old-token');
    expect(broadcastSession).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: 'new-token', user: testUser }),
    );
    expect(toastSuccess).toHaveBeenCalledWith(PASSWORD_CHANGED);
    expect(form('Change password').getByLabelText('Current password')).toHaveValue('');
  });
});

describe('change email', () => {
  async function submit(email: string) {
    const f = form('Change email');
    await userEvent.type(f.getByLabelText('Current password'), 'old-password');
    await userEvent.type(f.getByLabelText('New email'), email);
    await userEvent.click(f.getByRole('button', { name: 'Change email' }));
  }

  it('EMAIL_TAKEN → error on the new email field', async () => {
    server.use(
      http.post(api('/auth/email/change'), () =>
        errorResponse(409, 'EMAIL_TAKEN', 'Email is already registered'),
      ),
    );
    renderProfile();
    await submit('taken@example.com');
    const field = await form('Change email').findByLabelText('New email');
    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.getByText('This email is already registered.')).toBeInTheDocument();
  });

  it('503 → the email-send message', async () => {
    server.use(
      http.post(api('/auth/email/change'), () =>
        errorResponse(
          503,
          'SERVICE_UNAVAILABLE',
          'The email could not be sent. Please try again later.',
        ),
      ),
    );
    renderProfile();
    await submit('new@example.com');
    expect(await screen.findByText(EMAIL_SEND_FAILED)).toBeInTheDocument();
  });

  it('success → confirmation alert with the new address', async () => {
    server.use(
      http.post(api('/auth/email/change'), () =>
        HttpResponse.json({ message: "We've sent a confirmation link to the new email address." }),
      ),
    );
    renderProfile();
    await submit('new@example.com');
    expect(
      await screen.findByText(
        'We sent a confirmation link to new@example.com. Your email changes after you open it.',
      ),
    ).toBeInTheDocument();
  });
});
