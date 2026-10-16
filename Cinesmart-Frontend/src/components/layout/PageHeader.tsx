import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** e.g. "250 titles". */
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** Page `h1` (the focus target after navigation, [ARCH-6]) with subtitle, meta and actions ([COMP-1]). */
export function PageHeader({ title, subtitle, meta, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="flex min-w-0 flex-col gap-1">
        <h1
          tabIndex={-1}
          className="text-2xl font-semibold tracking-tight outline-none lg:text-3xl"
        >
          {title}
        </h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        {meta && <p className="text-sm text-subtle-foreground tabular">{meta}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
