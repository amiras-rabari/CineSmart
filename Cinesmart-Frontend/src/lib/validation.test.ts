import { describe, expect, it } from 'vitest';
import { safeRedirect } from '@/session/redirect';
import { emailSchema, parseToken, resetPasswordSchema, usernameSchema } from './validation';

describe('validation schemas (contract rules)', () => {
  it('username: 3–32 of letters, digits, _ . -', () => {
    expect(usernameSchema.safeParse('Amir_1.x-y').success).toBe(true);
    expect(usernameSchema.safeParse('ab').success).toBe(false);
    expect(usernameSchema.safeParse('a'.repeat(33)).success).toBe(false);
    expect(usernameSchema.safeParse('has space').success).toBe(false);
  });

  it('email: trimmed, valid, ≤ 64', () => {
    expect(emailSchema.parse('  amir@example.com ')).toBe('amir@example.com');
    expect(emailSchema.safeParse('nope').success).toBe(false);
    expect(emailSchema.safeParse(`${'a'.repeat(60)}@x.ca`).success).toBe(false);
  });

  it('reset password: 8–100 and the confirmation must match', () => {
    expect(
      resetPasswordSchema.safeParse({ newPassword: '12345678', confirmPassword: '12345678' })
        .success,
    ).toBe(true);
    const mismatch = resetPasswordSchema.safeParse({
      newPassword: '12345678',
      confirmPassword: '12345679',
    });
    expect(mismatch.error?.issues[0]?.path).toEqual(['confirmPassword']);
    expect(
      resetPasswordSchema.safeParse({ newPassword: '1234567', confirmPassword: '1234567' }).success,
    ).toBe(false);
  });

  it('token: not blank, ≤ 200', () => {
    expect(parseToken('abc')).toBe('abc');
    expect(parseToken(null)).toBeNull();
    expect(parseToken('   ')).toBeNull();
    expect(parseToken('x'.repeat(201))).toBeNull();
  });
});

describe('safeRedirect', () => {
  it.each([
    ['/watchlist?page=2', '/watchlist?page=2'],
    [null, '/'],
    ['', '/'],
    ['https://evil.example', '/'],
    ['//evil.example', '/'],
    ['/\\evil.example', '/'],
    ['watchlist', '/'],
  ])('%s → %s', (input, expected) => {
    expect(safeRedirect(input)).toBe(expected);
  });
});
