import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Bookmark } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { ListResults } from '@/features/lists/ListResults';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { usePageParam } from '@/hooks/use-page-param';
import { formatCountOf, formatDate } from '@/lib/format';
import { LIST_PAGE_SIZE } from '@/lib/ranked-lists';
import { watchlistQuery } from '@/query/me-queries';
import { useViewer } from '@/session/session-store';

/**
 * `/watchlist` (login): [ROUTES-7]; contract [ME-2] [ACT-3]. Each card's watchlist button removes
 * it: the card fades at once, then the page refetches; an emptied last page goes back a page
 * (`ListResults` redirects past-the-end pages).
 */
export function Component() {
  useDocumentTitle('My watchlist');
  const v = useViewer();
  const { page, hrefForPage } = usePageParam();
  const query = useQuery({
    ...watchlistQuery(v, page - 1, LIST_PAGE_SIZE),
    placeholderData: keepPreviousData,
  });
  const empty = query.data?.totalResults === 0;

  return (
    <div className="content-width flex flex-col gap-6 page-gutter py-8 lg:py-10">
      <PageHeader
        title="My watchlist"
        subtitle="Newest first."
        meta={query.data && !empty ? formatCountOf(query.data.totalResults, 'title') : undefined}
      />
      {empty ? (
        <EmptyState
          icon={Bookmark}
          title="Your watchlist is empty."
          description="Add movies from their page or from any card's bookmark button."
          action={
            <Button asChild>
              <Link to="/browse">Browse movies</Link>
            </Button>
          }
        />
      ) : (
        <ListResults
          query={query}
          page={page}
          hrefForPage={hrefForPage}
          emptyTitle="Your watchlist is empty."
          renderCaption={(item) => (
            <p className="text-xs text-subtle-foreground">Added {formatDate(item.addedAt)}</p>
          )}
          itemClassName={(item) =>
            item.inWatchlist === false ? 'opacity-40 transition-opacity duration-300' : undefined
          }
        />
      )}
    </div>
  );
}
