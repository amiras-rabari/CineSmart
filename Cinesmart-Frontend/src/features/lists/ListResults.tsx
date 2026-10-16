import type { UseQueryResult } from '@tanstack/react-query';
import { Clapperboard } from 'lucide-react';
import type { ReactNode } from 'react';
import { Navigate, type To } from 'react-router';
import type { MovieCard, Page } from '@/api/types';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { MovieGrid } from '@/components/movie/MovieGrid';
import { PaginationBar } from '@/components/movie/PaginationBar';
import { LIST_PAGE_SIZE } from '@/lib/ranked-lists';
import { cn } from '@/lib/utils';

interface ListResultsProps<T extends MovieCard> {
  query: UseQueryResult<Page<T>>;
  /** 1-based URL page. */
  page: number;
  hrefForPage: (page: number) => To;
  emptyTitle: string;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
  renderCaption?: (item: T) => ReactNode;
  itemClassName?: (item: T) => string | undefined;
}

/** Grid + pagination with loading, error, empty and past-the-end states ([ROUTES-3], [ROUTES-4], [ROUTES-5]). */
export function ListResults<T extends MovieCard>({
  query,
  page,
  hrefForPage,
  emptyTitle,
  emptyDescription,
  emptyAction,
  renderCaption,
  itemClassName,
}: ListResultsProps<T>) {
  if (query.isPending) return <MovieGrid items={[]} loading skeletonCount={LIST_PAGE_SIZE} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const { results, totalPages } = query.data;
  // A page past the end comes back empty (contract [CONV-4]): go to the last real page.
  if (totalPages > 0 && page > totalPages) return <Navigate to={hrefForPage(totalPages)} replace />;
  if (results.length === 0) {
    return (
      <EmptyState
        icon={Clapperboard}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <MovieGrid
        items={results}
        renderCaption={renderCaption}
        itemClassName={itemClassName}
        className={cn(
          'transition-opacity duration-150',
          query.isPlaceholderData && 'pointer-events-none opacity-60',
        )}
      />
      <PaginationBar page={page} totalPages={totalPages} hrefForPage={hrefForPage} />
    </div>
  );
}
