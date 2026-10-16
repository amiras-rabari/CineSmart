package ca.cinesmart.recommendation.application;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** recommendation.* settings (change.md Q22: every weight and limit is a setting). */
@ConfigurationProperties("recommendation")
public record RecommendationProperties(
        Weight weight,
        int recentDays,
        double recentMultiplier,
        int candidateLimit,
        int coldStartMinSignals,
        Score score
) {
    /** Signal weights: rating ≥ 8, rating 7–7.9, like, watched, watchlist. */
    public record Weight(double ratingHigh, double ratingMid, double like, double watched, double watchlist) {
    }

    /** Score component weights; also used by similar titles. */
    public record Score(double genre, double people, double language, double imdb) {
    }
}
