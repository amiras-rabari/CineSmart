package ca.cinesmart.activity.domain;

import java.time.Instant;

public record WatchedItem(Long movieId, Instant watchedAt) {
}
