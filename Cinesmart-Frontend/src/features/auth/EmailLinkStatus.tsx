import { CircleCheck, Link2Off, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { isRateLimited } from '@/api/errors';
import { errorMessage, logIfClientBug } from '@/components/feedback/error-message';
import { InlineAlert } from '@/components/feedback/InlineAlert';
import { RetryAfterNotice } from '@/components/feedback/RetryAfterNotice';
import { Button } from '@/components/ui/button';
import { useRetryAfter } from '@/hooks/use-retry-after';

/** Shared states of the email-link pages ([ROUTES-10]). */
export function EmailLinkPending({ children }: { children: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-4 py-6 text-center">
      <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
      <p role="status" className="text-muted-foreground">
        {children}
      </p>
    </div>
  );
}

interface EmailLinkResultProps {
  variant: 'success' | 'invalid';
  title: string;
  children?: ReactNode;
  actions: ReactNode;
}

export function EmailLinkResult({ variant, title, children, actions }: EmailLinkResultProps) {
  const Icon = variant === 'success' ? CircleCheck : Link2Off;
  return (
    <div className="grid justify-items-center gap-4 text-center">
      <Icon
        className={variant === 'success' ? 'size-10 text-success' : 'size-10 text-muted-foreground'}
        aria-hidden
      />
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {children && (
        <div role={variant === 'success' ? 'status' : 'alert'} className="text-muted-foreground">
          {children}
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-2">{actions}</div>
    </div>
  );
}

/** 429 / 503 / network: the token was not consumed, so the user may retry. */
export function EmailLinkRetry({
  error,
  onRetry,
  pending,
}: {
  error: unknown;
  onRetry: () => void;
  pending: boolean;
}) {
  logIfClientBug(error);
  const retryAfter = isRateLimited(error) ? error.retryAfter : null;
  const { active } = useRetryAfter(retryAfter, error);
  return (
    <div className="grid gap-4">
      <InlineAlert variant="error">
        {retryAfter != null ? (
          <RetryAfterNotice seconds={retryAfter} resetKey={error} className="text-foreground/85" />
        ) : (
          errorMessage(error, 'form')
        )}
      </InlineAlert>
      <Button onClick={onRetry} disabled={pending || active} aria-busy={pending || undefined}>
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        Retry
      </Button>
    </div>
  );
}
