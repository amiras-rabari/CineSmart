// Zod schemas mirroring the contract rules exactly ([COMP-5]; contract [AUTH-3] … [AUTH-13]).
import { z } from 'zod';

export const USERNAME_HINT = '3–32 characters: letters, numbers, _ . -';

export const usernameSchema = z.string().regex(/^[A-Za-z0-9_.-]{3,32}$/, `Use ${USERNAME_HINT}.`);

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Enter your email.')
  .max(64, 'Use at most 64 characters.')
  .email('Enter a valid email address.');

export const newPasswordSchema = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(100, 'Use at most 100 characters.');

const notBlank = (message: string) =>
  z.string().refine((value) => value.trim().length > 0, message);

/** Email-link token: not blank, ≤ 200 chars (contract [CFG-2]). */
export const tokenSchema = z.string().trim().min(1).max(200);

export const signupSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: newPasswordSchema,
});
export type SignupValues = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  username: notBlank('Enter your username.').transform((value) => value.trim()),
  password: notBlank('Enter your password.'),
});
export type LoginValues = z.input<typeof loginSchema>;

export const emailFormSchema = z.object({ email: emailSchema });
export type EmailFormValues = z.input<typeof emailFormSchema>;

export const resetPasswordSchema = z
  .object({
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  });
export type ResetPasswordValues = z.input<typeof resetPasswordSchema>;

/** contract [AUTH-11]; the confirm match is client-only. */
export const changePasswordSchema = z
  .object({
    currentPassword: notBlank('Enter your current password.'),
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  });
export type ChangePasswordValues = z.input<typeof changePasswordSchema>;

/** contract [AUTH-12] */
export const changeEmailSchema = z.object({
  currentPassword: notBlank('Enter your current password.'),
  newEmail: emailSchema,
});
export type ChangeEmailValues = z.input<typeof changeEmailSchema>;

/** The `token` query param when it is usable, else `null` (shown as an invalid link). */
export function parseToken(value: string | null): string | null {
  const result = tokenSchema.safeParse(value);
  return result.success ? result.data : null;
}
