import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { changeEmail } from '@/api/auth';
import { hasErrorCode } from '@/api/errors';
import { InlineAlert } from '@/components/feedback/InlineAlert';
import { FormAlert } from '@/components/forms/FormAlert';
import { PasswordField } from '@/components/forms/PasswordField';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { TextField } from '@/components/forms/TextField';
import { useFormServerError } from '@/components/forms/use-form-server-error';
import { changeEmailSchema, type ChangeEmailValues } from '@/lib/validation';

export const EMAIL_SEND_FAILED = "We couldn't send the confirmation email. Please try again later.";

/**
 * [ROUTES-8] card 4; contract [AUTH-12]. The email only changes once the link sent to the new
 * address is opened (/confirm-email), so the Account card keeps the old one until then.
 */
export function ChangeEmailForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useForm<ChangeEmailValues>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: { currentPassword: '', newEmail: '' },
  });
  const server = useFormServerError(form.setError, ['currentPassword', 'newEmail']);
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ currentPassword, newEmail }) => {
    server.clear();
    setSentTo(null);
    try {
      await changeEmail({ currentPassword, newEmail });
      setSentTo(newEmail);
      form.reset();
    } catch (error) {
      server.handle(
        error,
        hasErrorCode(error, 'SERVICE_UNAVAILABLE') ? EMAIL_SEND_FAILED : undefined,
      );
    }
  });

  return (
    <form noValidate onSubmit={(e) => void onSubmit(e)} className="grid gap-4">
      {sentTo && (
        <InlineAlert variant="success">
          We sent a confirmation link to {sentTo}. Your email changes after you open it.
        </InlineAlert>
      )}
      <FormAlert error={server.error} message={server.message} />
      <PasswordField
        label="Current password"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        {...form.register('currentPassword')}
      />
      <TextField
        label="New email"
        type="email"
        autoComplete="email"
        error={errors.newEmail?.message}
        {...form.register('newEmail')}
      />
      <SubmitButton
        pending={isSubmitting}
        blocked={server.blocked}
        className="sm:w-auto sm:justify-self-start"
      >
        Change email
      </SubmitButton>
    </form>
  );
}
