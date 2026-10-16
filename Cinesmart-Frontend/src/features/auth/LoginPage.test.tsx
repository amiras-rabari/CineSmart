import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { getSession } from '@/session/session-store';
import { api, errorResponse, loginResponse } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoutes } from '@/test/render';
import { Component as LoginPage } from './LoginPage';

function renderLogin(entry: Parameters<typeof renderRoutes>[1] = '/login') {
  return renderRoutes(
    [
      { path: '/login', Component: LoginPage },
      { path: '*', element: <p>Landed somewhere else</p> },
    ],
    entry,
  );
}

async function submit(username = 'amir', password = 'secret-password') {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Username'), username);
  await user.type(screen.getByLabelText('Password', { selector: 'input' }), password);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  return user;
}

function loginFails(response: () => Response) {
  server.use(http.post(api('/auth/login'), response));
}

describe('LoginPage', () => {
  it('signs in and goes to the redirect target', async () => {
    let body: unknown;
    server.use(
      http.post(api('/auth/login'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(loginResponse('token-1'));
      }),
    );
    const { location } = renderLogin('/login?redirect=%2Fwatchlist%3Fpage%3D2');
    await submit('  amir  ');
    expect(await screen.findByText('Landed somewhere else')).toBeInTheDocument();
    expect(location()).toBe('/watchlist?page=2');
    expect(body).toEqual({ username: 'amir', password: 'secret-password' });
    expect(getSession()).toMatchObject({ status: 'authenticated', accessToken: 'token-1' });
  });

  it('ignores an off-site redirect', async () => {
    server.use(http.post(api('/auth/login'), () => HttpResponse.json(loginResponse('t'))));
    const { location } = renderLogin('/login?redirect=%2F%2Fevil.example');
    await submit();
    await screen.findByText('Landed somewhere else');
    expect(location()).toBe('/');
  });

  it('401 → "Invalid username or password." alert', async () => {
    loginFails(() => errorResponse(401, 'INVALID_CREDENTIALS', 'Invalid username or password'));
    renderLogin();
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid username or password.');
    expect(getSession().status).not.toBe('authenticated');
  });

  it('403 → resend panel that sends a new verification email', async () => {
    loginFails(() => errorResponse(403, 'ACCOUNT_NOT_VERIFIED', 'Account not verified'));
    let resendBody: unknown;
    server.use(
      http.post(api('/auth/email/resend'), async ({ request }) => {
        resendBody = await request.json();
        return HttpResponse.json({ message: 'If an unverified account exists, we sent a link.' });
      }),
    );
    renderLogin();
    const user = await submit();
    expect(await screen.findByText(/Your email isn.t verified yet/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Email'), ' amir@example.com ');
    await user.click(screen.getByRole('button', { name: 'Resend verification email' }));
    expect(
      await screen.findByText('If an unverified account exists, we sent a link.'),
    ).toBeInTheDocument();
    expect(resendBody).toEqual({ email: 'amir@example.com' });
  });

  it('429 with Retry-After → countdown and submit disabled', async () => {
    loginFails(() =>
      errorResponse(429, 'RATE_LIMITED', 'Too many requests. Try again later.', {
        headers: { 'Retry-After': '42' },
      }),
    );
    renderLogin();
    await submit();
    expect(await screen.findByText('Too many requests. Try again in 42 s.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
  });

  it('locked account → message, submit stays enabled', async () => {
    loginFails(() => errorResponse(429, 'ACCOUNT_LOCKED', 'Too many failed attempts.'));
    renderLogin();
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many failed attempts. This account is locked for up to an hour.',
    );
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  it('puts server field errors on their inputs', async () => {
    loginFails(() =>
      errorResponse(400, 'VALIDATION_FAILED', 'Invalid request fields', {
        fields: { password: 'must not be blank' },
      }),
    );
    renderLogin();
    await submit();
    expect(await screen.findByText('Must not be blank.')).toBeInTheDocument();
    expect(screen.getByLabelText('Password', { selector: 'input' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('validates blank fields without calling the API', async () => {
    renderLogin();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Enter your username.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
  });

  it('shows the signup notice passed in router state', () => {
    renderLogin({ pathname: '/login', state: { notice: 'signed-up', email: 'amir@example.com' } });
    expect(
      screen.getByText(/Check amir@example.com for a verification link \(valid 24 hours\)/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Resend/ })).toHaveAttribute(
      'href',
      '/resend-verification',
    );
  });
});
