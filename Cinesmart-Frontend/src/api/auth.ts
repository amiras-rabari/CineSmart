// Auth API: contract [AUTH-3] … [AUTH-13].
// Public auth POSTs use `auth: 'none'`: a stale token there would fail with 401 (contract [CONV-2]).
import { request } from './http';
import type { LoginResponse, MessageResponse } from './types';

export interface SignupRequest {
  username: string;
  email: string;
  password: string;
}
export interface SignupResponse {
  username: string;
  message: string;
}
export interface LoginRequest {
  username: string;
  password: string;
}
export type RefreshResponse = LoginResponse;
export interface TokenRequest {
  token: string;
}
export interface EmailRequest {
  email: string;
}
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
export interface ChangeEmailRequest {
  currentPassword: string;
  newEmail: string;
}
export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

/** contract [AUTH-3] → 201; the account starts unverified, no session. */
export function signup(body: SignupRequest): Promise<SignupResponse> {
  return request('POST', '/auth/signup', { auth: 'none', body });
}

/** contract [AUTH-4]: sets the refresh cookie. A 401 here is bad credentials, never a refresh case. */
export function login(body: LoginRequest): Promise<LoginResponse> {
  return request('POST', '/auth/login', { auth: 'none', body });
}

/** contract [AUTH-5]. Only the session module calls this (plan [ARCH-2]); no body, cookie only. */
export function refresh(): Promise<RefreshResponse> {
  return request('POST', '/auth/refresh', { auth: 'none' });
}

/** contract [AUTH-6] → 204. Login required. */
export function logout(): Promise<void> {
  return request('POST', '/auth/logout', { auth: 'required' });
}

/** contract [AUTH-7]: single-use token. */
export function verifyEmail(token: string): Promise<MessageResponse> {
  return request('POST', '/auth/email/verify', { auth: 'none', body: { token } });
}

/** contract [AUTH-8]: same answer whether or not an unverified account exists. */
export function resendVerification(email: string): Promise<MessageResponse> {
  return request('POST', '/auth/email/resend', { auth: 'none', body: { email } });
}

/** contract [AUTH-9]: same answer in every case. */
export function forgotPassword(email: string): Promise<MessageResponse> {
  return request('POST', '/auth/password/forgot', { auth: 'none', body: { email } });
}

/** contract [AUTH-10]: single-use token; revokes every session of the user. */
export function resetPassword(body: ResetPasswordRequest): Promise<MessageResponse> {
  return request('POST', '/auth/password/reset', { auth: 'none', body });
}

/**
 * contract [AUTH-11]: returns a new session and revokes every other one, including the token
 * used for this call. A wrong current password is a 400 (never a refresh case).
 */
export function changePassword(body: ChangePasswordRequest): Promise<LoginResponse> {
  return request('POST', '/auth/password/change', { auth: 'required', body });
}

/** contract [AUTH-12]: sends a confirmation link to the new address; the email changes later. */
export function changeEmail(body: ChangeEmailRequest): Promise<MessageResponse> {
  return request('POST', '/auth/email/change', { auth: 'required', body });
}

/** contract [AUTH-13]: single-use token; sessions are not affected. */
export function confirmEmailChange(token: string): Promise<MessageResponse> {
  return request('POST', '/auth/email/change/confirm', { auth: 'none', body: { token } });
}
