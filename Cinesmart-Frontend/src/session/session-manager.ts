// Session lifecycle: restore, keep fresh, login/logout, cross-tab handling. Plan [ARCH-2].
import { logout as logoutRequest } from '@/api/auth';
import { isRateLimited } from '@/api/errors';
import { anonymousSessionAdapter, setSessionAdapter, type SessionAdapter } from '@/api/http';
import type { LoginResponse } from '@/api/types';
import { notify } from '@/components/feedback/notify';
import { keys } from '@/query/keys';
import { queryClient } from '@/query/query-client';
import {
  broadcastSession,
  closeSessionChannel,
  openSessionChannel,
  type SessionMessage,
} from './cross-tab';
import { installDevTools } from './dev-tools';
import { endSession, SESSION_EXPIRED_MESSAGE, setSigningOut } from './end-session';
import { refreshSession, resetRefreshForTests } from './refresh';
import {
  getSession,
  resetSessionStore,
  sessionFromResponse,
  setAnonymous,
  setAuthenticated,
  subscribeSession,
} from './session-store';

/** Refresh before a request when the token has less than this left. */
const FRESH_MARGIN_MS = 30_000;
/** The timer refreshes this long before expiry. */
const TIMER_LEAD_MS = 60_000;
/** The splash never stays longer than this. */
const RESTORE_MAX_MS = 5_000;

let restorePromise: Promise<void> | null = null;
/** After a network error on restore, the next request tries the restore again. */
let retryRestoreOnNextRequest = false;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let uninstall: (() => void) | null = null;

/** Called once by `AuthGate` (StrictMode-safe): POST /auth/refresh to restore the session. */
export function restoreSession(): Promise<void> {
  restorePromise ??= (async () => {
    const giveUp = setTimeout(() => {
      if (getSession().status === 'restoring') setAnonymous(null);
    }, RESTORE_MAX_MS);
    try {
      await refreshSession();
    } catch (error) {
      if (getSession().status === 'restoring') setAnonymous(null);
      if (isRateLimited(error) && error.retryAfter != null) {
        // One more try once the window resets.
        setTimeout(() => void refreshSession().catch(() => {}), error.retryAfter * 1000);
      } else {
        retryRestoreOnNextRequest = true;
      }
    } finally {
      clearTimeout(giveUp);
    }
  })();
  return restorePromise;
}

/**
 * Before every `optional`/`required` request: JWT-optional GETs answer anonymously with an
 * expired token instead of 401 (contract [CONV-2]), so refresh ahead of time.
 */
export async function ensureFreshToken(): Promise<void> {
  if (getSession().status === 'restoring' && restorePromise) await restorePromise;
  const current = getSession();
  if (current.status === 'anonymous') {
    if (!retryRestoreOnNextRequest) return;
    retryRestoreOnNextRequest = false;
  } else if (
    current.status !== 'authenticated' ||
    current.expiresAt - Date.now() >= FRESH_MARGIN_MS
  ) {
    return;
  }
  try {
    await refreshSession();
  } catch {
    // 429/network: send the request with what we have; its own error handling takes over.
  }
}

export const sessionAdapter: SessionAdapter = {
  getAccessToken: () => getSession().accessToken,
  ensureFreshToken,
  refresh: refreshSession,
  expire: () => endSession({ reason: 'expired', toastMessage: SESSION_EXPIRED_MESSAGE }),
};

/** After a successful login: store, tell other tabs. The caller navigates. */
export function completeLogin(response: LoginResponse): void {
  const session = sessionFromResponse(response);
  retryRestoreOnNextRequest = false;
  setAuthenticated(session);
  broadcastSession(session);
}

/** Logout per [ARCH-2]: whatever the server says, this tab ends up signed out. */
export async function signOut(): Promise<void> {
  if (getSession().status !== 'authenticated') return;
  setSigningOut(true);
  try {
    await logoutRequest();
  } catch {
    // A 401 means the session was already gone; any other failure still signs out locally.
  } finally {
    setSigningOut(false);
  }
  endSession({ reason: 'logout' });
  notify.success('Signed out');
}

export function handleSessionMessage(message: SessionMessage): void {
  const current = getSession();
  if (message.type === 'logout') {
    endSession({ reason: 'logout', broadcast: false });
    return;
  }
  if (current.status === 'authenticated' && current.expiresAt >= message.expiresAt) return;
  if (current.status === 'authenticated' && current.user.userId !== message.user.userId) {
    queryClient.removeQueries({ queryKey: keys.viewer(current.user.userId) });
  }
  retryRestoreOnNextRequest = false;
  setAuthenticated({
    accessToken: message.accessToken,
    expiresAt: message.expiresAt,
    user: message.user,
  });
}

function scheduleRefresh() {
  clearTimeout(refreshTimer);
  const current = getSession();
  if (current.status !== 'authenticated') return;
  const delay = Math.max(0, current.expiresAt - Date.now() - TIMER_LEAD_MS);
  refreshTimer = setTimeout(() => void refreshSession().catch(() => {}), delay);
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') void ensureFreshToken();
}

/** Wires the session into the HTTP core, timers and other tabs. Called once from `main.tsx`. */
export function installSession(): void {
  if (uninstall) return;
  setSessionAdapter(sessionAdapter);
  const unsubscribe = subscribeSession(scheduleRefresh);
  document.addEventListener('visibilitychange', onVisibilityChange);
  openSessionChannel(handleSessionMessage);
  if (import.meta.env.DEV) installDevTools();
  uninstall = () => {
    unsubscribe();
    document.removeEventListener('visibilitychange', onVisibilityChange);
    closeSessionChannel();
    clearTimeout(refreshTimer);
  };
}

export function resetSessionForTests(): void {
  uninstall?.();
  uninstall = null;
  setSessionAdapter(anonymousSessionAdapter);
  restorePromise = null;
  retryRestoreOnNextRequest = false;
  setSigningOut(false);
  resetRefreshForTests();
  resetSessionStore();
}
