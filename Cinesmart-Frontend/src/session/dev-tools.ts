// Dev-only helpers on `window.__cinesmart` (plan [ARCH-2]); installed only when `import.meta.env.DEV`.
import { getSession, overwriteExpiresAtSilently } from './session-store';

interface CineSmartDevTools {
  /** Marks the access token as expired so the next request refreshes first. */
  expireAccessToken(): void;
  /** Prints the session state without the token. */
  session(): void;
}

declare global {
  interface Window {
    __cinesmart?: CineSmartDevTools;
  }
}

export function installDevTools(): void {
  window.__cinesmart = {
    expireAccessToken() {
      overwriteExpiresAtSilently(Date.now());
      console.info('[session] access token marked as expired');
    },
    session() {
      const { accessToken, ...rest } = getSession();
      console.info('[session]', {
        ...rest,
        hasToken: accessToken !== null,
        expiresAt: rest.expiresAt === null ? null : new Date(rest.expiresAt).toISOString(),
      });
    },
  };
}
