import { Link } from 'react-router';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { ResendVerificationForm } from './ResendVerificationForm';

/** /resend-verification: [ROUTES-9]; contract [AUTH-8]. Open to everyone. */
export function Component() {
  useDocumentTitle('Resend verification');
  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Resend verification email</h1>
        <p className="text-sm text-muted-foreground">
          Enter the email you signed up with and we&apos;ll send a new link (valid 24 hours).
        </p>
      </div>
      <ResendVerificationForm />
      <p className="text-center text-sm">
        <Link to="/login" className="text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
