// User-facing copy per error code: plan [ARCH-3]. Switch on `code`, never on the message.
import { isApiError } from '@/api/errors';

export type ErrorContext = 'query' | 'action' | 'form';

export const GENERIC_ERROR_MESSAGE = 'Something went wrong.';

/** Message for an error in a given context. Field-level and page-specific copy lives with those screens. */
export function errorMessage(error: unknown, context: ErrorContext = 'query'): string {
  if (!isApiError(error)) return GENERIC_ERROR_MESSAGE;

  switch (error.code) {
    case 'NETWORK_ERROR':
      return context === 'query'
        ? "We couldn't load this. Check your connection and try again."
        : "We couldn't reach CineSmart. Check your connection and try again.";
    case 'INTERNAL_ERROR':
      return context === 'query'
        ? "We couldn't load this."
        : 'Something went wrong. Please try again.';
    case 'SERVICE_UNAVAILABLE':
      return 'This is temporarily unavailable. Please try again in a moment.';
    case 'RATE_LIMITED':
      if (error.retryAfter == null) {
        // Only the login IP block answers 429 without `Retry-After` (contract [LIMIT-3]).
        return error.path.endsWith('/auth/login')
          ? 'Too many failed sign-in attempts from your network. Try again later.'
          : 'Too many requests. Please try again later.';
      }
      return context === 'action'
        ? `You're doing that too fast. Try again in ${error.retryAfter} s.`
        : `Too many requests. Try again in ${error.retryAfter} s.`;
    case 'INVALID_CREDENTIALS':
      return 'Invalid username or password.';
    case 'ACCOUNT_LOCKED':
      return 'Too many failed attempts. This account is locked for up to an hour.';
    case 'TOKEN_INVALID':
      return 'This link is invalid, has expired or was already used.';
    case 'MOVIE_NOT_FOUND':
      return context === 'action' ? 'This movie is no longer available.' : 'Movie not found.';
    case 'UNAUTHORIZED':
      return 'Your session has ended. Please sign in again.';
    case 'VALIDATION_FAILED':
      return context === 'form' ? error.message : GENERIC_ERROR_MESSAGE;
    default:
      return GENERIC_ERROR_MESSAGE;
  }
}

const CLIENT_BUG_CODES = new Set(['BAD_REQUEST', 'NOT_FOUND', 'METHOD_NOT_ALLOWED', 'FORBIDDEN']);

/** Codes that point at a client bug are logged so they are not silently swallowed ([ARCH-3]). */
export function logIfClientBug(error: unknown): void {
  if (isApiError(error) && CLIENT_BUG_CODES.has(error.code)) {
    console.error(`[api] ${error.code} ${error.status} ${error.path}: ${error.message}`);
  }
}
