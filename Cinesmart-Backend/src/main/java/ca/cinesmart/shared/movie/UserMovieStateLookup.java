package ca.cinesmart.shared.movie;

import java.util.Collection;
import java.util.Set;

/**
 * Read-only view of a user's movie state. Implemented by Activity, used by Catalog,
 * so Catalog doesn't depend on Activity (change.md Q26 clarification).
 */
public interface UserMovieStateLookup {

    UserMovieState getState(Long userId, Long movieId);

    /** The subset of movieIds that are in the user's watchlist. */
    Set<Long> inWatchlist(Long userId, Collection<Long> movieIds);

    /** The subset of movieIds the user marked as watched. */
    Set<Long> watched(Long userId, Collection<Long> movieIds);
}
