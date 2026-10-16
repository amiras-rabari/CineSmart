import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Why a recommendation was picked (contract [REC-1]); full text in `title` when truncated. */
export function ReasonChip({ reason, className }: { reason: string; className?: string }) {
  return (
    <span
      title={reason}
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted-foreground',
        className,
      )}
    >
      <Sparkles className="size-3 shrink-0 text-primary" aria-hidden />
      <span className="truncate">{reason}</span>
    </span>
  );
}
