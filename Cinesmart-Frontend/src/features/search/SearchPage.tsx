import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { hasErrorCode } from '@/api/errors';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchBox } from '@/components/layout/SearchBox';
import { ListResults } from '@/features/lists/ListResults';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { usePageParam } from '@/hooks/use-page-param';
import { formatCountOf } from '@/lib/format';
import { LIST_PAGE_SIZE } from '@/lib/ranked-lists';
import { checkSearchQuery } from '@/lib/search-query';
import { searchQuery } from '@/query/list-queries';
import { useViewer } from '@/session/session-store';

/** `/search?q=&page=`: [ROUTES-5]; contract [DISC-3]. Invalid `q` → hint, no request. */
export function Component() {
  const [params] = useSearchParams();
  const raw = params.get('q') ?? '';
  const check = checkSearchQuery(raw);
  useDocumentTitle(check.ok ? `Search: ${check.value}` : 'Search');

  return (
    <div className="content-width flex flex-col gap-6 page-gutter py-8 lg:py-10">
      {check.ok ? (
        <Results key={check.value} q={check.value} />
      ) : (
        <>
          <PageHeader title="Search" subtitle={NOTE} />
          <SearchBox
            key={raw}
            variant="page"
            defaultValue={raw.trim()}
            initialHint={raw.trim() ? check.message : null}
            className="max-w-xl"
          />
          {!raw.trim() && <p className="text-sm text-muted-foreground">{check.message}</p>}
        </>
      )}
    </div>
  );
}

const NOTE = 'Matches movie titles and people (actors, directors, writers).';

function Results({ q }: { q: string }) {
  const v = useViewer();
  const { page, hrefForPage } = usePageParam();
  const query = useQuery({
    ...searchQuery(v, q, page - 1, LIST_PAGE_SIZE),
    // Keep the previous page on screen while paging the same search.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2] === q ? previous : undefined,
  });
  // The client rule matches the API's, so a 400 on `q` is unexpected; show the hint anyway.
  const qRejected = hasErrorCode(query.error, 'VALIDATION_FAILED') && !!query.error.fields?.q;

  return (
    <>
      <PageHeader
        title={`Results for “${q}”`}
        subtitle={NOTE}
        meta={
          query.data && query.data.totalResults > 0
            ? formatCountOf(query.data.totalResults, 'title')
            : undefined
        }
      />
      <SearchBox
        key={String(qRejected)}
        variant="page"
        defaultValue={q}
        initialHint={qRejected ? 'Type at least 3 characters.' : null}
        className="max-w-xl"
      />
      {!qRejected && (
        <ListResults
          query={query}
          page={page}
          hrefForPage={hrefForPage}
          emptyTitle={`No movies or people match “${q}”.`}
          emptyDescription="Check the spelling, or try a shorter word or just part of a name."
        />
      )}
    </>
  );
}
