import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { forgotPassword } from '@/api/auth';
import { InlineAlert } from '@/components/feedback/InlineAlert';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { TextField } from '@/components/forms/TextField';
import { useFormServerError } from '@/components/forms/use-form-server-error';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { emailFormSchema, type EmailFormValues } from '@/lib/validation';

/** /forgot-password: [ROUTES-9]; contract [AUTH-9]. Open to everyone. */
export function Component() {
  useDocumentTitle('Forgot password');
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: { email: '' },
  });
  const server = useFormServerError(form.setError, ['email']);
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ email }) => {
    server.clear();
    try {
      const { message } = await forgotPassword(email);
      setSentMessage(message);
    } catch (error) {
      server.handle(error);
    }
  });

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Forgot your password?</h1>
        {!sentMessage && (
          <p className="text-sm text-muted-foreground">
            Enter your account email and we&apos;ll send you a reset link.
          </p>
        )}
      </div>

      {sentMessage ? (
        <InlineAlert variant="success" title="Check your email">
          <p>{sentMessage}</p>
          <p>The link is valid for 10 minutes.</p>
        </InlineAlert>
      ) : (
        <form noValidate onSubmit={(e) => void onSubmit(e)} className="grid gap-4">
          <FormAlert error={server.error} message={server.message} />
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...form.register('email')}
          />
          <SubmitButton pending={isSubmitting} blocked={server.blocked}>
            Send reset link
          </SubmitButton>
        </form>
      )}

      <p className="text-center text-sm">
        <Link to="/login" className="text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
