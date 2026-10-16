import { isRateLimited } from '@/api/errors';
import { InlineAlert } from '@/components/feedback/InlineAlert';
import { RetryAfterNotice } from '@/components/feedback/RetryAfterNotice';

interface FormAlertProps {
  error: unknown;
  message: string | null;
  className?: string;
}

/** Form-level alert for non-field errors; a 429 with `Retry-After` shows a live countdown ([COMP-5]). */
export function FormAlert({ error, message, className }: FormAlertProps) {
  if (isRateLimited(error) && error.retryAfter != null) {
    return (
      <InlineAlert variant="error" className={className}>
        <RetryAfterNotice
          seconds={error.retryAfter}
          resetKey={error}
          className="text-foreground/85"
        />
      </InlineAlert>
    );
  }
  if (!message) return null;
  return (
    <InlineAlert variant="error" className={className}>
      {message}
    </InlineAlert>
  );
}
