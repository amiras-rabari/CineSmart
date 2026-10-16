import { useQueries, type QueryKey } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import type { MovieCard as MovieCardData, Page } from '@/api/types';
import { CardSkeleton } from '@/components/feedback/Skeletons';
import { Button } from '@/components/ui/button';
import { CARD_GAP_CLASS, ROW_CARD_WIDTH_CLASS } from '@/lib/constants';
import { formatInteger } from '@/lib/format';
import { cn } from '@/lib/utils';
import { MovieCard } from './MovieCard';

/** Query options for page N (0-based) of the row's list, cached under its [ARCH-4] key. */
export type RowPageQuery = (page: number) => {
  queryKey: QueryKey;
  queryFn: (context: { signal: AbortSignal }) => Promise<Page<MovieCardData>>;
  staleTime?: number;
};

interface MovieRowProps {
  title: string;
  subtitle?: string;
  seeAllHref?: string;
  /** Size of the whole list behind the row. */
  totalResults?: number;
  /** The cards the row starts with (page 0, e.g. from /home). */
  initial: readonly MovieCardData[];
  pageQuery?: RowPageQuery;
  pageSize?: number;
  maxItems?: number;
  headingLevel?: 'h2' | 'h3';
  /** First row on the page: its first visible posters load eagerly. */
  priority?: boolean;
}

/** Append pages to the starting cards, de-duplicated by `movieId` within the row. */
function mergeCards(
  initial: readonly MovieCardData[],
  pages: readonly (readonly MovieCardData[])[],
): MovieCardData[] {
  const seen = new Set<number>();
  const merged: MovieCardData[] = [];
  for (const card of [initial, ...pages].flat()) {
    if (seen.has(card.movieId)) continue;
    seen.add(card.movieId);
    merged.push(card);
  }
  return merged;
}

/**
 * Horizontal row with scroll-snap and arrows ([COMP-2]). Scrolling to within one viewport of
 * the end loads the next page ([ROUTES-2]) until `maxItems` or `totalResults`; then a "See all" tile.
 */
export function MovieRow({
  title,
  subtitle,
  seeAllHref,
  totalResults,
  initial,
  pageQuery,
  pageSize = 10,
  maxItems = 50,
  headingLevel: Heading = 'h2',
  priority = false,
}: MovieRowProps) {
  const headingId = useId();
  const scrollerRef = useRef<HTMLUListElement>(null);
  /** Pages 1…requested have been asked for (page 0 is `initial`). */
  const [requested, setRequested] = useState(0);

  const pages = useQueries({
    queries: pageQuery ? Array.from({ length: requested }, (_, i) => pageQuery(i + 1)) : [],
  });

  const items = mergeCards(
    initial,
    pages.map((query) => query.data?.results ?? []),
  ).slice(0, maxItems);
  const total = totalResults ?? initial.length;
  const last = pages[pages.length - 1];
  const loading = pages.some((query) => query.isPending);
  const failed = last?.isError ?? false;
  const exhausted = last?.data != null && last.data.results.length === 0;
  const canLoadMore =
    !!pageQuery && !exhausted && items.length < maxItems && (requested + 1) * pageSize < total;

  function loadMoreIfNearEnd() {
    const el = scrollerRef.current;
    if (!el || !canLoadMore || loading || failed) return;
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - el.clientWidth) {
      setRequested((n) => n + 1);
    }
  }

  function scrollByViewport(direction: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy?.({ left: direction * el.clientWidth * 0.9, behavior: reduce ? 'auto' : 'smooth' });
    if (direction === 1) loadMoreIfNearEnd();
  }

  const showSeeAllTile = !!seeAllHref && !canLoadMore && !loading && !failed;

  return (
    <section aria-labelledby={headingId} className="group/row flex flex-col gap-3">
      <div className="flex items-end justify-between gap-4 page-gutter">
        <div className="min-w-0">
          <Heading id={headingId} className="text-lg font-semibold tracking-tight lg:text-xl">
            {title}
          </Heading>
          {subtitle && <p className="text-sm text-subtle-foreground">{subtitle}</p>}
        </div>
        {seeAllHref && (
          <Link
            to={seeAllHref}
            className="shrink-0 rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            See all{totalResults != null && ` (${formatInteger(totalResults)})`}
            <span className="sr-only">: {title}</span>
          </Link>
        )}
      </div>

      <div className="relative">
        <ul
          ref={scrollerRef}
          aria-labelledby={headingId}
          onScroll={loadMoreIfNearEnd}
          className={cn(
            'flex snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] overflow-x-auto scroll-smooth page-gutter py-2 motion-reduce:scroll-auto sm:scroll-px-6 lg:scroll-px-12 [&::-webkit-scrollbar]:hidden',
            CARD_GAP_CLASS,
          )}
        >
          {items.map((movie, index) => (
            <li key={movie.movieId} className={cn(ROW_CARD_WIDTH_CLASS, 'snap-start')}>
              <MovieCard movie={movie} variant="row" priority={priority && index < 4} />
            </li>
          ))}
          {loading && (
            <li className={ROW_CARD_WIDTH_CLASS}>
              <CardSkeleton />
            </li>
          )}
          {failed && (
            <li className={cn(ROW_CARD_WIDTH_CLASS, 'snap-start')}>
              <div className="flex aspect-[2/3] flex-col items-center justify-center gap-3 rounded-md border border-dashed p-3 text-center">
                <p className="text-sm text-muted-foreground" role="status">
                  Couldn&apos;t load more
                </p>
                <Button variant="secondary" size="sm" onClick={() => void last?.refetch()}>
                  <RotateCw aria-hidden />
                  Retry
                </Button>
              </div>
            </li>
          )}
          {showSeeAllTile && (
            <li className={cn(ROW_CARD_WIDTH_CLASS, 'snap-start')}>
              <Link
                to={seeAllHref}
                className="flex aspect-[2/3] flex-col items-center justify-center gap-2 rounded-md border bg-surface p-3 text-center transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-surface-3">
                  <ChevronRight className="size-5 text-primary" aria-hidden />
                </span>
                <span className="text-sm font-medium">See all</span>
                {totalResults != null && (
                  <span className="text-xs text-subtle-foreground tabular">
                    {formatInteger(totalResults)} titles
                  </span>
                )}
                <span className="sr-only">: {title}</span>
              </Link>
            </li>
          )}
        </ul>

        {/* Hidden on mobile (swipe); on desktop shown on row hover/focus ([DS-3]). */}
        <RowArrow side="left" title={title} onClick={() => scrollByViewport(-1)} />
        <RowArrow side="right" title={title} onClick={() => scrollByViewport(1)} />
      </div>
    </section>
  );
}

function RowArrow({
  side,
  title,
  onClick,
}: {
  side: 'left' | 'right';
  title: string;
  onClick: () => void;
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <Button
      type="button"
      variant="secondary"
      size="icon-lg"
      aria-label={`Scroll ${title} ${side}`}
      onClick={onClick}
      className={cn(
        'absolute top-[38%] z-10 hidden -translate-y-1/2 rounded-full shadow-pop sm:inline-flex lg:opacity-0 lg:transition-opacity lg:group-focus-within/row:opacity-100 lg:group-hover/row:opacity-100',
        side === 'left' ? 'left-2' : 'right-2',
      )}
    >
      <Icon className="size-5" aria-hidden />
    </Button>
  );
}
