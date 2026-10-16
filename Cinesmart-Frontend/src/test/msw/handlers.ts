import { http, HttpResponse } from 'msw';
import type { ApiErrorBody, ErrorCode, NamedRef } from '@/api/types';
import { env } from '@/lib/env';

/** Absolute API URL for a contract path, e.g. `api('/genres')`. */
export const api = (path: string) => `${env.apiBaseUrl}${path}`;

/** Error response in the contract [CONV-5] shape. */
export function errorResponse(
  status: number,
  code: ErrorCode,
  message: string,
  extra: { path?: string; fields?: Record<string, string>; headers?: Record<string, string> } = {},
) {
  const body: ApiErrorBody = {
    status,
    code,
    message,
    path: extra.path ?? '/api/v1/test',
    timestamp: '2026-10-12T14:03:00.512Z',
    ...(extra.fields ? { fields: extra.fields } : {}),
  };
  return HttpResponse.json(body, { status, headers: extra.headers });
}

export const sampleGenres: NamedRef[] = [
  { id: 3, name: 'Action' },
  { id: 1, name: 'Drama' },
];

/** Default handlers; tests override with `server.use(...)`. */
export const handlers = [http.get(api('/genres'), () => HttpResponse.json(sampleGenres))];

/** A [AUTH-4]/[AUTH-5] success body. */
export function loginResponse(accessToken: string, user = { userId: 42, username: 'Amir' }) {
  return { accessToken, expiresIn: 900, user };
}
