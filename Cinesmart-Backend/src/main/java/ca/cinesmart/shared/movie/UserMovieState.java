package ca.cinesmart.shared.movie;

import java.math.BigDecimal;

/** A logged-in user's state for one movie. reaction is "NEUTRAL" when the user has no row (change.md Q14). */
public record UserMovieState(
        boolean inWatchlist,
        boolean watched,
        BigDecimal rating,
        String reaction
) {
}
