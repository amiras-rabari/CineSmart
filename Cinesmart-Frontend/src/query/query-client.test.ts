import { describe, expect, it } from 'vitest';
import { ApiError, type ApiErrorCode } from '@/api/errors';
import { shouldRetryQuery } from './query-client';

const err = (code: ApiErrorCode, status: number) =>
  new ApiError({ code, status, message: code, path: '/api/v1/x' });

describe('shouldRetryQuery', () => {
  it('retries transient failures once', () => {
    for (const e of [
      err('NETWORK_ERROR', 0),
      err('INTERNAL_ERROR', 500),
      err('SERVICE_UNAVAILABLE', 503),
    ]) {
      expect(shouldRetryQuery(0, e)).toBe(true);
      expect(shouldRetryQuery(1, e)).toBe(false);
    }
  });

  it('never retries 4xx or unknown errors', () => {
    expect(shouldRetryQuery(0, err('RATE_LIMITED', 429))).toBe(false);
    expect(shouldRetryQuery(0, err('MOVIE_NOT_FOUND', 404))).toBe(false);
    expect(shouldRetryQuery(0, err('UNAUTHORIZED', 401))).toBe(false);
    expect(shouldRetryQuery(0, new Error('boom'))).toBe(false);
  });
});
