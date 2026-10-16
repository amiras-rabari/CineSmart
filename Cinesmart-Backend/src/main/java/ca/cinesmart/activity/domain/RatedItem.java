package ca.cinesmart.activity.domain;

import ca.cinesmart.shared.movie.MovieCard;
import com.fasterxml.jackson.annotation.JsonUnwrapped;

import java.math.BigDecimal;
import java.time.Instant;

/** A /me/ratings entry: the card fields, flattened, plus the user's rating (change.md Q15). */
public record RatedItem(@JsonUnwrapped MovieCard card, BigDecimal rating, Instant ratedAt) {
}
