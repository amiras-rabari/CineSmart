import { Bookmark, BookmarkCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMovieAction } from '@/features/movie/use-movie-actions';
import { cn } from '@/lib/utils';
import { PENDING_CLASS, pendingProps } from './pending-props';

interface WatchlistButtonProps {
  movieId: number;
  active: boolean;
  /** Icon only, with an `aria-label` (cards, watchlist page). */
  compact?: boolean;
  /** Used in the accessible name of the compact button, e.g. "Remove Interstellar from watchlist". */
  title?: string;
  className?: string;
}

/** Add/remove from the watchlist ([COMP-3]); disabled + `aria-busy` while in flight. */
export function WatchlistButton({
  movieId,
  active,
  compact,
  title,
  className,
}: WatchlistButtonProps) {
  const { run, pending } = useMovieAction(movieId, 'watchlist');
  const label = active ? 'Remove from watchlist' : 'Add to watchlist';
  const Icon = active ? BookmarkCheck : Bookmark;
  const onClick = () => run({ kind: 'watchlist', on: !active });

  if (compact) {
    return (
      <Button
        type="button"
        size="icon-sm"
        variant="secondary"
        aria-pressed={active}
        {...pendingProps(pending)}
        aria-label={title ? `${label}: ${title}` : label}
        onClick={onClick}
        className={cn(
          'rounded-full bg-overlay shadow-pop backdrop-blur-sm hover:bg-surface-3',
          PENDING_CLASS,
          active && 'text-primary',
          className,
        )}
      >
        <Icon className={cn(active && 'fill-current')} aria-hidden />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={active ? 'default' : 'secondary'}
      aria-pressed={active}
      {...pendingProps(pending)}
      onClick={onClick}
      className={cn(PENDING_CLASS, className)}
    >
      <Icon aria-hidden />
      {label}
    </Button>
  );
}
