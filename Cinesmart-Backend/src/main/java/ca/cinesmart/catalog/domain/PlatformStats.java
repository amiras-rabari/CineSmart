package ca.cinesmart.catalog.domain;

import java.math.BigDecimal;

/** From movie_analytics; zeros / null average when the batch hasn't produced a row yet. */
public record PlatformStats(
        BigDecimal averageRating,
        int ratingCount,
        int likeCount,
        int dislikeCount
) {
}
