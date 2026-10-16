import { Clock } from 'lucide-react';
import { useRetryAfter } from '@/hooks/use-retry-after';
import { cn } from '@/lib/utils';

interface RetryAfterNoticeProps {
  seconds: number;
  /** Restarts the countdown when it changes (e.g. the error object). */
  resetKey?: unknown;
  prefix?: string;
  className?: string;
}

/** "Too many requests. Try again in 42 s." with a live countdown ([COMP-4]). */
export function RetryAfterNotice({
  seconds,
  resetKey,
  prefix = 'Too many requests.',
  className,
}: RetryAfterNoticeProps) {
  const { remaining, active } = useRetryAfter(seconds, resetKey);
  return (
    <p className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      <Clock className="size-4 shrink-0" aria-hidden />
      {/* Announced once; the ticking number is hidden from screen readers. */}
      <span role="status" className="sr-only">
        {`${prefix} Try again in ${seconds} seconds.`}
      </span>
      <span aria-hidden className="tabular">
        {active ? `${prefix} Try again in ${remaining} s.` : 'You can try again now.'}
      </span>
    </p>
  );
}
