import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** `h1` when the empty state is the whole page (e.g. 404). */
  headingLevel?: 'h1' | 'h2';
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  headingLevel: Heading = 'h2',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-4 py-12 text-center',
        className,
      )}
    >
      {Icon && (
        <div className="flex size-14 items-center justify-center rounded-full bg-surface-2">
          <Icon className="size-7 text-muted-foreground" aria-hidden />
        </div>
      )}
      <Heading
        tabIndex={Heading === 'h1' ? -1 : undefined}
        className="text-lg font-semibold outline-none"
      >
        {title}
      </Heading>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
