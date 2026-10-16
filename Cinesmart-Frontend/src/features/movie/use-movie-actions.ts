// Activity actions: plan [ARCH-5] (optimistic flow, in-flight rule, anonymous prompt),
// [ARCH-4] (update steps after an action) and [ARCH-3] (error toasts). Contract [ACT-1] … [ACT-9].
import {
  useIsMutating,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';
import {
  addToWatchlist,
  markWatched,
  rateMovie,
  removeFromWatchlist,
  removeRating,
  removeReaction,
  setReaction,
  unmarkWatched,
} from '@/api/activity';
import type { MovieDetails } from '@/api/catalog';
import { hasErrorCode } from '@/api/errors';
import type { UserMovieState } from '@/api/types';
import { notify } from '@/components/feedback/notify';
import {
  patchCardFlags,
  restoreCards,
  type CardFlags,
  type CardSnapshot,
} from '@/query/card-cache';
import { keys, type Viewer } from '@/query/keys';
import { setWatched } from '@/query/watched-set';
import { loginPath } from '@/session/redirect';
import { useSession } from '@/session/session-store';

export type MovieAction =
  | { kind: 'watchlist'; on: boolean }
  | { kind: 'watched'; on: boolean }
  /** `null` removes the rating. */
  | { kind: 'rating'; value: number | null }
  /** `null` removes the reaction (reads NEUTRAL); NEUTRAL is never sent. */
  | { kind: 'reaction'; value: 'LIKE' | 'DISLIKE' | null };

export type ActionKind = MovieAction['kind'];
type ActionOf<K extends ActionKind> = Extract<MovieAction, { kind: K }>;

export const SIGN_IN_PROMPT = 'Sign in to use your watchlist and ratings.';

export function sendAction(movieId: number, action: MovieAction): Promise<UserMovieState> {
  switch (action.kind) {
    case 'watchlist':
      return action.on ? addToWatchlist(movieId) : removeFromWatchlist(movieId);
    case 'watched':
      return action.on ? markWatched(movieId) : unmarkWatched(movieId);
    case 'rating':
      return action.value === null ? removeRating(movieId) : rateMovie(movieId, action.value);
    case 'reaction':
      return action.value === null ? removeReaction(movieId) : setReaction(movieId, action.value);
  }
}

/** The state the server is expected to answer with (shown while the request runs). */
export function expectedState(state: UserMovieState, action: MovieAction): UserMovieState {
  switch (action.kind) {
    case 'watchlist':
      return { ...state, inWatchlist: action.on };
    case 'watched':
      return { ...state, watched: action.on };
    case 'rating':
      return {
        ...state,
        rating: action.value === null ? null : Math.round(action.value * 10) / 10,
      };
    case 'reaction':
      return { ...state, reaction: action.value ?? 'NEUTRAL' };
  }
}

function cardFlagsOf(action: MovieAction): CardFlags | null {
  if (action.kind === 'watchlist') return { inWatchlist: action.on };
  if (action.kind === 'watched') return { watched: action.on };
  return null;
}

/**
 * [ARCH-4] steps after a successful action: the server state is the source of truth.
 * Home is not invalidated: its cards were patched in place, so going back shows the new flags
 * without a refetch (P4 acceptance check).
 */
export function applyUserState(
  queryClient: QueryClient,
  v: Viewer,
  movieId: number,
  state: UserMovieState,
  kind: ActionKind,
): void {
  queryClient.setQueryData<MovieDetails>(keys.movie(v, movieId), (movie) =>
    movie ? { ...movie, userState: state } : movie,
  );
  patchCardFlags(queryClient, v, movieId, {
    inWatchlist: state.inWatchlist,
    watched: state.watched,
  });
  setWatched(queryClient, v, movieId, state.watched);

  const invalidate = (queryKey: readonly unknown[]) =>
    void queryClient.invalidateQueries({ queryKey });
  invalidate(keys.me.profile(v));
  if (kind === 'watchlist') invalidate(keys.me.watchlistAll(v));
  if (kind === 'rating') invalidate(keys.me.ratingsAll(v));
  if (kind === 'reaction') invalidate(keys.me.reactions(v));
  invalidate(keys.recsAll(v));
}

interface Snapshot {
  movie: MovieDetails | undefined;
  cards: CardSnapshot;
  watched: Set<number> | undefined;
}

/** Mutations in flight per movie and action, so a double click never sends twice ([ARCH-5]). */
const inFlight = new Set<string>();

/** Sends an anonymous user to sign in and back here ([ARCH-5]). */
export function useSignInPrompt() {
  const navigate = useNavigate();
  const location = useLocation();
  return () => {
    notify.info(SIGN_IN_PROMPT);
    void navigate(loginPath(location.pathname + location.search));
  };
}

/**
 * One action (watchlist, watched, rating or reaction) on one movie. `pending` is shared by every
 * control of that movie and action (details buttons and card buttons alike).
 */
export function useMovieAction<K extends ActionKind>(movieId: number, kind: K) {
  const queryClient = useQueryClient();
  const { status, user } = useSession();
  const v: Viewer = user?.userId ?? 'anon';
  const promptSignIn = useSignInPrompt();
  const mutationKey = ['activity', movieId, kind];
  const flightKey = `${movieId}:${kind}`;
  const pending = useIsMutating({ mutationKey }) > 0;

  const mutation = useMutation<UserMovieState, unknown, ActionOf<K>, Snapshot>({
    mutationKey,
    mutationFn: (action) => sendAction(movieId, action),
    onMutate: async (typedAction) => {
      const action: MovieAction = typedAction;
      const movieKey = keys.movie(v, movieId);
      await queryClient.cancelQueries({ queryKey: movieKey });
      const movie = queryClient.getQueryData<MovieDetails>(movieKey);
      const watched = queryClient.getQueryData<Set<number>>(keys.me.watched(v));
      if (movie?.userState) {
        queryClient.setQueryData<MovieDetails>(movieKey, {
          ...movie,
          userState: expectedState(movie.userState, action),
        });
      }
      const flags = cardFlagsOf(action);
      const cards = flags ? patchCardFlags(queryClient, v, movieId, flags) : [];
      if (action.kind === 'watched') setWatched(queryClient, v, movieId, action.on);
      return { movie, cards, watched };
    },
    onError: (error, _action, snapshot) => {
      if (snapshot) {
        if (snapshot.movie) queryClient.setQueryData(keys.movie(v, movieId), snapshot.movie);
        restoreCards(queryClient, snapshot.cards);
        if (snapshot.watched) queryClient.setQueryData(keys.me.watched(v), snapshot.watched);
      }
      // An ended session already showed "Your session has expired" ([ARCH-2]).
      if (!hasErrorCode(error, 'UNAUTHORIZED')) notify.error(error);
    },
    onSuccess: (state) => applyUserState(queryClient, v, movieId, state, kind),
    onSettled: () => {
      inFlight.delete(flightKey);
    },
  });

  return {
    pending,
    signedIn: status === 'authenticated',
    promptSignIn,
    /** Runs the action; anonymous → sign-in prompt; ignored while one is in flight. */
    run(action: ActionOf<K>, options?: { onSuccess?: (state: UserMovieState) => void }) {
      if (status !== 'authenticated') {
        promptSignIn();
        return;
      }
      if (inFlight.has(flightKey)) return;
      inFlight.add(flightKey);
      mutation.mutate(action, { onSuccess: options?.onSuccess });
    },
  };
}
