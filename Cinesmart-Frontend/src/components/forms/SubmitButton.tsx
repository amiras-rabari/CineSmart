import { Loader2 } from 'lucide-react';
import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SubmitButtonProps extends Omit<ComponentProps<typeof Button>, 'type'> {
  pending: boolean;
  /** e.g. a `Retry-After` countdown is running. */
  blocked?: boolean;
}

/** Disabled while submitting or while a rate-limit countdown runs ([COMP-5]). */
export function SubmitButton({
  pending,
  blocked,
  disabled,
  className,
  children,
  ...props
}: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending || blocked || disabled}
      aria-busy={pending || undefined}
      className={cn('w-full', className)}
      {...props}
    >
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </Button>
  );
}
