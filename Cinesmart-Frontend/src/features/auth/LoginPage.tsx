import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { login } from '@/api/auth';
import { hasErrorCode } from '@/api/errors';
import { InlineAlert } from '@/components/feedback/InlineAlert';
import { FormAlert } from '@/components/forms/FormAlert';
import { PasswordField } from '@/components/forms/PasswordField';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { TextField } from '@/components/forms/TextField';
import { useFormServerError } from '@/components/forms/use-form-server-error';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { loginSchema, type LoginValues } from '@/lib/validation';
import { safeRedirect } from '@/session/redirect';
import { completeLogin } from '@/session/session-manager';
import { readLoginNotice } from './login-notice';
import { ResendVerificationForm } from './ResendVerificationForm';

/** /login: [ROUTES-9]; contract [AUTH-4] (+ [AUTH-8] resend panel on 403). */
export function Component() {
  useDocumentTitle('Sign in');
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const notice = readLoginNotice(location.state);
  const [needsVerification, setNeedsVerification] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });
  const server = useFormServerError(form.setError, ['username', 'password']);
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    server.clear();
    try {
      completeLogin(await login(values));
      void navigate(safeRedirect(params.get('redirect')), { replace: true });
    } catch (error) {
      if (hasErrorCode(error, 'ACCOUNT_NOT_VERIFIED')) {
        setNeedsVerification(true);
      } else {
        server.handle(error);
      }
    }
  });

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground">Welcome back to CineSmart.</p>
      </div>

      {notice?.notice === 'signed-up' && (
        <InlineAlert variant="success" title="Account created">
          <p>
            Check {notice.email} for a verification link (valid 24 hours), then sign in.{' '}
            <Link to="/resend-verification" className="text-primary underline underline-offset-4">
              Didn&apos;t get it? Resend
            </Link>
          </p>
        </InlineAlert>
      )}
      {notice?.notice === 'password-reset' && (
        <InlineAlert variant="success">Password reset. Please sign in.</InlineAlert>
      )}

      <form noValidate onSubmit={(e) => void onSubmit(e)} className="grid gap-4">
        <FormAlert error={server.error} message={server.message} />
        <TextField
          label="Username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          error={errors.username?.message}
          {...form.register('username')}
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...form.register('password')}
        />
        <div className="-mt-1 text-right text-sm">
          <Link
            to="/forgot-password"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <SubmitButton pending={isSubmitting} blocked={server.blocked}>
          Sign in
        </SubmitButton>
      </form>

      {needsVerification && (
        <section
          aria-labelledby="resend-heading"
          className="grid gap-3 rounded-lg border bg-surface-2 p-4"
        >
          <h2 id="resend-heading" className="text-sm font-semibold">
            Verify your email
          </h2>
          <p className="text-sm text-muted-foreground" role="status">
            Your email isn&apos;t verified yet. Enter your email and we&apos;ll send a new link.
          </p>
          <ResendVerificationForm />
        </section>
      )}

      <p className="text-center text-sm text-muted-foreground">
        New to CineSmart?{' '}
        <Link to="/signup" className="text-primary underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </div>
  );
}
