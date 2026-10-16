import { useQuery } from '@tanstack/react-query';
import { Clapperboard } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { RowSkeleton } from '@/components/feedback/Skeletons';
import { SearchBox } from '@/components/layout/SearchBox';
import { MovieRow } from '@/components/movie/MovieRow';
import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { LIST_META } from '@/lib/ranked-lists';
import { homeQuery, sectionPageQuery } from '@/query/list-queries';
import { useSession, useViewer } from '@/session/session-store';

/** `/`: anonymous hero + the [DISC-1] sections as rows ([ROUTES-2]). */
export function Component() {
  useDocumentTitle('');
  const { status } = useSession();
  const v = useViewer();
  const home = useQuery(homeQuery(v));

  return (
    <div className="flex flex-col gap-8 pb-12 lg:gap-12">
      {status === 'anonymous' ? <Hero /> : <h1 className="sr-only">Home</h1>}

      {home.isPending ? (
        <div className="flex flex-col gap-8 page-gutter lg:gap-12">
          <RowSkeleton />
          <RowSkeleton />
          <RowSkeleton />
        </div>
      ) : home.isError ? (
        <ErrorState error={home.error} onRetry={() => void home.refetch()} />
      ) : home.data.sections.length === 0 ? (
        <EmptyState icon={Clapperboard} title="No movies to show yet." />
      ) : (
        home.data.sections.map((section, index) => {
          const meta = LIST_META[section.key];
          return (
            <MovieRow
              key={`${v}-${section.key}`}
              title={section.title}
              subtitle={meta.subtitle}
              seeAllHref={meta.href}
              totalResults={section.totalResults}
              initial={section.results}
              pageQuery={sectionPageQuery(v, section.key)}
              priority={index === 0}
            />
          );
        })
      )}
    </div>
  );
}

function Hero() {
  return (
    <section className="border-b bg-gradient-to-b from-surface to-background">
      <div className="content-width flex flex-col gap-5 page-gutter py-10 lg:py-16">
        <h1
          tabIndex={-1}
          className="max-w-3xl text-3xl font-bold tracking-tight outline-none lg:text-5xl lg:leading-[3.25rem]"
        >
          Find your next movie, and where to watch it in Canada.
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground lg:text-lg">
          Browse trending titles and IMDb&apos;s best, see Canadian streaming availability, and sign
          up to rate, like and get picks made for you.
        </p>
        <SearchBox variant="hero" className="w-full max-w-xl" />
        <div className="flex flex-wrap gap-2">
          <Button asChild size="lg">
            <Link to="/signup">Sign up</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
