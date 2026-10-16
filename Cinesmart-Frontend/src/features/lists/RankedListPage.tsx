import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { isRankedListKey, type RankedListKey } from '@/api/discovery';
import { PageHeader } from '@/components/layout/PageHeader';
import { NotFound } from '@/features/errors/NotFound';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { usePageParam } from '@/hooks/use-page-param';
import { formatInteger } from '@/lib/format';
import { LIST_META, LIST_PAGE_SIZE } from '@/lib/ranked-lists';
import { rankedListQuery } from '@/query/list-queries';
import { useViewer } from '@/session/session-store';
import { ListResults } from './ListResults';

/** `/lists/:listKey`: [ROUTES-3]; contract [DISC-4]…[DISC-7]. Unknown key → 404. */
export function Component() {
  const { listKey } = useParams();
  if (!isRankedListKey(listKey)) return <NotFound />;
  return <RankedList key={listKey} listKey={listKey} />;
}

function RankedList({ listKey }: { listKey: RankedListKey }) {
  const meta = LIST_META[listKey];
  useDocumentTitle(meta.title);
  const v = useViewer();
  const { page, hrefForPage } = usePageParam();
  const query = useQuery({
    ...rankedListQuery(v, listKey, page - 1, LIST_PAGE_SIZE),
    // Keep the previous page on screen while the next loads, but never another list's.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2] === listKey ? previous : undefined,
  });

  return (
    <div className="content-width flex flex-col gap-6 page-gutter py-8 lg:py-10">
      <PageHeader
        title={meta.title}
        subtitle={meta.subtitle}
        meta={
          query.data && query.data.totalResults > 0
            ? `${formatInteger(query.data.totalResults)} titles`
            : undefined
        }
      />
      {listKey === 'imdb-top-250' && (
        <p className="text-xs text-subtle-foreground">
          Derived from stored IMDb data; may differ from IMDb&apos;s official list.
        </p>
      )}
      <ListResults query={query} page={page} hrefForPage={hrefForPage} emptyTitle={meta.empty} />
    </div>
  );
}
