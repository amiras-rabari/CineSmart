// Refresh coordinator: plan [ARCH-2]; contract [AUTH-1] [AUTH-5].
// Two requests presenting the same refresh cookie count as theft and revoke every session,
// so refreshes are single-flight per tab and serialised across tabs with a Web Lock.
import { refresh } from '@/api/auth';
import { hasErrorCode } from '@/api/errors';
import { broadcastSession } from './cross-tab';
import { endSession, SESSION_EXPIRED_MESSAGE, SIGN_IN_UNAVAILABLE_MESSAGE } from './end-session';
import { getSession, sessionFromResponse, setAuthenticated } from './session-store';

const LOCK_NAME = 'cinesmart-refresh';
/** A token another tab stored while we waited is adopted when it is valid at least this long. */
const ADOPT_MIN_VALIDITY_MS = 60_000;

let inFlight: Promise<boolean> | null = null;

/**
 * Resolves `true` when a fresh session is in the store, `false` when the session is gone
 * (401/503, already handled). Rejects for 429 and network errors, keeping the current state.
 */
export function refreshSession(): Promise<boolean> {
  inFlight ??= run().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export function resetRefreshForTests(): void {
  inFlight = null;
}

async function run(): Promise<boolean> {
  const tokenAtStart = getSession().accessToken;
  if (typeof navigator !== 'undefined' && 'locks' in navigator && navigator.locks) {
    return navigator.locks.request(LOCK_NAME, async () => await refreshUnderLock(tokenAtStart));
  }
  return refreshUnderLock(tokenAtStart);
}

async function refreshUnderLock(tokenAtStart: string | null): Promise<boolean> {
  const before = getSession();
  // Another tab refreshed while we waited for the lock and broadcast its session: adopt it.
  // The token must differ from the one we started with, so a 401 retry still refreshes.
  if (
    before.status === 'authenticated' &&
    before.accessToken !== tokenAtStart &&
    before.expiresAt - Date.now() > ADOPT_MIN_VALIDITY_MS
  ) {
    return true;
  }

  try {
    const next = sessionFromResponse(await refresh());
    setAuthenticated(next);
    broadcastSession(next);
    return true;
  } catch (error) {
    if (hasErrorCode(error, 'UNAUTHORIZED')) {
      // A failed restore is silent; a lost live session gets the expiry toast.
      endSession({
        reason: 'expired',
        toastMessage: before.status === 'authenticated' ? SESSION_EXPIRED_MESSAGE : undefined,
      });
      return false;
    }
    if (hasErrorCode(error, 'SERVICE_UNAVAILABLE')) {
      // The backend cleared the cookie (contract [AUTH-5]): the session can't come back.
      endSession({ reason: 'expired', toastMessage: SIGN_IN_UNAVAILABLE_MESSAGE });
      return false;
    }
    throw error;
  }
}
