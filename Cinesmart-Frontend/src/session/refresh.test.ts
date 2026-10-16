import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, errorResponse, loginResponse } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import type * as CrossTab from './cross-tab';
import { broadcastLogout, broadcastSession } from './cross-tab';
import { SESSION_EXPIRED_MESSAGE, SIGN_IN_UNAVAILABLE_MESSAGE } from './end-session';
import { refreshSession } from './refresh';
import { getSession, setAuthenticated } from './session-store';

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock('sonner', () => ({ toast: { error: toastError, success: vi.fn(), info: vi.fn() } }));
vi.mock('./cross-tab', async (importOriginal) => ({
  ...(await importOriginal<typeof CrossTab>()),
  broadcastSession: vi.fn(),
  broadcastLogout: vi.fn(),
}));

const user = { userId: 42, username: 'Amir' };

function signedIn(accessToken = 'old', validForMs = 10_000) {
  setAuthenticated({ accessToken, expiresAt: Date.now() + validForMs, user });
}

function countRefreshes(respond: () => Response) {
  const calls = { count: 0 };
  server.use(
    http.post(api('/auth/refresh'), () => {
      calls.count += 1;
      return respond();
    }),
  );
  return calls;
}

function stubLocks(beforeCallback: () => void = () => {}) {
  const request = vi.fn(async (_name: string, callback: () => Promise<unknown>) => {
    beforeCallback();
    return callback();
  });
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request } });
  return request;
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  Reflect.deleteProperty(navigator, 'locks');
});

describe('refreshSession', () => {
  it('shares one request between concurrent callers', async () => {
    signedIn();
    const calls = countRefreshes(() => HttpResponse.json(loginResponse('new')));
    const results = await Promise.all([refreshSession(), refreshSession(), refreshSession()]);
    expect(results).toEqual([true, true, true]);
    expect(calls.count).toBe(1);
    expect(getSession()).toMatchObject({ status: 'authenticated', accessToken: 'new', user });
    expect(broadcastSession).toHaveBeenCalledOnce();
  });

  it('starts a new request once the previous one settled', async () => {
    signedIn();
    const calls = countRefreshes(() => HttpResponse.json(loginResponse('new')));
    await refreshSession();
    await refreshSession();
    expect(calls.count).toBe(2);
  });

  it('401 → anonymous, broadcast logout, expiry toast', async () => {
    signedIn();
    countRefreshes(() =>
      errorResponse(401, 'UNAUTHORIZED', 'Session expired. Please sign in again.'),
    );
    await expect(refreshSession()).resolves.toBe(false);
    expect(getSession()).toMatchObject({ status: 'anonymous', endReason: 'expired' });
    expect(broadcastLogout).toHaveBeenCalledOnce();
    expect(toastError).toHaveBeenCalledWith(SESSION_EXPIRED_MESSAGE, expect.anything());
  });

  it('503 → anonymous with the "temporarily unavailable" toast', async () => {
    signedIn();
    countRefreshes(() =>
      errorResponse(503, 'SERVICE_UNAVAILABLE', 'Service temporarily unavailable.'),
    );
    await expect(refreshSession()).resolves.toBe(false);
    expect(getSession().status).toBe('anonymous');
    expect(toastError).toHaveBeenCalledWith(SIGN_IN_UNAVAILABLE_MESSAGE, expect.anything());
  });

  it('429 → keeps the session and rejects', async () => {
    signedIn();
    countRefreshes(() =>
      errorResponse(429, 'RATE_LIMITED', 'Too many requests.', { headers: { 'Retry-After': '9' } }),
    );
    await expect(refreshSession()).rejects.toMatchObject({ code: 'RATE_LIMITED', retryAfter: 9 });
    expect(getSession()).toMatchObject({ status: 'authenticated', accessToken: 'old' });
    expect(broadcastLogout).not.toHaveBeenCalled();
  });

  it('a failed restore (401) is silent and not broadcast', async () => {
    countRefreshes(() =>
      errorResponse(401, 'UNAUTHORIZED', 'Session expired. Please sign in again.'),
    );
    expect(getSession().status).toBe('restoring');
    await expect(refreshSession()).resolves.toBe(false);
    expect(getSession()).toMatchObject({ status: 'anonymous', endReason: null });
    expect(broadcastLogout).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });

  it('sends no Authorization header and no body', async () => {
    signedIn();
    let seen: { auth: string | null; body: string } | undefined;
    server.use(
      http.post(api('/auth/refresh'), async ({ request }) => {
        seen = { auth: request.headers.get('authorization'), body: await request.text() };
        return HttpResponse.json(loginResponse('new'));
      }),
    );
    await refreshSession();
    expect(seen).toEqual({ auth: null, body: '' });
  });

  describe('with Web Locks', () => {
    it('adopts a fresh token another tab stored while waiting, without a request', async () => {
      signedIn('old');
      const request = stubLocks(() =>
        setAuthenticated({ accessToken: 'other-tab', expiresAt: Date.now() + 900_000, user }),
      );
      const calls = countRefreshes(() => HttpResponse.json(loginResponse('new')));
      await expect(refreshSession()).resolves.toBe(true);
      expect(request).toHaveBeenCalledWith('cinesmart-refresh', expect.any(Function));
      expect(calls.count).toBe(0);
      expect(getSession().accessToken).toBe('other-tab');
    });

    it('still refreshes when the token is unchanged (e.g. a 401 retry)', async () => {
      signedIn('old', 600_000);
      stubLocks();
      const calls = countRefreshes(() => HttpResponse.json(loginResponse('new')));
      await refreshSession();
      expect(calls.count).toBe(1);
      expect(getSession().accessToken).toBe('new');
    });
  });
});
