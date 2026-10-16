import { RotateCw, TriangleAlert, WifiOff } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { hasErrorCode, isNetworkError, isRateLimited } from '@/api/errors';
import { Button } from '@/components/ui/button';
import { useRetryAfter } from '@/hooks/use-retry-after';
import { cn } from '@/lib/utils';
import { errorMessage, logIfClientBug } from './error-message';
import { RetryAfterNotice } from './RetryAfterNotice';

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
}

/** Query error with a message per [ARCH-3]; rate limits count down and auto-retry at 0 ([COMP-4]). */
export function ErrorState({ error, onRetry, title, className }: ErrorStateProps) {
  const retryAfter = isRateLimited(error) ? error.retryAfter : null;
  const { active } = useRetryAfter(retryAfter, error);

  useEffect(() => {
    logIfClientBug(error);
  }, [error]);

  // Auto-retry when the countdown reaches 0.
  const onRetryRef = useRef(onRetry);
  useEffect(() => {
    onRetryRef.current = onRetry;
  });
  const wasActive = useRef(false);
  useEffect(() => {
    if (wasActive.current && !active) onRetryRef.current?.();
    wasActive.current = active;
  }, [active]);

  const Icon = isNetworkError(error) ? WifiOff : TriangleAlert;
  const heading =
    title ??
    (retryAfter != null
      ? "You're going a bit fast"
      : hasErrorCode(error, 'SERVICE_UNAVAILABLE')
        ? 'Temporarily unavailable'
        : "We couldn't load this");

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-4 py-12 text-center',
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-surface-2">
        <Icon className="size-7 text-muted-foreground" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold">{heading}</h2>
      {retryAfter != null ? (
        <RetryAfterNotice seconds={retryAfter} resetKey={error} />
      ) : (
        <p className="max-w-md text-sm text-muted-foreground">{errorMessage(error, 'query')}</p>
      )}
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} disabled={active} className="mt-2">
          <RotateCw aria-hidden />
          Retry
        </Button>
      )}
    </div>
  );
}
