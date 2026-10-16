import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { confirmEmailChange } from '@/api/auth';
import { hasErrorCode } from '@/api/errors';
import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { keys, viewerOf } from '@/query/keys';
import { getSession, useSession } from '@/session/session-store';
import { EmailLinkPending, EmailLinkResult, EmailLinkRetry } from './EmailLinkStatus';
import { useTokenMutation } from './use-token-mutation';

/** /confirm-email?token=…: [ROUTES-10]; contract [AUTH-13]. Works signed in or not. */
export function Component() {
  useDocumentTitle('Confirm email');
  const queryClient = useQueryClient();
  const { status } = useSession();
  const signedIn = status === 'authenticated';

  const { token, mutation } = useTokenMutation(
    async (value: string) => {
      const result = await confirmEmailChange(value);
      const { user } = getSession();
      if (user) {
        void queryClient.invalidateQueries({ queryKey: keys.me.profile(viewerOf(user.userId)) });
      }
      return result;
    },
    { auto: true },
  );

  const profileOrHome = signedIn ? (
    <Button asChild>
      <Link to="/profile">Go to profile</Link>
    </Button>
  ) : (
    <Button asChild>
      <Link to="/">Go to home</Link>
    </Button>
  );

  if (!token || hasErrorCode(mutation.error, 'TOKEN_INVALID', 'VALIDATION_FAILED')) {
    return (
      <EmailLinkResult
        variant="invalid"
        title="Link not valid"
        actions={
          <Button asChild>
            <Link to="/profile">Go to profile</Link>
          </Button>
        }
      >
        This confirmation link is invalid, has expired or was already used. You can request the
        change again from your profile.
      </EmailLinkResult>
    );
  }

  if (hasErrorCode(mutation.error, 'EMAIL_TAKEN')) {
    return (
      <EmailLinkResult variant="invalid" title="Email already in use" actions={profileOrHome}>
        That email is now used by another account. Request the change again with a different email.
      </EmailLinkResult>
    );
  }

  if (mutation.isSuccess) {
    return (
      <EmailLinkResult variant="success" title="Email changed" actions={profileOrHome}>
        Your email address has been changed.
      </EmailLinkResult>
    );
  }

  if (mutation.isError) {
    return (
      <div className="grid gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Confirm your new email</h1>
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
      <h1 className="sr-only">Confirm your new email</h1>
      <EmailLinkPending>Confirming your new email…</EmailLinkPending>
    </>
  );
}
