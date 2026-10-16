package ca.cinesmart.identity.application;

import ca.cinesmart.identity.domain.IssuedSession;
import ca.cinesmart.shared.api.ApiException;
import ca.cinesmart.shared.api.ErrorCode;
import ca.cinesmart.shared.util.TokenHasher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.SetOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Access token + refresh token rules (change.md Q6, Q24), with Redis mocked. */
class TokenServiceTest {

    private static final Duration ACCESS_TTL = Duration.ofMinutes(15);
    private static final Duration IDLE_TTL = Duration.ofHours(2);
    private static final Duration MAX_SESSION = Duration.ofDays(7);
    private static final SecretKey KEY =
            new SecretKeySpec("unit-test-secret-unit-test-secret!!".getBytes(StandardCharsets.UTF_8), "HmacSHA256");

    private StringRedisTemplate redis;
    private ValueOperations<String, String> values;
    private SetOperations<String, String> sets;
    private AccessTokenRevocationService revocation;
    private TokenService tokens;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        redis = mock(StringRedisTemplate.class);
        values = mock(ValueOperations.class);
        sets = mock(SetOperations.class);
        when(redis.opsForValue()).thenReturn(values);
        when(redis.opsForSet()).thenReturn(sets);
        revocation = mock(AccessTokenRevocationService.class);
        tokens = new TokenService(NimbusJwtEncoder.withSecretKey(KEY).algorithm(MacAlgorithm.HS256).build(),
                redis, revocation, "cinesmart-api", ACCESS_TTL, IDLE_TTL, MAX_SESSION);
    }

    @Test
    void newSessionGetsA15MinuteJwtAndA2HourRefreshToken() {
        Instant now = Instant.now();
        IssuedSession session = tokens.issue(7L, "alice", now);

        assertThat(session.expiresInSeconds()).isEqualTo(900);
        assertThat(session.refreshTtl()).isEqualTo(IDLE_TTL);
        assertThat(session.refreshToken()).hasSize(43);
        verify(values).set("refresh:" + TokenHasher.sha256(session.refreshToken()),
                "7|" + now.getEpochSecond(), IDLE_TTL);
        verify(sets).add("user:sessions:7", TokenHasher.sha256(session.refreshToken()));

        Jwt jwt = NimbusJwtDecoder.withSecretKey(KEY).macAlgorithm(MacAlgorithm.HS256).build()
                .decode(session.accessToken());
        assertThat(jwt.getSubject()).isEqualTo("alice");
        assertThat((Long) jwt.getClaim("userId")).isEqualTo(7L);
        assertThat(jwt.getClaimAsString("iss")).isEqualTo("cinesmart-api");
        assertThat(Duration.between(jwt.getIssuedAt(), jwt.getExpiresAt())).isEqualTo(ACCESS_TTL);
    }

    /**
     * Logout blacklists the access token by its value (change.md Q6: "only this session"). Two sessions
     * issued in the same second must therefore not get the same token string.
     */
    @Test
    void twoSessionsIssuedTogetherGetDifferentAccessTokens() {
        Instant now = Instant.now();
        IssuedSession phone = tokens.issue(7L, "alice", now);
        IssuedSession laptop = tokens.issue(7L, "alice", now);
        assertThat(laptop.accessToken()).isNotEqualTo(phone.accessToken());
    }

    @Test
    void refreshTtlShrinksNearTheSevenDayCap() {
        Instant start = Instant.now().minus(MAX_SESSION).plus(Duration.ofMinutes(30));
        IssuedSession session = tokens.issue(7L, "alice", start);
        assertThat(session.refreshTtl().toSeconds()).isCloseTo(30 * 60, within(5L));
    }

    @Test
    void sessionOlderThanSevenDaysCannotBeExtended() {
        Instant start = Instant.now().minus(MAX_SESSION).minusSeconds(1);
        assertThatThrownBy(() -> tokens.issue(7L, "alice", start))
                .isInstanceOfSatisfying(ApiException.class, ex -> assertThat(ex.code()).isEqualTo(ErrorCode.UNAUTHORIZED));
        verify(values, never()).set(anyString(), anyString(), any(Duration.class));
    }

    @Test
    void issuingFailsClosedWhenRedisIsDown() {
        doThrow(new RedisConnectionFailureException("down")).when(values).set(anyString(), anyString(), any(Duration.class));
        assertThatThrownBy(() -> tokens.issue(7L, "alice", Instant.now()))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.SERVICE_UNAVAILABLE));
    }

    @Test
    void consumingAValidTokenRotatesIt() {
        String hash = TokenHasher.sha256("tok");
        when(values.getAndDelete("refresh:" + hash)).thenReturn("7|1700000000");

        TokenService.RefreshGrant grant = tokens.consumeRefreshToken("tok");

        assertThat(grant.userId()).isEqualTo(7L);
        assertThat(grant.sessionStart()).isEqualTo(Instant.ofEpochSecond(1700000000));
        verify(values).set("refresh:used:" + hash, "7", IDLE_TTL);
        verify(sets).remove("user:sessions:7", hash);
    }

    @Test
    void missingOrUnknownTokenIs401WithoutSideEffects() {
        assertThatThrownBy(() -> tokens.consumeRefreshToken(null)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> tokens.consumeRefreshToken("  ")).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> tokens.consumeRefreshToken("unknown"))
                .isInstanceOfSatisfying(ApiException.class, ex -> assertThat(ex.code()).isEqualTo(ErrorCode.UNAUTHORIZED));
        verify(revocation, never()).invalidateIssuedBefore(any(), any());
    }

    @Test
    void replayingAUsedTokenLogsTheUserOutEverywhere() {
        String hash = TokenHasher.sha256("stolen");
        when(values.get("refresh:used:" + hash)).thenReturn("7");
        when(sets.members("user:sessions:7")).thenReturn(Set.of("h1", "h2"));

        assertThatThrownBy(() -> tokens.consumeRefreshToken("stolen")).isInstanceOf(ApiException.class);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<java.util.Collection<String>> deleted = ArgumentCaptor.forClass(java.util.Collection.class);
        verify(redis).delete(deleted.capture());
        assertThat(deleted.getValue()).containsExactlyInAnyOrder("user:sessions:7", "refresh:h1", "refresh:h2");
        verify(revocation).invalidateIssuedBefore(eq(7L), any(Instant.class));
    }

    @Test
    void logoutCleanupFailsOpen() {
        when(values.getAndDelete(anyString())).thenThrow(new RedisConnectionFailureException("down"));
        assertThatCode(() -> tokens.revokeSession("tok")).doesNotThrowAnyException();
        assertThatCode(() -> tokens.revokeSession(null)).doesNotThrowAnyException();
    }
}
