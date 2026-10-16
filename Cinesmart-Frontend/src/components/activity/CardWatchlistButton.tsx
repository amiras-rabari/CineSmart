import type { MovieCard } from '@/api/types';
import { cn } from '@/lib/utils';
import { WatchlistButton } from './WatchlistButton';

interface CardWatchlistButtonProps {
  movie: MovieCard;
  className?: string;
}

/**
 * Watchlist icon button over a card's poster ([COMP-3]); same mutation as `WatchlistButton`.
 * It sits outside the card link, so clicking it never navigates. Shown on hover/focus, always
 * when the movie is in the watchlist or on touch screens.
 */
export function CardWatchlistButton({ movie, className }: CardWatchlistButtonProps) {
  const active = movie.inWatchlist === true;
  return (
    <WatchlistButton
      movieId={movie.movieId}
      active={active}
      compact
      title={movie.title}
      className={cn(
        !active &&
          'opacity-0 transition-opacity group-focus-within/card:opacity-100 group-hover/card:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100',
        className,
      )}
    />
  );
}
