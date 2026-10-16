import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { api, errorResponse, sampleGenres } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { ApiError, isApiError } from './errors';
import { request, setSessionAdapter, type SessionAdapter } from './http';

async function catchError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (isApiError(error)) return error;
    throw error;
  }
  throw new Error('Expected the request to fail');
}

function fakeSession(overrides: Partial<SessionAdapter> = {}): SessionAdapter {
  return {
    getAccessToken: () => 'token-1',
    ensureFreshToken: vi.fn(() => Promise.resolve()),
    refresh: vi.fn(() => Promise.resolve(true)),
    expire: vi.fn(),
    ...overrides,
  };
}

describe('request', () => {
  it('parses a JSON body', async () => {
    await expect(request('GET', '/genres', { auth: 'optional' })).resolves.toEqual(sampleGenres);
  });

  it('skips undefined, null and empty query params', async () => {
    let seen: URL | undefined;
    server.use(
      http.get(api('/movies'), ({ request: req }) => {
        seen = new URL(req.url);
        return HttpResponse.json({ results: [] });
      }),
    );
    await request('GET', '/movies', {
      auth: 'optional',
      query: { genreId: 3, languageId: undefined, year: null, q: '', page: 0, flag: false },
    });
    expect(seen?.searchParams.toString()).toBe('genreId=3&page=0&flag=false');
  });

  it('returns undefined for 204', async () => {
    server.use(http.post(api('/auth/logout'), () => new HttpResponse(null, { status: 204 })));
    setSessionAdapter(fakeSession());
    await expect(request('POST', '/auth/logout', { auth: 'required' })).resolves.toBeUndefined();
  });

  it('sends JSON with Content-Type only when there is a body', async () => {
    const headers: Headers[] = [];
    let body: unknown;
    server.use(
      http.post(api('/auth/login'), async ({ request: req }) => {
        headers.push(req.headers);
        body = await req.json();
        return HttpResponse.json({ ok: true });
      }),
      http.get(api('/home'), ({ request: req }) => {
        headers.push(req.headers);
        return HttpResponse.json({});
      }),
    );
    await request('POST', '/auth/login', { auth: 'none', body: { username: 'a', password: 'b' } });
    await request('GET', '/home', { auth: 'optional' });
    expect(headers[0]?.get('content-type')).toBe('application/json');
    expect(body).toEqual({ username: 'a', password: 'b' });
    expect(headers[1]?.get('content-type')).toBeNull();
  });

  it('never sends Authorization on auth: none, even with a session', async () => {
    const session = fakeSession();
    setSessionAdapter(session);
    let auth: string | null = 'unset';
    server.use(
      http.post(api('/auth/login'), ({ request: req }) => {
        auth = req.headers.get('authorization');
        return HttpResponse.json({});
      }),
    );
    await request('POST', '/auth/login', { auth: 'none', body: {} });
    expect(auth).toBeNull();
    expect(session.ensureFreshToken).not.toHaveBeenCalled();
  });

  it('sends the bearer token on optional requests when a session exists', async () => {
    const session = fakeSession();
    setSessionAdapter(session);
    let auth: string | null = null;
    server.use(
      http.get(api('/home'), ({ request: req }) => {
        auth = req.headers.get('authorization');
        return HttpResponse.json({});
      }),
    );
    await request('GET', '/home', { auth: 'optional' });
    expect(session.ensureFreshToken).toHaveBeenCalledOnce();
    expect(auth).toBe('Bearer token-1');
  });

  it('sends no Authorization on optional requests when anonymous', async () => {
    let auth: string | null = 'unset';
    server.use(
      http.get(api('/home'), ({ request: req }) => {
        auth = req.headers.get('authorization');
        return HttpResponse.json({});
      }),
    );
    await request('GET', '/home', { auth: 'optional' });
    expect(auth).toBeNull();
  });

  it('throws UNAUTHORIZED locally for required requests without a session', async () => {
    const onRequest = vi.fn();
    server.events.on('request:start', onRequest);
    const error = await catchError(request('GET', '/me', { auth: 'required' }));
    server.events.removeAllListeners();
    expect(error).toMatchObject({ status: 401, code: 'UNAUTHORIZED', path: '/api/v1/me' });
    expect(onRequest).not.toHaveBeenCalled();
  });

  it('parses the error body including fields', async () => {
    server.use(
      http.post(api('/auth/signup'), () =>
        errorResponse(400, 'VALIDATION_FAILED', 'Invalid request fields', {
          path: '/api/v1/auth/signup',
          fields: { email: 'must be a well-formed email address' },
        }),
      ),
    );
    const error = await catchError(request('POST', '/auth/signup', { auth: 'none', body: {} }));
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_FAILED',
      message: 'Invalid request fields',
      path: '/api/v1/auth/signup',
      fields: { email: 'must be a well-formed email address' },
      retryAfter: null,
    });
  });

  it('omits fields when the body has none', async () => {
    server.use(
      http.get(api('/movies'), () =>
        errorResponse(400, 'VALIDATION_FAILED', 'page must be 0 or greater'),
      ),
    );
    const error = await catchError(request('GET', '/movies', { auth: 'optional' }));
    expect(error.fields).toBeUndefined();
  });

  it('reads Retry-After on 429', async () => {
    server.use(
      http.get(api('/movies'), () =>
        errorResponse(429, 'RATE_LIMITED', 'Too many requests', {
          headers: { 'Retry-After': '42' },
        }),
      ),
    );
    const error = await catchError(request('GET', '/movies', { auth: 'optional' }));
    expect(error).toMatchObject({ status: 429, code: 'RATE_LIMITED', retryAfter: 42 });
  });

  it('keeps retryAfter null on a 429 without Retry-After (login IP block)', async () => {
    server.use(
      http.post(api('/auth/login'), () => errorResponse(429, 'RATE_LIMITED', 'Too many attempts')),
    );
    const error = await catchError(request('POST', '/auth/login', { auth: 'none', body: {} }));
    expect(error.retryAfter).toBeNull();
  });

  it('derives the code from the status when the error body is not JSON', async () => {
    server.use(
      http.get(api('/home'), () => new HttpResponse('<html>Bad gateway</html>', { status: 502 })),
      http.get(api('/movies'), () => new HttpResponse('nope', { status: 415 })),
    );
    const serverError = await catchError(request('GET', '/home', { auth: 'optional' }));
    expect(serverError).toMatchObject({
      status: 502,
      code: 'INTERNAL_ERROR',
      path: '/api/v1/home',
    });
    const clientError = await catchError(request('GET', '/movies', { auth: 'optional' }));
    expect(clientError).toMatchObject({ status: 415, code: 'BAD_REQUEST' });
  });

  it('maps a fetch rejection to NETWORK_ERROR with status 0', async () => {
    server.use(http.get(api('/genres'), () => HttpResponse.error()));
    const error = await catchError(request('GET', '/genres', { auth: 'optional' }));
    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR', path: '/api/v1/genres' });
  });

  describe('required + 401', () => {
    it('refreshes once and retries with the new token', async () => {
      let token = 'old';
      const session = fakeSession({
        getAccessToken: () => token,
        refresh: vi.fn(() => {
          token = 'new';
          return Promise.resolve(true);
        }),
      });
      setSessionAdapter(session);
      const seen: (string | null)[] = [];
      server.use(
        http.get(api('/me'), ({ request: req }) => {
          const auth = req.headers.get('authorization');
          seen.push(auth);
          return auth === 'Bearer new'
            ? HttpResponse.json({ username: 'amir' })
            : errorResponse(401, 'UNAUTHORIZED', 'Missing, invalid or expired access token');
        }),
      );
      await expect(request('GET', '/me', { auth: 'required' })).resolves.toEqual({
        username: 'amir',
      });
      expect(seen).toEqual(['Bearer old', 'Bearer new']);
      expect(session.refresh).toHaveBeenCalledOnce();
      expect(session.expire).not.toHaveBeenCalled();
    });

    it('expires the session when the refresh fails', async () => {
      const session = fakeSession({ refresh: vi.fn(() => Promise.resolve(false)) });
      setSessionAdapter(session);
      server.use(http.get(api('/me'), () => errorResponse(401, 'UNAUTHORIZED', 'expired')));
      const error = await catchError(request('GET', '/me', { auth: 'required' }));
      expect(error.code).toBe('UNAUTHORIZED');
      expect(session.expire).toHaveBeenCalledOnce();
    });

    it('expires the session on a second 401', async () => {
      const session = fakeSession();
      setSessionAdapter(session);
      let calls = 0;
      server.use(
        http.get(api('/me'), () => {
          calls += 1;
          return errorResponse(401, 'UNAUTHORIZED', 'expired');
        }),
      );
      await catchError(request('GET', '/me', { auth: 'required' }));
      expect(calls).toBe(2);
      expect(session.refresh).toHaveBeenCalledOnce();
      expect(session.expire).toHaveBeenCalledOnce();
    });

    it('does not refresh on optional requests', async () => {
      const session = fakeSession();
      setSessionAdapter(session);
      server.use(http.get(api('/home'), () => errorResponse(401, 'UNAUTHORIZED', 'x')));
      await catchError(request('GET', '/home', { auth: 'optional' }));
      expect(session.refresh).not.toHaveBeenCalled();
    });
  });
});
