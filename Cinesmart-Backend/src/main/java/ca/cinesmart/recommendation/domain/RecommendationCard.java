package ca.cinesmart.recommendation.domain;

import ca.cinesmart.shared.movie.MovieCard;
import com.fasterxml.jackson.annotation.JsonUnwrapped;

/** A /recommendations item: the card fields, flattened, plus why it was picked (change.md Q22). */
public record RecommendationCard(@JsonUnwrapped MovieCard card, String reason) {
}
