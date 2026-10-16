import { ThumbsDown, ThumbsUp } from 'lucide-react';
import type { Reaction, UserMovieState } from '@/api/types';
import { Button } from '@/components/ui/button';
import { useMovieAction } from '@/features/movie/use-movie-actions';
import { cn } from '@/lib/utils';
import { PENDING_CLASS, pendingProps } from './pending-props';

interface ReactionButtonsProps {
  movieId: number;
  reaction: Reaction;
  /** After a successful change (the details page shows the lag hint once). */
  onChanged?: (state: UserMovieState) => void;
}

/**
 * Two exclusive thumbs ([COMP-3], [ARCH-5]): Like → PUT LIKE, Dislike → PUT DISLIKE (switches
 * directly), the pressed one again → DELETE. Both share one pending state.
 */
export function ReactionButtons({ movieId, reaction, onChanged }: ReactionButtonsProps) {
  const { run, pending } = useMovieAction(movieId, 'reaction');

  function toggle(value: 'LIKE' | 'DISLIKE') {
    run({ kind: 'reaction', value: reaction === value ? null : value }, { onSuccess: onChanged });
  }

  return (
    <div role="group" aria-label="Your reaction" className="flex gap-1">
      <Button
        type="button"
        variant="secondary"
        size="icon"
        aria-label="Like"
        aria-pressed={reaction === 'LIKE'}
        {...pendingProps(pending)}
        onClick={() => toggle('LIKE')}
        className={cn(
          PENDING_CLASS,
          reaction === 'LIKE' && 'bg-like/15 text-like hover:bg-like/25',
        )}
      >
        <ThumbsUp className={cn(reaction === 'LIKE' && 'fill-current')} aria-hidden />
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        aria-label="Dislike"
        aria-pressed={reaction === 'DISLIKE'}
        {...pendingProps(pending)}
        onClick={() => toggle('DISLIKE')}
        className={cn(
          PENDING_CLASS,
          reaction === 'DISLIKE' && 'bg-dislike/15 text-dislike hover:bg-dislike/25',
        )}
      >
        <ThumbsDown className={cn(reaction === 'DISLIKE' && 'fill-current')} aria-hidden />
      </Button>
    </div>
  );
}
