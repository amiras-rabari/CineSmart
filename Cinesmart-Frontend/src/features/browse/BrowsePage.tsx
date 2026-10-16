import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router';
import type { BrowseFilters as Filters } from '@/api/discovery';
import { hasErrorCode } from '@/api/errors';
import type { NamedRef } from '@/api/types';
import { InlineAlert } from '@/components/feedback/InlineAlert';
import { PageHeader } from '@/components/layout/PageHeader';
import { MovieGrid } from '@/components/movie/MovieGrid';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ListResults } from '@/features/lists/ListResults';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { TABLET_UP_QUERY, useMediaQuery } from '@/hooks/use-media-query';
import { pageSearch, usePageParam } from '@/hooks/use-page-param';
import { formatCountOf } from '@/lib/format';
import { LIST_PAGE_SIZE } from '@/lib/ranked-lists';
import { genresQuery, languagesQuery } from '@/query/catalog-queries';
import { browseQuery } from '@/query/list-queries';
import { useViewer } from '@/session/session-store';
import { BrowseFilters, type FilterTriggerRefs } from './BrowseFilters';
import {
  FILTER_NAMES,
  hasFilters,
  parseBrowseParams,
  withFilter,
  withoutFilters,
  type BrowseLocationState,
  type FilterName,
} from './browse-params';

const FILTER_REMOVED = "That filter isn't available, so it was removed.";

/** `/browse?genreId=&languageId=&year=&page=`: [ROUTES-4]; contract [CAT-2] [CAT-3] [DISC-2]. */
export function Component() {
  useDocumentTitle('Browse');
  const [params] = useSearchParams();
  const { filters, invalid } = parseBrowseParams(params);

  // Non-numeric filter params: drop them, keep the rest, say so.
  if (invalid.length > 0) {
    return (
      <Navigate
        to={{ search: withoutFilters(params, invalid) }}
        replace
        state={{ filterRemoved: true } satisfies BrowseLocationState}
      />
    );
  }
  return <Browse filters={filters} params={params} />;
}

function Browse({ filters, params }: { filters: Filters; params: URLSearchParams }) {
  const v = useViewer();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as BrowseLocationState;
  const tabletUp = useMediaQuery(TABLET_UP_QUERY);
  const [sheetOpenByUser, setSheetOpenByUser] = useState(false);
  // On mobile, "By genre/language/year" opens the filter sheet until it is closed.
  const [dismissedFocusKey, setDismissedFocusKey] = useState<string | null>(null);
  const sheetOpen =
    sheetOpenByUser || (!tabletUp && !!state.focus && dismissedFocusKey !== location.key);
  function setSheetOpen(open: boolean) {
    setSheetOpenByUser(open);
    if (!open) setDismissedFocusKey(location.key);
  }
  const triggerRefs: FilterTriggerRefs = {
    genre: useRef<HTMLButtonElement>(null),
    language: useRef<HTMLButtonElement>(null),
    year: useRef<HTMLButtonElement>(null),
  };
  const filtersButtonRef = useRef<HTMLButtonElement>(null);

  const { page, hrefForPage } = usePageParam();
  const genres = useQuery(genresQuery());
  const languages = useQuery(languagesQuery());
  const query = useQuery({
    ...browseQuery(v, { ...filters, page: page - 1, size: LIST_PAGE_SIZE }),
    // Keep the previous page on screen only while paging, not across filter changes.
    placeholderData: (previous, previousQuery) => {
      const prev = previousQuery?.queryKey[2] as Filters | undefined;
      return prev && FILTER_NAMES.every((name) => prev[name] === filters[name])
        ? previous
        : undefined;
    },
  });

  // A filter the API rejects (400 with fields.genreId|languageId|year): drop it with the notice.
  // Without fields (page/size) it's a client bug: back to page 1 ([ARCH-3]).
  const error = query.error;
  const rejected = hasErrorCode(error, 'VALIDATION_FAILED')
    ? FILTER_NAMES.filter((name) => error.fields?.[name] !== undefined)
    : [];
  const resetPage = hasErrorCode(error, 'VALIDATION_FAILED') && rejected.length === 0 && page > 1;
  useEffect(() => {
    if (rejected.length > 0) {
      void navigate(
        { search: withoutFilters(params, rejected) },
        { replace: true, state: { filterRemoved: true } satisfies BrowseLocationState },
      );
    } else if (resetPage) {
      void navigate({ search: pageSearch(params, 1) }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per failed request
  }, [error]);

  // Browse menu "All languages…" / "By year": focus that select on arrival (mobile: in the sheet).
  useEffect(() => {
    if (!state.focus || !tabletUp) return;
    const target = triggerRefs[state.focus];
    // Two frames: after RouteAnnouncer's next-frame focus on the h1.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => target.current?.focus());
    });
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per navigation
  }, [location.key]);

  function change(name: FilterName, value: number | undefined) {
    void navigate({ search: withFilter(params, name, value) });
  }
  function clear() {
    void navigate({ search: '' });
    setSheetOpen(false);
  }

  const filtered = hasFilters(filters);
  const filterCount = FILTER_NAMES.filter((name) => filters[name] !== undefined).length;
  const fields = (
    <BrowseFilters
      filters={filters}
      genres={genres}
      languages={languages}
      onChange={change}
      triggerRefs={triggerRefs}
      layout={tabletUp ? 'row' : 'stack'}
    />
  );
  const clearButton = (
    <Button variant="ghost" onClick={clear}>
      <X aria-hidden />
      Clear filters
    </Button>
  );

  return (
    <div className="content-width flex flex-col gap-6 page-gutter py-8 lg:py-10">
      <PageHeader
        title={filtered ? summary(filters, genres.data, languages.data) : 'All movies'}
        subtitle="Sorted by IMDb rating."
        meta={query.data ? formatCountOf(query.data.totalResults, 'movie') : undefined}
        actions={
          !tabletUp && (
            <Button variant="secondary" ref={filtersButtonRef} onClick={() => setSheetOpen(true)}>
              <SlidersHorizontal aria-hidden />
              Filters{filterCount > 0 && ` (${filterCount})`}
            </Button>
          )
        }
      />

      {tabletUp && (
        <div role="group" aria-label="Filters" className="flex flex-wrap items-end gap-3">
          {fields}
          {filtered && clearButton}
        </div>
      )}

      {state.filterRemoved && <InlineAlert variant="info">{FILTER_REMOVED}</InlineAlert>}

      {rejected.length > 0 || resetPage ? (
        <MovieGrid items={[]} loading skeletonCount={LIST_PAGE_SIZE} />
      ) : (
        <ListResults
          query={query}
          page={page}
          hrefForPage={hrefForPage}
          emptyTitle={filtered ? 'No movies match these filters.' : 'No movies to show yet.'}
          emptyAction={filtered ? clearButton : undefined}
        />
      )}

      {!tabletUp && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent
            side="bottom"
            className="max-h-[85vh] gap-0 rounded-t-xl bg-surface"
            onOpenAutoFocus={(event) => {
              const target = state.focus && triggerRefs[state.focus].current;
              if (target) {
                event.preventDefault();
                target.focus();
              }
            }}
            // Opened by state, not a Radix trigger: hand focus back to the Filters button.
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              filtersButtonRef.current?.focus();
            }}
          >
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>Results update as you choose.</SheetDescription>
            </SheetHeader>
            <div className="overflow-y-auto px-4 pb-2">{fields}</div>
            <SheetFooter className="flex-row justify-end">
              {filtered && clearButton}
              <Button onClick={() => setSheetOpen(false)}>
                {query.data ? `Show ${formatCountOf(query.data.totalResults, 'movie')}` : 'Done'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

/** "Sci-Fi · English · 2014" ([ROUTES-4]); names appear once their lists have loaded. */
function summary(
  filters: Filters,
  genres: NamedRef[] | undefined,
  languages: NamedRef[] | undefined,
): string {
  const parts = [
    filters.genreId !== undefined && genres?.find((g) => g.id === filters.genreId)?.name,
    filters.languageId !== undefined && languages?.find((l) => l.id === filters.languageId)?.name,
    filters.year !== undefined && String(filters.year),
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(' · ') : 'Filtered movies';
}
