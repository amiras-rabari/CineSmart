package ca.cinesmart.shared;

import ca.cinesmart.shared.api.ApiException;
import ca.cinesmart.shared.api.ErrorCode;
import ca.cinesmart.shared.redis.RedisFailClosed;
import ca.cinesmart.shared.security.ClientIpResolver;
import ca.cinesmart.shared.util.RandomToken;
import ca.cinesmart.shared.util.TokenHasher;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SharedUtilitiesTest {

    @Test
    void sha256MatchesTheKnownVector() {
        assertThat(TokenHasher.sha256("abc"))
                .isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }

    @Test
    void randomTokensAreUrlSafe256BitAndUnique() {
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < 200; i++) {
            String token = RandomToken.generate();
            assertThat(token).hasSize(43).matches("[A-Za-z0-9_-]+");
            assertThat(seen.add(token)).isTrue();
        }
    }

    @Test
    void forwardedForIsIgnoredUnlessTheProxyIsTrusted() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.1");
        request.addHeader("X-Forwarded-For", "203.0.113.7, 10.0.0.1");

        assertThat(new ClientIpResolver(false).resolve(request)).isEqualTo("10.0.0.1");
        assertThat(new ClientIpResolver(true).resolve(request)).isEqualTo("203.0.113.7");
    }

    @Test
    void trustedProxyWithoutHeaderFallsBackToRemoteAddress() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.2");
        assertThat(new ClientIpResolver(true).resolve(request)).isEqualTo("10.0.0.2");
    }

    @Test
    void redisFailuresBecome503() {
        assertThatThrownBy(() -> RedisFailClosed.call("down", () -> {
            throw new RedisConnectionFailureException("no redis");
        })).isInstanceOfSatisfying(ApiException.class, ex -> {
            assertThat(ex.code()).isEqualTo(ErrorCode.SERVICE_UNAVAILABLE);
            assertThat(ex.getMessage()).isEqualTo("down");
        });
        assertThat(RedisFailClosed.call(() -> "value")).isEqualTo("value");
    }

    @Test
    void nonRedisExceptionsPassThroughUnchanged() {
        assertThatThrownBy(() -> RedisFailClosed.run(() -> {
            throw new IllegalStateException("bug");
        })).isInstanceOf(IllegalStateException.class);
        // Documented caveat: any DataAccessException (also JDBC ones) becomes 503.
        assertThatThrownBy(() -> RedisFailClosed.run(() -> {
            throw new DataIntegrityViolationException("jdbc");
        })).isInstanceOf(ApiException.class);
    }
}
