package ca.cinesmart.catalog.domain;

import java.math.BigDecimal;

/** External ratings stored on the movie row. */
public record Ratings(
        BigDecimal imdb,
        Long imdbVotes,
        Short rottenTomatoes,
        Short metascore
) {
}
