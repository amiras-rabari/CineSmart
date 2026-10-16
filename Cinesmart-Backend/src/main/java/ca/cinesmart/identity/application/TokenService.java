package ca.cinesmart.identity.application;

import ca.cinesmart.identity.domain.IssuedSession;
import ca.cinesmart.shared.api.ApiException;
import ca.cinesmart.shared.api.ErrorCode;
import ca.cinesmart.shared.redis.RedisFailClosed;
import ca.cinesmart.shared.util.RandomToken;
import ca.cinesmart.shared.util.TokenHasher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Access JWT + rotating refresh tokens (change.md Q6).
 * <ul>
 *   <li>refresh:&lt;sha&gt; = "userId|sessionStartEpochSeconds", sliding idle TTL (2 h), capped at sessionStart + 7 days</li>
 *   <li>refresh:used:&lt;sha&gt; = userId, so a replayed (already rotated) token is detected as theft</li>
 *   <li>user:sessions:&lt;userId&gt; = set of that user's live refresh hashes, for "log out everywhere"</li>
 * </ul>
 * Refresh-token operations fail closed (Q24), except logout, which only cleans up.
 */
@Service
public class TokenService {

    private static final Logger log = LoggerFactory.getLogger(TokenService.class);

    private static final String REFRESH_PREFIX = "refresh:";
    private static final String USED_PREFIX = "refresh:used:";
    private static final String SESSIONS_PREFIX = "user:sessions:";
    private static final String SESSION_EXPIRED = "Session expired. Please sign in again.";

    private final JwtEncoder jwtEncoder;
    private final StringRedisTemplate redis;
    private final AccessTokenRevocationService revocation;
    private final String issuer;
    private final Duration accessTokenTtl;
    private final Duration idleTtl;
    private final Duration maxSession;

    public TokenService(JwtEncoder jwtEncoder,
                        StringRedisTemplate redis,
                        AccessTokenRevocationService revocation,
                        @Value("${jwt.issuer}") String issuer,
                        @Value("${jwt.access-token-ttl}") Duration accessTokenTtl,
                        @Value("${auth.refresh.idle-ttl}") Duration idleTtl,
                        @Value("${auth.refresh.max-session}") Duration maxSession) {
        this.jwtEncoder = jwtEncoder;
        this.redis = redis;
        this.revocation = revocation;
        this.issuer = issuer;
        this.accessTokenTtl = accessTokenTtl;
        this.idleTtl = idleTtl;
        this.maxSession = maxSession;
    }

    /** The user and session start a refresh token belonged to. */
    public record RefreshGrant(Long userId, Instant sessionStart) {
    }

    /** New access token + new refresh token. sessionStart is kept across refreshes for the 7-day cap. */
    public IssuedSession issue(Long userId, String username, Instant sessionStart) {
        Instant now = Instant.now();
        Duration refreshTtl = Duration.between(now, sessionStart.plus(maxSession));
        if (refreshTtl.compareTo(idleTtl) > 0) {
            refreshTtl = idleTtl;
        }
        if (refreshTtl.toSeconds() < 1) {
            throw new ApiException(ErrorCode.UNAUTHORIZED, SESSION_EXPIRED);
        }

        String refreshToken = RandomToken.generate();
        String hash = TokenHasher.sha256(refreshToken);
        Duration ttl = refreshTtl;
        RedisFailClosed.run(() -> {
            redis.opsForValue().set(REFRESH_PREFIX + hash, userId + "|" + sessionStart.getEpochSecond(), ttl);
            redis.opsForSet().add(SESSIONS_PREFIX + userId, hash);
            redis.expire(SESSIONS_PREFIX + userId, maxSession);
        });

        return new IssuedSession(accessToken(userId, username, now), accessTokenTtl.toSeconds(),
                refreshToken, refreshTtl, userId, username);
    }

    /**
     * Single use: the token is deleted and remembered as used. Presenting a used token again
     * revokes every session of that user (theft detection). Unknown or expired → 401.
     */
    public RefreshGrant consumeRefreshToken(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new ApiException(ErrorCode.UNAUTHORIZED, SESSION_EXPIRED);
        }
        String hash = TokenHasher.sha256(refreshToken);
        String value = RedisFailClosed.call(() -> redis.opsForValue().getAndDelete(REFRESH_PREFIX + hash));

        if (value == null) {
            String reusedBy = RedisFailClosed.call(() -> redis.opsForValue().get(USED_PREFIX + hash));
            if (reusedBy != null) {
                log.warn("Reused refresh token for user {}: revoking all sessions", reusedBy);
                revokeAll(Long.parseLong(reusedBy));
            }
            throw new ApiException(ErrorCode.UNAUTHORIZED, SESSION_EXPIRED);
        }

        String[] parts = value.split("\\|");
        Long userId = Long.parseLong(parts[0]);
        RedisFailClosed.run(() -> {
            redis.opsForValue().set(USED_PREFIX + hash, userId.toString(), idleTtl);
            redis.opsForSet().remove(SESSIONS_PREFIX + userId, hash);
        });
        return new RefreshGrant(userId, Instant.ofEpochSecond(Long.parseLong(parts[1])));
    }

    /** Logout of one session. Fails open: the refresh token still expires on its own. */
    public void revokeSession(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }
        String hash = TokenHasher.sha256(refreshToken);
        try {
            String value = redis.opsForValue().getAndDelete(REFRESH_PREFIX + hash);
            if (value != null) {
                redis.opsForSet().remove(SESSIONS_PREFIX + value.split("\\|")[0], hash);
            }
        } catch (DataAccessException ex) {
            log.warn("Refresh token not revoked on logout, Redis unavailable: {}", ex.getMessage());
        }
    }

    /** Logs the user out everywhere: every refresh token and every access token issued until now. */
    public void revokeAll(Long userId) {
        RedisFailClosed.run(() -> {
            Set<String> hashes = redis.opsForSet().members(SESSIONS_PREFIX + userId);
            List<String> keys = new ArrayList<>();
            keys.add(SESSIONS_PREFIX + userId);
            if (hashes != null) {
                hashes.forEach(h -> keys.add(REFRESH_PREFIX + h));
            }
            redis.delete(keys);
        });
        revocation.invalidateIssuedBefore(userId, Instant.now());
    }

    private String accessToken(Long userId, String username, Instant now) {
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .issuedAt(now)
                .expiresAt(now.plus(accessTokenTtl))
                .subject(username)
                .claim("userId", userId)
                .build();
        return jwtEncoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }
}
