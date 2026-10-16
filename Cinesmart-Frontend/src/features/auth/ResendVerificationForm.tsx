import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { resendVerification } from '@/api/auth';
import { InlineAlert } from '@/components/feedback/InlineAlert';
import { FormAlert } from '@/components/forms/FormAlert';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { TextField } from '@/components/forms/TextField';
import { useFormServerError } from '@/components/forms/use-form-server-error';
import { emailFormSchema, type EmailFormValues } from '@/lib/validation';

/** Email → POST /auth/email/resend; shows the returned message as is (contract [AUTH-8]). */
export function ResendVerificationForm() {
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: { email: '' },
  });
  const server = useFormServerError(form.setError, ['email']);
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ email }) => {
    server.clear();
    setSentMessage(null);
    try {
      const { message } = await resendVerification(email);
      setSentMessage(message);
    } catch (error) {
      server.handle(error);
    }
  });

  return (
    <form noValidate onSubmit={(e) => void onSubmit(e)} className="grid gap-4">
      {sentMessage && <InlineAlert variant="success">{sentMessage}</InlineAlert>}
      <FormAlert error={server.error} message={server.message} />
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...form.register('email')}
      />
      <SubmitButton pending={isSubmitting} blocked={server.blocked}>
        Resend verification email
      </SubmitButton>
    </form>
  );
}
