package ca.cinesmart.discovery.domain;

import ca.cinesmart.shared.movie.MovieCard;

import java.util.List;

/**
 * One home row (change.md Q21). totalResults is the size of the full list behind {@code endpoint}
 * (not deduped); results are deduped against earlier rows.
 */
public record HomeSection(
        String key,
        String title,
        String endpoint,
        long totalResults,
        List<MovieCard> results
) {
}
