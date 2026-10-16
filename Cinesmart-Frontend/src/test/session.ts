import { setSessionAdapter } from '@/api/http';
import { sessionAdapter } from '@/session/session-manager';
import { setAuthenticated, type SessionUser } from '@/session/session-store';

export const testUser: SessionUser = { userId: 42, username: 'Amir' };

/** Signs in without a request: the HTTP core sends `Bearer <token>`. Reset by the global afterEach. */
export function signInForTests(accessToken = 'test-token', user: SessionUser = testUser): void {
  setSessionAdapter(sessionAdapter);
  setAuthenticated({ accessToken, expiresAt: Date.now() + 900_000, user });
}
