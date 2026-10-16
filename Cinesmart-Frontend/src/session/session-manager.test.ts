import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { request, setSessionAdapter } from '@/api/http';
import { api, errorResponse, loginResponse } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import type * as CrossTab from './cross-tab';
import { broadcastLogout } from './cross-tab';
import { SESSION_EXPIRED_MESSAGE } from './end-session';
import {
  ensureFreshToken,
  handleSessionMessage,
  restoreSession,
  sessionAdapter,
  signOut,
} from './session-manager';
import { getSession, setAuthenticated } from './session-store';

const { toast } = vi.hoisted(() => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));
vi.mock('sonner', () => ({ toast }));
vi.mock('./cross-tab', async (importOriginal) => ({
  ...(await importOriginal<typeof CrossTab>()),
  broadcastSession: vi.fn(),
  broadcastLogout: vi.fn(),
}));

const user = { userId: 42, username: 'Amir' };

function signedIn(accessToken = 'old', validForMs = 600_000) {
  setAuthenticated({ accessToken, expiresAt: Date.now() + validForMs, user });
}

function refreshReturns(respond: () => Response) {
  const calls = { count: 0 };
  server.use(
    http.post(api('/auth/refresh'), () => {
      calls.count += 1;
      return respond();
    }),
  );
  return calls;
}

beforeEach(() => {
  vi.clearAllMocks();
  setSessionAdapter(sessionAdapter);
});

describe('HTTP core with the session adapter', () => {
  it('401 → refresh → retries once with the new token', async () => {
    signedIn('old');
    const calls = refreshReturns(() => HttpResponse.json(loginResponse('new')));
    const seen: (string | null)[] = [];
    server.use(
      http.get(api('/me'), ({ request: req }) => {
        const auth = req.headers.get('authorization');
        seen.push(auth);
        return auth === 'Bearer new'
          ? HttpResponse.json({ username: 'Amir' })
          : errorResponse(401, 'UNAUTHORIZED', 'Missing, invalid or expired access token');
      }),
    );
    await expect(request('GET', '/me', { auth: 'required' })).resolves.toEqual({
      username: 'Amir',
    });
    expect(seen).toEqual(['Bearer old', 'Bearer new']);
    expect(calls.count).toBe(1);
    expect(getSession().status).toBe('authenticated');
  });

  it('a second 401 expires the session', async () => {
    signedIn('old');
    refreshReturns(() => HttpResponse.json(loginResponse('new')));
    let calls = 0;
    server.use(
      http.get(api('/me'), () => {
        calls += 1;
        return errorResponse(401, 'UNAUTHORIZED', 'Missing, invalid or expired access token');
      }),
    );
    await expect(request('GET', '/me', { auth: 'required' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    expect(calls).toBe(2);
    expect(getSession()).toMatchObject({ status: 'anonymous', endReason: 'expired' });
    expect(broadcastLogout).toHaveBeenCalledOnce();
    expect(toast.error).toHaveBeenCalledWith(SESSION_EXPIRED_MESSAGE, expect.anything());
  });

  it('a failed refresh after a 401 expires the session', async () => {
    signedIn('old');
    refreshReturns(() =>
      errorResponse(401, 'UNAUTHORIZED', 'Session expired. Please sign in again.'),
    );
    server.use(http.get(api('/me'), () => errorResponse(401, 'UNAUTHORIZED', 'expired')));
    await expect(request('GET', '/me', { auth: 'required' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    expect(getSession().status).toBe('anonymous');
  });

  it('auth: none never sends Authorization, even with a session', async () => {
    signedIn('old');
    let auth: string | null = 'unset';
    server.use(
      http.post(api('/auth/email/verify'), ({ request: req }) => {
        auth = req.headers.get('authorization');
        return HttpResponse.json({ message: 'ok' });
      }),
    );
    await request('POST', '/auth/email/verify', { auth: 'none', body: { token: 't' } });
    expect(auth).toBeNull();
  });

  it('refreshes before an optional request when the token is about to expire', async () => {
    signedIn('old', 10_000);
    const calls = refreshReturns(() => HttpResponse.json(loginResponse('new')));
    let auth: string | null = null;
    server.use(
      http.get(api('/home'), ({ request: req }) => {
        auth = req.headers.get('authorization');
        return HttpResponse.json({ sections: [] });
      }),
    );
    await request('GET', '/home', { auth: 'optional' });
    expect(calls.count).toBe(1);
    expect(auth).toBe('Bearer new');
  });

  it('does not refresh while the token has more than 30 s left', async () => {
    signedIn('old', 120_000);
    const calls = refreshReturns(() => HttpResponse.json(loginResponse('new')));
    await ensureFreshToken();
    expect(calls.count).toBe(0);
  });
});

describe('restoreSession', () => {
  it('restores once, however often it is called', async () => {
    const calls = refreshReturns(() => HttpResponse.json(loginResponse('restored')));
    await Promise.all([restoreSession(), restoreSession()]);
    await restoreSession();
    expect(calls.count).toBe(1);
    expect(getSession()).toMatchObject({ status: 'authenticated', accessToken: 'restored', user });
  });

  it('401 → anonymous, silently', async () => {
    refreshReturns(() =>
      errorResponse(401, 'UNAUTHORIZED', 'Session expired. Please sign in again.'),
    );
    await restoreSession();
    expect(getSession()).toMatchObject({ status: 'anonymous', endReason: null });
    expect(toast.error).not.toHaveBeenCalled();
    expect(broadcastLogout).not.toHaveBeenCalled();
  });

  it('network error → anonymous, and the next request retries the restore', async () => {
    server.use(http.post(api('/auth/refresh'), () => HttpResponse.error()));
    await restoreSession();
    expect(getSession().status).toBe('anonymous');

    const calls = refreshReturns(() => HttpResponse.json(loginResponse('later')));
    await ensureFreshToken();
    await ensureFreshToken();
    expect(calls.count).toBe(1);
    expect(getSession()).toMatchObject({ status: 'authenticated', accessToken: 'later' });
  });
});

describe('cross-tab messages', () => {
  it('adopts a newer session (an anonymous tab becomes signed in)', () => {
    signedIn('old', 60_000);
    handleSessionMessage({
      type: 'session',
      accessToken: 'newer',
      expiresAt: Date.now() + 900_000,
      user,
    });
    expect(getSession().accessToken).toBe('newer');
  });

  it('ignores an older session', () => {
    signedIn('current', 900_000);
    handleSessionMessage({ type: 'session', accessToken: 'stale', expiresAt: Date.now(), user });
    expect(getSession().accessToken).toBe('current');
  });

  it('logout → anonymous (reason logout), not re-broadcast', () => {
    signedIn();
    handleSessionMessage({ type: 'logout' });
    expect(getSession()).toMatchObject({ status: 'anonymous', endReason: 'logout' });
    expect(broadcastLogout).not.toHaveBeenCalled();
  });
});

describe('signOut', () => {
  it('204 → anonymous, broadcast, "Signed out"', async () => {
    signedIn();
    server.use(http.post(api('/auth/logout'), () => new HttpResponse(null, { status: 204 })));
    await signOut();
    expect(getSession()).toMatchObject({ status: 'anonymous', endReason: 'logout' });
    expect(broadcastLogout).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledWith('Signed out');
  });

  it('a 401 from logout counts as signed out, without the expiry toast', async () => {
    signedIn();
    refreshReturns(() =>
      errorResponse(401, 'UNAUTHORIZED', 'Session expired. Please sign in again.'),
    );
    server.use(http.post(api('/auth/logout'), () => errorResponse(401, 'UNAUTHORIZED', 'x')));
    await signOut();
    expect(getSession()).toMatchObject({ status: 'anonymous', endReason: 'logout' });
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Signed out');
  });
});
