import { Skeleton } from '@/components/ui/skeleton';
import { CARD_GAP_CLASS, GRID_COLUMNS_CLASS, ROW_CARD_WIDTH_CLASS } from '@/lib/constants';
import { cn } from '@/lib/utils';

// Loading placeholders sized like the final layout, so nothing shifts ([COMP-4]).

function LoadingStatus() {
  return (
    <span role="status" className="sr-only">
      Loading…
    </span>
  );
}

function CardBlock({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Skeleton className="aspect-[2/3] w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={className}>
      <LoadingStatus />
      <div aria-hidden>
        <CardBlock />
      </div>
    </div>
  );
}

export function RowSkeleton({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div className={className}>
      <LoadingStatus />
      <div aria-hidden className="flex flex-col gap-3">
        <Skeleton className="h-6 w-48" />
        <div className={cn('flex overflow-hidden', CARD_GAP_CLASS)}>
          {Array.from({ length: count }, (_, i) => (
            <CardBlock key={i} className={ROW_CARD_WIDTH_CLASS} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 12, className }: { count?: number; className?: string }) {
  return (
    <div className={className}>
      <LoadingStatus />
      <div aria-hidden className={cn(GRID_COLUMNS_CLASS, CARD_GAP_CLASS)}>
        {Array.from({ length: count }, (_, i) => (
          <CardBlock key={i} />
        ))}
      </div>
    </div>
  );
}

export function DetailsSkeleton({ className }: { className?: string }) {
  return (
    <div className={className}>
      <LoadingStatus />
      <div aria-hidden className="flex flex-col gap-6 sm:flex-row lg:gap-10">
        <Skeleton className="mx-auto aspect-[2/3] w-1/2 shrink-0 sm:mx-0 sm:w-[220px] lg:w-[300px]" />
        <div className="flex flex-1 flex-col gap-4">
          <Skeleton className="h-9 w-2/3 lg:h-10" />
          <Skeleton className="h-4 w-1/3" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-32" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    </div>
  );
}
