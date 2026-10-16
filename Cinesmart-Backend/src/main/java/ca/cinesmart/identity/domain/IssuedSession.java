package ca.cinesmart.identity.domain;

import java.time.Duration;

/** A new access token plus the refresh token that goes into the HttpOnly cookie (change.md Q6). */
public record IssuedSession(
        String accessToken,
        long expiresInSeconds,
        String refreshToken,
        Duration refreshTtl,
        Long userId,
        String username
) {
}
