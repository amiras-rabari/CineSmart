package ca.cinesmart.identity.api.dto;

import java.time.OffsetDateTime;

/** GET /me (change.md Q8). */
public record ProfileResponse(
        Long userId,
        String username,
        String email,
        OffsetDateTime createdAt,
        long watchlistCount,
        long watchedCount,
        long ratingCount) {
}
