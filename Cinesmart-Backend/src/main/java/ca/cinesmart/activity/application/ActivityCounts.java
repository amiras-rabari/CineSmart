package ca.cinesmart.activity.application;

/** A user's list sizes, shown on the /me profile (change.md Q8). */
public record ActivityCounts(long watchlistCount, long watchedCount, long ratingCount) {
}
