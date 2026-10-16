import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import type { MovieDetails } from '@/api/catalog';
import { hasErrorCode } from '@/api/errors';
import type { NamedRef } from '@/api/types';
import { MovieActions } from '@/components/activity/MovieActions';
import { ErrorState } from '@/components/feedback/ErrorState';
import { DetailsSkeleton, RowSkeleton } from '@/components/feedback/Skeletons';
import { MovieRow } from '@/components/movie/MovieRow';
import { PosterImage } from '@/components/movie/PosterImage';
import { browseSearch } from '@/features/browse/browse-params';
import { NotFound } from '@/features/errors/NotFound';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { formatRuntime } from '@/lib/format';
import { movieQuery, SIMILAR_SIZE, similarQuery } from '@/query/movie-queries';
import { useViewer } from '@/session/session-store';
import {
  CineSmartStats,
  Credits,
  DetailsList,
  ExternalRatings,
  WhereToWatch,
} from './DetailsSections';

/** `/movies/:movieId`: [ROUTES-6]; contract [CAT-1] [REC-2]. A non-positive-integer id → 404. */
export function Component() {
  const { movieId: raw } = useParams();
  const movieId = raw && /^\d+$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isSafeInteger(movieId) || movieId <= 0) return <NotFound />;
  return <Details key={movieId} movieId={movieId} />;
}

function Details({ movieId }: { movieId: number }) {
  const v = useViewer();
  const query = useQuery(movieQuery(v, movieId));
  useDocumentTitle(query.data?.title ?? (query.isError ? 'Movie' : ''));

  if (query.isPending) {
    return (
      <div className="content-width page-gutter py-8 lg:py-10">
        <DetailsSkeleton />
      </div>
    );
  }
  if (query.isError) {
    if (hasErrorCode(query.error, 'MOVIE_NOT_FOUND')) return <NotFound variant="movie" />;
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  }
  return <DetailsView movie={query.data} />;
}

function DetailsView({ movie }: { movie: MovieDetails }) {
  // Shown once per visit after a rating/reaction change ([ARCH-5]).
  const [statsHint, setStatsHint] = useState(false);
  const meta = [
    movie.year,
    movie.runtime != null ? formatRuntime(movie.runtime) : null,
    movie.contentType ? capitalize(movie.contentType) : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-10 pb-12">
      <div className="relative isolate overflow-hidden">
        <Backdrop poster={movie.poster} />
        <div className="content-width flex flex-col gap-6 page-gutter pt-8 sm:flex-row lg:gap-10 lg:pt-12">
          <div className="mx-auto w-1/2 max-w-[220px] shrink-0 sm:mx-0 sm:w-[220px] sm:max-w-none lg:w-[300px]">
            <PosterImage src={movie.poster} title={movie.title} size="details" priority />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h1
                tabIndex={-1}
                className="text-3xl font-semibold tracking-tight outline-none lg:text-4xl"
              >
                {movie.title}
              </h1>
              {meta.length > 0 && (
                <p className="text-sm text-muted-foreground tabular">{meta.join(' · ')}</p>
              )}
            </div>
            <ChipLinks label="Genres" items={movie.genres} param="genreId" />
            <ChipLinks label="Languages" items={movie.languages} param="languageId" />
            <MovieActions
              movieId={movie.movieId}
              userState={movie.userState}
              onStatsAffected={() => setStatsHint(true)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <ExternalRatings ratings={movie.ratings} />
              <CineSmartStats stats={movie.platformStats} showHint={statsHint} />
            </div>
            {movie.plot && <p className="max-w-prose leading-relaxed">{movie.plot}</p>}
          </div>
        </div>
      </div>

      <div className="content-width grid gap-10 page-gutter lg:grid-cols-[2fr_1fr]">
        <Credits movie={movie} />
        <div className="flex flex-col gap-10">
          <DetailsList movie={movie} />
          <WhereToWatch availability={movie.availability} />
        </div>
      </div>

      <Similar movieId={movie.movieId} />
    </div>
  );
}

function Backdrop({ poster }: { poster: string | null }) {
  const usable = poster && poster !== 'N/A';
  return (
    <div aria-hidden className="absolute inset-0 -z-10">
      {usable && (
        <div
          className="absolute inset-0 scale-110 bg-cover bg-center opacity-30 blur-2xl"
          style={{ backgroundImage: `url("${poster}")` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
    </div>
  );
}

function ChipLinks({
  label,
  items,
  param,
}: {
  label: string;
  items: NamedRef[];
  param: 'genreId' | 'languageId';
}) {
  if (items.length === 0) return null;
  return (
    <ul aria-label={label} className="flex flex-wrap gap-1.5">
      {items.map(({ id, name }) => (
        <li key={id}>
          <Link
            to={`/browse${browseSearch({ [param]: id })}`}
            className="inline-flex rounded-full border bg-surface px-3 py-1 text-xs font-medium transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** "More like this" ([REC-2]): skeleton while loading, hidden when empty or on error. */
function Similar({ movieId }: { movieId: number }) {
  const v = useViewer();
  const query = useQuery(similarQuery(v, movieId));
  if (query.isPending) return <RowSkeleton className="page-gutter" />;
  if (query.isError || query.data.length === 0) return null;
  return (
    <MovieRow
      title="More like this"
      initial={query.data}
      totalResults={query.data.length}
      maxItems={SIMILAR_SIZE}
    />
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
