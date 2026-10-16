package ca.cinesmart.shared.movie;

import java.math.BigDecimal;

/**
 * The one card used by every list, search result and home row (change.md Q18).
 * inWatchlist / watched are null for anonymous users.
 */
public record MovieCard(
        Long movieId,
        String title,
        Short year,
        String poster,
        BigDecimal imdbRating,
        BigDecimal averageRating,
        int likeCount,
        int dislikeCount,
        Boolean inWatchlist,
        Boolean watched
) {
}
