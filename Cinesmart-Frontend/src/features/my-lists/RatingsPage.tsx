import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { RatingBadges } from '@/components/movie/RatingBadges';
import { Button } from '@/components/ui/button';
import { ListResults } from '@/features/lists/ListResults';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { usePageParam } from '@/hooks/use-page-param';
import { formatDate, formatInteger } from '@/lib/format';
import { LIST_PAGE_SIZE } from '@/lib/ranked-lists';
import { ratingsQuery } from '@/query/me-queries';
import { useViewer } from '@/session/session-store';

/** `/ratings` (login): [ROUTES-7]; contract [ME-3]. Ratings change on the details page. */
export function Component() {
  useDocumentTitle('My ratings');
  const v = useViewer();
  const { page, hrefForPage } = usePageParam();
  const query = useQuery({
    ...ratingsQuery(v, page - 1, LIST_PAGE_SIZE),
    placeholderData: keepPreviousData,
  });
  const empty = query.data?.totalResults === 0;

  return (
    <div className="content-width flex flex-col gap-6 page-gutter py-8 lg:py-10">
      <PageHeader
        title="My ratings"
        subtitle="Most recent first. Change a rating on the movie's page."
        meta={query.data && !empty ? `${formatInteger(query.data.totalResults)} rated` : undefined}
      />
      {empty ? (
        <EmptyState
          icon={Star}
          title="You haven't rated any movies yet."
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
          emptyTitle="You haven't rated any movies yet."
          renderCaption={(item) => (
            <div className="flex flex-wrap items-center gap-2">
              <RatingBadges userRating={item.rating} />
              <span className="text-xs text-subtle-foreground">
                Rated {formatDate(item.ratedAt)}
              </span>
            </div>
          )}
        />
      )}
    </div>
  );
}
