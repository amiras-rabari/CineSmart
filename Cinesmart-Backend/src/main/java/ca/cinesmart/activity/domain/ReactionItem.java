package ca.cinesmart.activity.domain;

import java.time.Instant;

/** LIKE or DISLIKE only; NEUTRAL is the default state and isn't listed (change.md Q14, Q15). */
public record ReactionItem(Long movieId, String reaction, Instant reactedAt) {
}
