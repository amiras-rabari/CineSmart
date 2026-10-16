// Session state: plan [ARCH-2]. Memory only, never Web Storage or cookies (contract [AUTH-1]).
import { useSyncExternalStore } from 'react';
import type { LoginResponse } from '@/api/types';
import { viewerOf, type Viewer } from '@/query/keys';

export type SessionStatus = 'restoring' | 'authenticated' | 'anonymous';

export interface SessionUser {
  userId: number;
  username: string;
}

/** What ended the last session: `expired` sends protected routes to /login, `logout` to /. */
export type EndReason = 'expired' | 'logout' | null;

export interface ActiveSession {
  accessToken: string;
  /** Epoch ms: receipt time + `expiresIn`. */
  expiresAt: number;
  user: SessionUser;
}

export type SessionState =
  | ({ status: 'authenticated'; endReason: null } & ActiveSession)
  | {
      status: 'restoring' | 'anonymous';
      accessToken: null;
      expiresAt: null;
      user: null;
      endReason: EndReason;
    };

const RESTORING: SessionState = {
  status: 'restoring',
  accessToken: null,
  expiresAt: null,
  user: null,
  endReason: null,
};

let state: SessionState = RESTORING;
const listeners = new Set<() => void>();

function set(next: SessionState) {
  state = next;
  for (const listener of listeners) listener();
}

export function getSession(): SessionState {
  return state;
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setAuthenticated(session: ActiveSession): void {
  set({ status: 'authenticated', endReason: null, ...session });
}

export function setAnonymous(endReason: EndReason = null): void {
  set({ status: 'anonymous', accessToken: null, expiresAt: null, user: null, endReason });
}

export function sessionFromResponse(response: LoginResponse, now = Date.now()): ActiveSession {
  return {
    accessToken: response.accessToken,
    expiresAt: now + response.expiresIn * 1000,
    user: { userId: response.user.userId, username: response.user.username },
  };
}

/** Dev helper only: moves `expiresAt` without notifying, so the refresh timer keeps its old schedule. */
export function overwriteExpiresAtSilently(expiresAt: number): void {
  if (state.status === 'authenticated') state = { ...state, expiresAt };
}

export function resetSessionStore(): void {
  state = RESTORING;
  listeners.clear();
}

export function useSession(): SessionState {
  return useSyncExternalStore(subscribeSession, getSession);
}

/** Viewer prefix for query keys ([ARCH-4]). */
export function useViewer(): Viewer {
  return viewerOf(useSession().user?.userId);
}
