import type { ReactNode } from 'react';
import type { MovieCard as MovieCardData } from '@/api/types';
import { GridSkeleton } from '@/components/feedback/Skeletons';
import { CARD_GAP_CLASS, GRID_COLUMNS_CLASS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { MovieCard } from './MovieCard';

interface MovieGridProps<T extends MovieCardData> {
  items: readonly T[];
  renderCaption?: (item: T) => ReactNode;
  renderAction?: (item: T) => ReactNode;
  /** e.g. fade a card that is being removed. */
  itemClassName?: (item: T) => string | undefined;
  loading?: boolean;
  skeletonCount?: number;
  className?: string;
}

/** Responsive card grid per [DS-3]; `ul`/`li` semantics ([COMP-2]). */
export function MovieGrid<T extends MovieCardData>({
  items,
  renderCaption,
  renderAction,
  itemClassName,
  loading,
  skeletonCount = 20,
  className,
}: MovieGridProps<T>) {
  if (loading) return <GridSkeleton count={skeletonCount} className={className} />;
  return (
    <ul className={cn(GRID_COLUMNS_CLASS, CARD_GAP_CLASS, 'gap-y-6 lg:gap-y-8', className)}>
      {items.map((item, index) => (
        <li key={item.movieId} className={itemClassName?.(item)}>
          <MovieCard
            movie={item}
            caption={renderCaption?.(item)}
            action={renderAction ? renderAction(item) : undefined}
            priority={index < 6}
          />
        </li>
      ))}
    </ul>
  );
}
