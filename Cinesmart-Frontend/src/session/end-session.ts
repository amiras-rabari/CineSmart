// Ending a session (expiry, logout, cross-tab logout): plan [ARCH-2], [ARCH-4].
import { toast } from 'sonner';
import { keys } from '@/query/keys';
import { queryClient } from '@/query/query-client';
import { broadcastLogout } from './cross-tab';
import { getSession, setAnonymous, type EndReason } from './session-store';

export const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again.';
export const SIGN_IN_UNAVAILABLE_MESSAGE =
  'Sign-in is temporarily unavailable. Please sign in again later.';

let signingOut = false;

/** While the user signs out, a 401 from the logout call is a normal end, not an expiry. */
export function setSigningOut(value: boolean): void {
  signingOut = value;
}

interface EndSessionOptions {
  reason: Exclude<EndReason, null>;
  /** Error toast to show; omitted → silent. */
  toastMessage?: string;
  /** Tell other tabs (default true). Never done while restoring. */
  broadcast?: boolean;
}

/** Clears the session, tells other tabs and drops this user's cached queries. Idempotent. */
export function endSession({ reason, toastMessage, broadcast = true }: EndSessionOptions): void {
  const current = getSession();
  if (signingOut) {
    reason = 'logout';
    toastMessage = undefined;
  }

  if (current.status === 'restoring') {
    // A failed restore is this tab's business only: no broadcast, nothing cached yet.
    setAnonymous(null);
    if (toastMessage) toast.error(toastMessage, { id: toastMessage });
    return;
  }
  if (current.status !== 'authenticated') return;

  setAnonymous(reason);
  if (broadcast) broadcastLogout();
  queryClient.removeQueries({ queryKey: keys.viewer(current.user.userId) });
  if (toastMessage) toast.error(toastMessage, { id: toastMessage });
}
