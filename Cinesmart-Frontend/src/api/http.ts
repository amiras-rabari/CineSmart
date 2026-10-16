// HTTP core: plan [ARCH-1]; contract [CONV-1] [CONV-2] [CONV-5].
// The only module that calls `fetch`. API modules (auth.ts, discovery.ts, …) build on `request`.
import { env } from '@/lib/env';
import { ApiError, codeFromStatus, NETWORK_ERROR_MESSAGE, parseRetryAfter } from './errors';
import type { ApiErrorBody } from './types';

export type AuthMode = 'none' | 'optional' | 'required';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
export type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  query?: Record<string, QueryValue>;
  body?: unknown;
  auth: AuthMode;
  signal?: AbortSignal;
}

/**
 * What the HTTP core needs from the session. P0 installs an always-anonymous adapter;
 * the session module (P1) replaces it with `setSessionAdapter`.
 */
export interface SessionAdapter {
  /** Current access token, or `null` when there is no session. */
  getAccessToken(): string | null;
  /** Refreshes the token first if it is about to expire. Never throws for "no session". */
  ensureFreshToken(): Promise<void>;
  /**
   * Rotates the token after a 401. Resolves `true` when a new token is available,
   * `false` when the session is gone. May reject for transient failures (e.g. network).
   */
  refresh(): Promise<boolean>;
  /** Ends the session after an unrecoverable 401 (session-expired flow). */
  expire(): void;
}

export const anonymousSessionAdapter: SessionAdapter = {
  getAccessToken: () => null,
  ensureFreshToken: () => Promise.resolve(),
  refresh: () => Promise.resolve(false),
  expire: () => {},
};

let session: SessionAdapter = anonymousSessionAdapter;

export function setSessionAdapter(adapter: SessionAdapter): void {
  session = adapter;
}

export function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(env.apiBaseUrl + path);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      // Empty params are not sent: /movies rejects empty or unknown params (contract [DISC-2]).
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export async function request<T>(
  method: HttpMethod,
  path: string,
  opts: RequestOptions = { auth: 'none' },
): Promise<T> {
  const url = buildUrl(path, opts.query);

  if (opts.auth !== 'none') await session.ensureFreshToken();
  if (opts.auth === 'required' && !session.getAccessToken()) {
    throw new ApiError({
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'You need to sign in.',
      path: new URL(url).pathname,
    });
  }

  try {
    return await send<T>(method, url, opts);
  } catch (error) {
    if (
      opts.auth !== 'required' ||
      !(error instanceof ApiError) ||
      error.status !== 401 ||
      error.code !== 'UNAUTHORIZED'
    ) {
      throw error;
    }
    // One refresh, one retry; a failed refresh or a second 401 ends the session ([ARCH-2]).
    const refreshed = await session.refresh();
    if (!refreshed) {
      session.expire();
      throw error;
    }
    try {
      return await send<T>(method, url, opts);
    } catch (retryError) {
      if (retryError instanceof ApiError && retryError.status === 401) session.expire();
      throw retryError;
    }
  }
}

async function send<T>(method: HttpMethod, url: string, opts: RequestOptions): Promise<T> {
  // Only Content-Type and Authorization: CORS allows no other custom header (contract [CONV-1]).
  const headers: Record<string, string> = {};
  const hasBody = opts.body !== undefined;
  if (hasBody) headers['Content-Type'] = 'application/json';
  // Never on `none`: public auth POSTs reject a stale token (contract [CONV-2]).
  if (opts.auth !== 'none') {
    const token = session.getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: hasBody ? JSON.stringify(opts.body) : undefined,
      credentials: 'include',
      signal: opts.signal,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: NETWORK_ERROR_MESSAGE,
      path: new URL(url).pathname,
    });
  }

  if (response.ok) {
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  throw await toApiError(response, url);
}

async function toApiError(response: Response, url: string): Promise<ApiError> {
  const retryAfter = parseRetryAfter(response.headers.get('Retry-After'));
  const path = new URL(url).pathname;
  const body = await readErrorBody(response);
  if (body) {
    return new ApiError({
      status: response.status,
      code: body.code,
      message: body.message,
      path: typeof body.path === 'string' ? body.path : path,
      fields: body.fields,
      retryAfter,
    });
  }
  return new ApiError({
    status: response.status,
    code: codeFromStatus(response.status),
    message: response.statusText || `Request failed with status ${response.status}`,
    path,
    retryAfter,
  });
}

async function readErrorBody(response: Response): Promise<ApiErrorBody | null> {
  try {
    const parsed: unknown = JSON.parse(await response.text());
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as ApiErrorBody).code === 'string' &&
      typeof (parsed as ApiErrorBody).message === 'string'
    ) {
      return parsed as ApiErrorBody;
    }
  } catch {
    // Not JSON: fall through to a status-derived code.
  }
  return null;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
