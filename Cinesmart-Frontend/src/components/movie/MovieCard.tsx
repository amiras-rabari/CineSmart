import { Bookmark, Eye, Star } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { MovieCard as MovieCardData } from '@/api/types';
import { CardWatchlistButton } from '@/components/activity/CardWatchlistButton';
import { useWatchedSet } from '@/query/watched-set';
import { formatRating } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PosterImage } from './PosterImage';

interface MovieCardProps {
  movie: MovieCardData;
  /** Under the meta line, e.g. a recommendation reason. */
  caption?: ReactNode;
  /** Over the poster, outside the link. Default: `CardWatchlistButton`; `null` for none. */
  action?: ReactNode;
  variant?: 'row' | 'grid';
  priority?: boolean;
}

/**
 * One link to `/movies/:id` with the title as its name ([COMP-2]). Flags are `null` when
 * anonymous, so the bookmark/eye markers only appear for signed-in users. The eye marker comes
 * from the watched-ID set when it is loaded ([ARCH-5]), else from `card.watched`.
 */
export function MovieCard({ movie, caption, action, variant = 'grid', priority }: MovieCardProps) {
  const { movieId, title, year, poster, imdbRating, inWatchlist } = movie;
  const watchedSet = useWatchedSet();
  const watched = watchedSet ? watchedSet.has(movieId) : movie.watched;
  const cardAction = action === undefined ? <CardWatchlistButton movie={movie} /> : action;
  const label = [title, year, inWatchlist ? 'in your watchlist' : null, watched ? 'watched' : null]
    .filter(Boolean)
    .join(', ');
  const meta = [year, imdbRating != null ? `IMDb ${formatRating(imdbRating)}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className={cn('group/card relative flex flex-col gap-2', variant === 'row' && 'pt-1')}>
      <Link
        to={`/movies/${movieId}`}
        aria-label={label}
        className="flex flex-col gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div className="relative rounded-md transition-transform duration-200 ease-cine group-focus-within/card:-translate-y-1 group-focus-within/card:scale-[1.03] group-hover/card:-translate-y-1 group-hover/card:scale-[1.03] motion-reduce:transform-none">
          <PosterImage src={poster} title={title} priority={priority} />
          {(inWatchlist || watched) && (
            <div className="absolute top-1.5 left-1.5 flex gap-1" aria-hidden>
              {inWatchlist && (
                <span className="flex size-6 items-center justify-center rounded-full bg-overlay text-primary">
                  <Bookmark className="size-3.5 fill-current" />
                </span>
              )}
              {watched && (
                <span className="flex size-6 items-center justify-center rounded-full bg-overlay text-foreground">
                  <Eye className="size-3.5" />
                </span>
              )}
            </div>
          )}
          <div
            aria-hidden
            className="absolute inset-0 flex flex-col justify-end gap-1 rounded-md bg-overlay p-3 opacity-0 transition-opacity duration-150 group-focus-within/card:opacity-100 group-hover/card:opacity-100"
          >
            <p className="line-clamp-3 text-sm font-semibold">{title}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground tabular">
              {year}
              {imdbRating != null && (
                <>
                  {year != null && <span>·</span>}
                  <Star className="size-3 fill-primary text-primary" />
                  {formatRating(imdbRating)}
                </>
              )}
            </p>
          </div>
        </div>
        <div aria-hidden className="flex flex-col gap-0.5">
          <p className="line-clamp-2 text-sm leading-5 font-medium">{title}</p>
          {meta && <p className="text-xs text-subtle-foreground tabular">{meta}</p>}
        </div>
      </Link>
      {caption}
      {cardAction && (
        <div className={cn('absolute right-1.5', variant === 'row' ? 'top-2.5' : 'top-1.5')}>
          {cardAction}
        </div>
      )}
    </div>
  );
}
