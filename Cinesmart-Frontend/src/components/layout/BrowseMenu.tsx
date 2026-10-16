import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import type { NamedRef } from '@/api/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { browseSearch, type BrowseLocationState } from '@/features/browse/browse-params';
import { cn } from '@/lib/utils';
import { genresQuery, languagesQuery } from '@/query/catalog-queries';

/** Languages listed in the menu before "All languages…" ([ROUTES-4]). */
const MENU_LANGUAGES = 12;

/**
 * Desktop Browse menu ([COMP-1], [ROUTES-4]). Genres and languages load on the first open and
 * share the 1 h cached queries with /browse, so later opens make no request.
 */
export function BrowseMenu() {
  const location = useLocation();
  const [opened, setOpened] = useState(false);
  const genres = useQuery({ ...genresQuery(), enabled: opened });
  const languages = useQuery({ ...languagesQuery(), enabled: opened });
  const active = location.pathname === '/browse';
  // After an item navigates, focus belongs to the new page (its h1 or a filter), not the trigger.
  const navigated = useRef(false);
  const onNavigate = () => {
    navigated.current = true;
  };

  return (
    <DropdownMenu modal={false} onOpenChange={(open) => open && setOpened(true)}>
      <DropdownMenuTrigger
        className={cn(
          'flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:text-foreground',
          active ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        Browse
        <ChevronDown className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-52"
        onCloseAutoFocus={(event) => {
          if (navigated.current) event.preventDefault();
          navigated.current = false;
        }}
      >
        <DropdownMenuItem asChild onSelect={onNavigate}>
          <Link to="/browse">All movies</Link>
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Genres</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-96 overflow-y-auto">
            <RefItems
              query={genres}
              label="genres"
              href={(id) => `/browse${browseSearch({ genreId: id })}`}
              onNavigate={onNavigate}
            />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Languages</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-96 overflow-y-auto">
            <RefItems
              query={languages}
              label="languages"
              limit={MENU_LANGUAGES}
              href={(id) => `/browse${browseSearch({ languageId: id })}`}
              onNavigate={onNavigate}
            />
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild onSelect={onNavigate}>
              <Link to="/browse" state={{ focus: 'language' } satisfies BrowseLocationState}>
                All languages…
              </Link>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem asChild onSelect={onNavigate}>
          <Link to="/browse" state={{ focus: 'year' } satisfies BrowseLocationState}>
            By year
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RefItems({
  query,
  label,
  limit,
  href,
  onNavigate,
}: {
  query: UseQueryResult<NamedRef[]>;
  label: string;
  limit?: number;
  href: (id: number) => string;
  onNavigate: () => void;
}) {
  if (query.isPending) return <DropdownMenuItem disabled>Loading…</DropdownMenuItem>;
  if (query.isError) {
    return (
      // Keep the menu open so the retried list appears in place.
      <DropdownMenuItem
        onSelect={(event) => {
          event.preventDefault();
          void query.refetch();
        }}
      >
        Couldn&apos;t load {label}. Retry
      </DropdownMenuItem>
    );
  }
  return query.data.slice(0, limit).map(({ id, name }) => (
    <DropdownMenuItem key={id} asChild onSelect={onNavigate}>
      <Link to={href(id)}>{name}</Link>
    </DropdownMenuItem>
  ));
}
