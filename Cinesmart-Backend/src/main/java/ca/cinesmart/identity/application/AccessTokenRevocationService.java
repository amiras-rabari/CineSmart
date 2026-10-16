package ca.cinesmart.identity.application;

import ca.cinesmart.shared.redis.RedisFailClosed;
import ca.cinesmart.shared.util.TokenHasher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;

/**
 * Access-token revocation (change.md Q6):
 * <ul>
 *   <li>jwt:blacklist:&lt;sha256(token)&gt; for a logged-out token</li>
 *   <li>user:tokens-valid-after:&lt;userId&gt; = epoch seconds; tokens issued before it are rejected</li>
 * </ul>
 * Checks fail open (15-minute tokens limit the exposure, Q24).
 */
@Service
public class AccessTokenRevocationService {

    private static final Logger log = LoggerFactory.getLogger(AccessTokenRevocationService.class);

    private static final String BLACKLIST_PREFIX = "jwt:blacklist:";
    private static final String VALID_AFTER_PREFIX = "user:tokens-valid-after:";

    private final StringRedisTemplate redis;
    private final Duration accessTokenTtl;

    public AccessTokenRevocationService(StringRedisTemplate redis,
                                        @Value("${jwt.access-token-ttl}") Duration accessTokenTtl) {
        this.redis = redis;
        this.accessTokenTtl = accessTokenTtl;
    }

    /** Logout: the token is refused until it would have expired anyway. Fails open. */
    public void blacklist(String token, Instant expiresAt) {
        long seconds = Math.max(1, Math.min(accessTokenTtl.toSeconds(), Duration.between(Instant.now(), expiresAt).toSeconds()));
        try {
            redis.opsForValue().set(BLACKLIST_PREFIX + TokenHasher.sha256(token), "1", Duration.ofSeconds(seconds));
        } catch (DataAccessException ex) {
            log.warn("Access token not blacklisted, Redis unavailable: {}", ex.getMessage());
        }
    }

    /** Every access token of this user issued before now stops working. Fails closed. */
    public void invalidateIssuedBefore(Long userId, Instant now) {
        // After one access-token lifetime every older token has expired anyway.
        RedisFailClosed.run(() -> redis.opsForValue().set(VALID_AFTER_PREFIX + userId,
                String.valueOf(now.getEpochSecond()), accessTokenTtl.plusMinutes(1)));
    }

    /** Used by the JWT decoder on every request. Fails open. */
    public boolean isRevoked(Jwt jwt) {
        try {
            if (Boolean.TRUE.equals(redis.hasKey(BLACKLIST_PREFIX + TokenHasher.sha256(jwt.getTokenValue())))) {
                return true;
            }
            Object userId = jwt.getClaim("userId");
            Instant issuedAt = jwt.getIssuedAt();
            if (userId == null || issuedAt == null) {
                return false;
            }
            String validAfter = redis.opsForValue().get(VALID_AFTER_PREFIX + userId);
            return validAfter != null && issuedAt.getEpochSecond() < Long.parseLong(validAfter);
        } catch (DataAccessException ex) {
            log.warn("Access token revocation check skipped, Redis unavailable: {}", ex.getMessage());
            return false;
        }
    }
}
