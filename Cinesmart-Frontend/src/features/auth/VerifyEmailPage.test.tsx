import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { api, errorResponse } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoutes } from '@/test/render';
import { Component as VerifyEmailPage } from './VerifyEmailPage';

function countVerifies(respond: () => Response) {
  const seen: unknown[] = [];
  server.use(
    http.post(api('/auth/email/verify'), async ({ request }) => {
      seen.push(await request.json());
      return respond();
    }),
  );
  return seen;
}

function renderVerify(entry: string) {
  return renderRoutes([{ path: '/verify-email', Component: VerifyEmailPage }], entry, {
    strict: true,
  });
}

describe('VerifyEmailPage', () => {
  it('POSTs the token exactly once under StrictMode', async () => {
    const seen = countVerifies(() =>
      HttpResponse.json({ message: 'Email verified. You can now sign in.' }),
    );
    renderVerify('/verify-email?token=abc_123-XYZ');
    expect(await screen.findByRole('heading', { name: 'Email verified' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(seen).toEqual([{ token: 'abc_123-XYZ' }]);
  });

  it('TOKEN_INVALID → invalid-link message with next steps', async () => {
    countVerifies(() =>
      errorResponse(400, 'TOKEN_INVALID', 'Invalid or expired verification link'),
    );
    renderVerify('/verify-email?token=used');
    expect(await screen.findByText(/invalid, has expired or was already used/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Resend verification' })).toBeInTheDocument();
  });

  it('a missing token shows the invalid state without a request', () => {
    // MSW fails the test on any unhandled request.
    renderVerify('/verify-email');
    expect(screen.getByRole('heading', { name: 'Link not valid' })).toBeInTheDocument();
  });

  it('503 → message and Retry', async () => {
    countVerifies(() =>
      errorResponse(503, 'SERVICE_UNAVAILABLE', 'Service temporarily unavailable.'),
    );
    renderVerify('/verify-email?token=abc');
    expect(await screen.findByRole('button', { name: 'Retry' })).toBeEnabled();
    expect(screen.getByRole('alert')).toHaveTextContent('temporarily unavailable');
  });
});
