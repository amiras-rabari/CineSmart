package ca.cinesmart.activity.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Set;

/** Everything Recommendation needs from a user's activity, with timestamps for the recency boost (change.md Q22). */
public record ActivitySignals(
        List<Entry> watchlist,
        List<Entry> watched,
        List<Rated> ratings,
        List<Entry> likes,
        Set<Long> dislikedIds
) {
    public record Entry(Long movieId, Instant at) {
    }

    public record Rated(Long movieId, BigDecimal rating, Instant at) {
    }
}
