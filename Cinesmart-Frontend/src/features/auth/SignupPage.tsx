import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { signup } from '@/api/auth';
import { FormAlert } from '@/components/forms/FormAlert';
import { PasswordField } from '@/components/forms/PasswordField';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { TextField } from '@/components/forms/TextField';
import { useFormServerError } from '@/components/forms/use-form-server-error';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { signupSchema, USERNAME_HINT, type SignupValues } from '@/lib/validation';
import type { LoginNotice } from './login-notice';

/** /signup: [ROUTES-9]; contract [AUTH-3]. */
export function Component() {
  useDocumentTitle('Create account');
  const navigate = useNavigate();
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { username: '', email: '', password: '' },
  });
  const server = useFormServerError(form.setError, ['username', 'email', 'password']);
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    server.clear();
    try {
      await signup(values);
      const state: LoginNotice = { notice: 'signed-up', email: values.email };
      void navigate('/login', { state });
    } catch (error) {
      server.handle(error);
    }
  });

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          Track what you watch and get recommendations.
        </p>
      </div>

      <form noValidate onSubmit={(e) => void onSubmit(e)} className="grid gap-4">
        <FormAlert error={server.error} message={server.message} />
        <TextField
          label="Username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          hint={USERNAME_HINT}
          error={errors.username?.message}
          {...form.register('username')}
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...form.register('email')}
        />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          hint="8–100 characters."
          error={errors.password?.message}
          {...form.register('password')}
        />
        <SubmitButton pending={isSubmitting} blocked={server.blocked}>
          Create account
        </SubmitButton>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="text-primary underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
