package ca.cinesmart.identity.application;

import ca.cinesmart.shared.api.ApiException;
import ca.cinesmart.shared.api.ErrorCode;
import ca.cinesmart.shared.util.TokenHasher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Logout blacklist and "tokens valid after" (change.md Q6); checks fail open, revoke-all fails closed (Q24). */
class AccessTokenRevocationServiceTest {

    private StringRedisTemplate redis;
    private ValueOperations<String, String> values;
    private AccessTokenRevocationService revocation;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        redis = mock(StringRedisTemplate.class);
        values = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(values);
        revocation = new AccessTokenRevocationService(redis, Duration.ofMinutes(15));
    }

    @Test
    void blacklistedTokenIsRevoked() {
        when(redis.hasKey("jwt:blacklist:" + TokenHasher.sha256("tok"))).thenReturn(true);
        assertThat(revocation.isRevoked(jwt("tok", 7L, Instant.now()))).isTrue();
    }

    @Test
    void tokenIssuedBeforeValidAfterIsRevoked() {
        Instant issued = Instant.ofEpochSecond(1_000);
        when(values.get("user:tokens-valid-after:7")).thenReturn("1001");
        assertThat(revocation.isRevoked(jwt("a", 7L, issued))).isTrue();

        when(values.get("user:tokens-valid-after:7")).thenReturn("1000");
        assertThat(revocation.isRevoked(jwt("b", 7L, issued))).as("same second stays valid").isFalse();
    }

    @Test
    void checkFailsOpenWhenRedisIsDown() {
        when(redis.hasKey(anyString())).thenThrow(new RedisConnectionFailureException("down"));
        assertThat(revocation.isRevoked(jwt("tok", 7L, Instant.now()))).isFalse();
    }

    @Test
    void blacklistTtlIsClampedToTheTokenLifetime() {
        revocation.blacklist("long", Instant.now().plus(Duration.ofHours(5)));
        verify(values).set(eq("jwt:blacklist:" + TokenHasher.sha256("long")), eq("1"), eq(Duration.ofMinutes(15)));

        revocation.blacklist("expired", Instant.now().minusSeconds(60));
        verify(values).set(eq("jwt:blacklist:" + TokenHasher.sha256("expired")), eq("1"), eq(Duration.ofSeconds(1)));
    }

    @Test
    void blacklistFailsOpenButRevokeAllFailsClosed() {
        doThrow(new RedisConnectionFailureException("down")).when(values).set(anyString(), anyString(), any(Duration.class));

        assertThatCode(() -> revocation.blacklist("tok", Instant.now().plusSeconds(60))).doesNotThrowAnyException();
        assertThatThrownBy(() -> revocation.invalidateIssuedBefore(7L, Instant.now()))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.SERVICE_UNAVAILABLE));
    }

    private static Jwt jwt(String value, Long userId, Instant issuedAt) {
        return Jwt.withTokenValue(value)
                .header("alg", "HS256")
                .claim("userId", userId)
                .issuedAt(issuedAt)
                .expiresAt(issuedAt.plusSeconds(900))
                .build();
    }
}
