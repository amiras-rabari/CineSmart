import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { COLD_START_REASON } from '@/api/recommendations';
import { InlineAlert } from '@/components/feedback/InlineAlert';
import { PageHeader } from '@/components/layout/PageHeader';
import { ReasonChip } from '@/components/movie/ReasonChip';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { usePageParam } from '@/hooks/use-page-param';
import { formatInteger } from '@/lib/format';
import { LIST_META, LIST_PAGE_SIZE } from '@/lib/ranked-lists';
import { recsQuery } from '@/query/list-queries';
import { useViewer } from '@/session/session-store';
import { ListResults } from './ListResults';

/** `/for-you` (login required): [ROUTES-3]; contract [REC-1]. */
export function Component() {
  const meta = LIST_META['for-you'];
  useDocumentTitle(meta.title);
  const v = useViewer();
  const { page, hrefForPage } = usePageParam();
  const query = useQuery({
    ...recsQuery(v, page - 1, LIST_PAGE_SIZE),
    placeholderData: keepPreviousData,
  });

  const results = query.data?.results ?? [];
  const coldStart =
    page === 1 && results.length > 0 && results.every((card) => card.reason === COLD_START_REASON);

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
      {coldStart && (
        <InlineAlert variant="info">
          Rate, like, watch or add a few movies and this list will adapt to your taste.
        </InlineAlert>
      )}
      <ListResults
        query={query}
        page={page}
        hrefForPage={hrefForPage}
        emptyTitle={meta.empty}
        renderCaption={(card) => <ReasonChip reason={card.reason} />}
      />
    </div>
  );
}
