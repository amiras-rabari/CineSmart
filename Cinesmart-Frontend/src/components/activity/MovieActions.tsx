import type { UserMovieState } from '@/api/types';
import { RatingControl } from './RatingControl';
import { ReactionButtons } from './ReactionButtons';
import { WatchedButton } from './WatchedButton';
import { WatchlistButton } from './WatchlistButton';

interface MovieActionsProps {
  movieId: number;
  /** Live from `[v,'movie',id]`; `null` when anonymous (every control prompts to sign in). */
  userState: UserMovieState | null;
  /** After a rating or reaction change (platform stats lag up to 1 h). */
  onStatsAffected?: () => void;
}

/** The four activity controls in a row that wraps on mobile ([COMP-3]). */
export function MovieActions({ movieId, userState, onStatsAffected }: MovieActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <WatchlistButton movieId={movieId} active={userState?.inWatchlist ?? false} />
      <WatchedButton movieId={movieId} active={userState?.watched ?? false} />
      <RatingControl
        movieId={movieId}
        rating={userState?.rating ?? null}
        onChanged={onStatsAffected}
      />
      <ReactionButtons
        movieId={movieId}
        reaction={userState?.reaction ?? 'NEUTRAL'}
        onChanged={onStatsAffected}
      />
    </div>
  );
}
