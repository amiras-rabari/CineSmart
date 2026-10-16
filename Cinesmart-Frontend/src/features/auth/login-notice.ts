// Alert shown on /login after signup or password reset, passed as router location state.

export type LoginNotice = { notice: 'signed-up'; email: string } | { notice: 'password-reset' };

export function readLoginNotice(state: unknown): LoginNotice | null {
  if (typeof state !== 'object' || state === null) return null;
  const value = state as Partial<Record<string, unknown>>;
  if (value.notice === 'password-reset') return { notice: 'password-reset' };
  if (value.notice === 'signed-up' && typeof value.email === 'string') {
    return { notice: 'signed-up', email: value.email };
  }
  return null;
}
