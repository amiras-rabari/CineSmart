package ca.cinesmart.activity.domain;

import ca.cinesmart.shared.movie.MovieCard;
import com.fasterxml.jackson.annotation.JsonUnwrapped;

import java.time.Instant;

/** A /me/watchlist entry: the card fields, flattened, plus addedAt (change.md Q15). */
public record WatchlistItem(@JsonUnwrapped MovieCard card, Instant addedAt) {
}
