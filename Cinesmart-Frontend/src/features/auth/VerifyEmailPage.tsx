import { Link } from 'react-router';
import { verifyEmail } from '@/api/auth';
import { hasErrorCode } from '@/api/errors';
import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { EmailLinkPending, EmailLinkResult, EmailLinkRetry } from './EmailLinkStatus';
import { useTokenMutation } from './use-token-mutation';

/** /verify-email?token=…: [ROUTES-10]; contract [AUTH-7]. Auto-POSTs once; no auto-login. */
export function Component() {
  useDocumentTitle('Verify email');
  const { token, mutation } = useTokenMutation(verifyEmail, { auto: true });

  if (!token || hasErrorCode(mutation.error, 'TOKEN_INVALID', 'VALIDATION_FAILED')) {
    return (
      <EmailLinkResult
        variant="invalid"
        title="Link not valid"
        actions={
          <>
            <Button asChild>
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/resend-verification">Resend verification</Link>
            </Button>
          </>
        }
      >
        This verification link is invalid, has expired or was already used. If you already verified,
        just sign in.
      </EmailLinkResult>
    );
  }

  if (mutation.isSuccess) {
    return (
      <EmailLinkResult
        variant="success"
        title="Email verified"
        actions={
          <Button asChild>
            <Link to="/login">Sign in</Link>
          </Button>
        }
      >
        Email verified. You can now sign in.
      </EmailLinkResult>
    );
  }

  if (mutation.isError) {
    return (
      <div className="grid gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Verify your email</h1>
        <EmailLinkRetry
          error={mutation.error}
          pending={mutation.isPending}
          onRetry={() => mutation.mutate(token)}
        />
      </div>
    );
  }

  return (
    <>
      <h1 className="sr-only">Verify your email</h1>
      <EmailLinkPending>Verifying your email…</EmailLinkPending>
    </>
  );
}
