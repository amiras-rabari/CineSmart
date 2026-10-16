// Error model: contract [CONV-5] [ERR-1]. Switch on `code`, never on `message`.
import type { ErrorCode } from './types';

/** Client-only code: fetch rejected (offline, backend down, CORS failure). Status 0. */
export type ClientErrorCode = 'NETWORK_ERROR';
export type ApiErrorCode = ErrorCode | ClientErrorCode;

export const NETWORK_ERROR_MESSAGE =
  "We couldn't reach CineSmart. Check your connection and try again.";

export interface ApiErrorInit {
  status: number;
  code: ApiErrorCode;
  message: string;
  path: string;
  fields?: Record<string, string>;
  retryAfter?: number | null;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly path: string;
  readonly fields?: Record<string, string>;
  /** Seconds from the `Retry-After` header; `null` when absent. */
  readonly retryAfter: number | null;

  constructor(init: ApiErrorInit) {
    super(init.message);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.path = init.path;
    if (init.fields) this.fields = init.fields;
    this.retryAfter = init.retryAfter ?? null;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function hasErrorCode(error: unknown, ...codes: ApiErrorCode[]): error is ApiError {
  return isApiError(error) && codes.includes(error.code);
}

/** 429 from a rate limit (with `retryAfter`) or the login IP block (without). */
export function isRateLimited(error: unknown): error is ApiError & { code: 'RATE_LIMITED' } {
  return hasErrorCode(error, 'RATE_LIMITED');
}

export function isNetworkError(error: unknown): error is ApiError & { code: 'NETWORK_ERROR' } {
  return hasErrorCode(error, 'NETWORK_ERROR');
}

/** `Retry-After: <seconds>` (integer ≥ 1, contract [CONV-5]) → seconds, else `null`. */
export function parseRetryAfter(header: string | null | undefined): number | null {
  if (!header) return null;
  const seconds = Number(header.trim());
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return Math.ceil(seconds);
}

/** Code for an error response whose body is not the contract shape. */
export function codeFromStatus(status: number): ErrorCode {
  return status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST';
}
