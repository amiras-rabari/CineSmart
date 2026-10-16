import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { changePassword } from '@/api/auth';
import { notify } from '@/components/feedback/notify';
import { FormAlert } from '@/components/forms/FormAlert';
import { PasswordField } from '@/components/forms/PasswordField';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { useFormServerError } from '@/components/forms/use-form-server-error';
import { changePasswordSchema, type ChangePasswordValues } from '@/lib/validation';
import { completeLogin } from '@/session/session-manager';

export const PASSWORD_CHANGED = 'Password changed. Other devices were signed out.';

/**
 * [ROUTES-8] card 3; contract [AUTH-11]. Success returns a new session: it is stored and
 * broadcast at once, because the token used for the request is now revoked ([ARCH-2]).
 */
export function ChangePasswordForm() {
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });
  const server = useFormServerError(form.setError, ['currentPassword', 'newPassword']);
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ currentPassword, newPassword }) => {
    server.clear();
    try {
      completeLogin(await changePassword({ currentPassword, newPassword }));
      notify.success(PASSWORD_CHANGED);
      form.reset();
    } catch (error) {
      server.handle(error);
    }
  });

  return (
    <form noValidate onSubmit={(e) => void onSubmit(e)} className="grid gap-4">
      <FormAlert error={server.error} message={server.message} />
      <PasswordField
        label="Current password"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        {...form.register('currentPassword')}
      />
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
      <SubmitButton
        pending={isSubmitting}
        blocked={server.blocked}
        className="sm:w-auto sm:justify-self-start"
      >
        Change password
      </SubmitButton>
    </form>
  );
}
