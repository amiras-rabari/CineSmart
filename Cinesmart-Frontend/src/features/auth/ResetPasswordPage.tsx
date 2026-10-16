import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { resetPassword } from '@/api/auth';
import { hasErrorCode } from '@/api/errors';
import { FormAlert } from '@/components/forms/FormAlert';
import { PasswordField } from '@/components/forms/PasswordField';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { useFormServerError } from '@/components/forms/use-form-server-error';
import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { parseToken, resetPasswordSchema, type ResetPasswordValues } from '@/lib/validation';
import { endSession } from '@/session/end-session';
import { EmailLinkResult } from './EmailLinkStatus';
import type { LoginNotice } from './login-notice';

/** /reset-password?token=…: [ROUTES-10]; contract [AUTH-10]. The POST runs only on submit. */
export function Component() {
  useDocumentTitle('Reset password');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = parseToken(params.get('token'));
  const [tokenRejected, setTokenRejected] = useState(false);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });
  const server = useFormServerError(form.setError, ['newPassword']);
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ newPassword }) => {
    if (!token) return;
    server.clear();
    try {
      await resetPassword({ token, newPassword });
      // The backend revoked every session of this user (contract [AUTH-10]): end ours quietly.
      endSession({ reason: 'logout' });
      const state: LoginNotice = { notice: 'password-reset' };
      void navigate('/login', { state, replace: true });
    } catch (error) {
      if (
        hasErrorCode(error, 'TOKEN_INVALID') ||
        (hasErrorCode(error, 'VALIDATION_FAILED') && error.fields?.token)
      ) {
        setTokenRejected(true);
      } else {
        server.handle(error);
      }
    }
  });

  if (!token || tokenRejected) {
    return (
      <EmailLinkResult
        variant="invalid"
        title="Link not valid"
        actions={
          <Button asChild>
            <Link to="/forgot-password">Request a new link</Link>
          </Button>
        }
      >
        This reset link is invalid, has expired (10 minutes) or was already used.
      </EmailLinkResult>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="text-sm text-muted-foreground">
          You&apos;ll be signed out everywhere and can sign in with the new password.
        </p>
      </div>
      <form noValidate onSubmit={(e) => void onSubmit(e)} className="grid gap-4">
        <FormAlert error={server.error} message={server.message} />
        <PasswordField
          label="New password"
          autoComplete="new-password"
          hint="8–100 characters."
          error={errors.newPassword?.message}
          {...form.register('newPassword')}
        />
        <PasswordField
          label="Confirm new password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...form.register('confirmPassword')}
        />
        <SubmitButton pending={isSubmitting} blocked={server.blocked}>
          Reset password
        </SubmitButton>
      </form>
    </div>
  );
}
