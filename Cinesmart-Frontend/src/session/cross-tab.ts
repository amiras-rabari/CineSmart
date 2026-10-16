// Cross-tab session sync: plan [ARCH-2]. Without BroadcastChannel, tabs work independently.
import type { ActiveSession } from './session-store';

export type SessionMessage = ({ type: 'session' } & ActiveSession) | { type: 'logout' };

const CHANNEL_NAME = 'cinesmart-session';
let channel: BroadcastChannel | null = null;

export function openSessionChannel(onMessage: (message: SessionMessage) => void): void {
  if (channel || typeof BroadcastChannel === 'undefined') return;
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event: MessageEvent<unknown>) => {
    if (isSessionMessage(event.data)) onMessage(event.data);
  };
}

export function closeSessionChannel(): void {
  channel?.close();
  channel = null;
}

export function broadcastSession(session: ActiveSession): void {
  post({ type: 'session', ...session });
}

export function broadcastLogout(): void {
  post({ type: 'logout' });
}

function post(message: SessionMessage) {
  channel?.postMessage(message);
}

export function isSessionMessage(data: unknown): data is SessionMessage {
  if (typeof data !== 'object' || data === null) return false;
  const message = data as Partial<Record<string, unknown>>;
  if (message.type === 'logout') return true;
  if (message.type !== 'session') return false;
  const user = message.user as Partial<Record<string, unknown>> | null | undefined;
  return (
    typeof message.accessToken === 'string' &&
    typeof message.expiresAt === 'number' &&
    typeof user?.userId === 'number' &&
    typeof user.username === 'string'
  );
}
