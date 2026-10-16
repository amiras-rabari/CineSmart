package ca.cinesmart.shared.ratelimit;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.time.Duration;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** RateLimit parsing, RateLimitProperties validation and the IP-limit route groups (change.md Q5, Q16). */
class RateLimitTest {

    @Test
    void parsesMaxAndIsoWindow() {
        assertThat(RateLimit.parse("10/PT1M")).isEqualTo(new RateLimit(10, Duration.ofMinutes(1)));
        assertThat(RateLimit.parse(" 5 / PT15M ")).isEqualTo(new RateLimit(5, Duration.ofMinutes(15)));
    }

    @Test
    void rejectsMalformedSpecs() {
        assertThatThrownBy(() -> RateLimit.parse("10")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> RateLimit.parse("ten/PT1M")).isInstanceOf(NumberFormatException.class);
        assertThatThrownBy(() -> RateLimit.parse("10/1 minute")).isInstanceOf(RuntimeException.class);
    }

    @Test
    void propertiesFailFastOnATypo() {
        assertThatThrownBy(() -> new RateLimitProperties(Map.of("login", "10/1M"), Map.of()))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void missingGroupIsAClearError() {
        RateLimitProperties props = new RateLimitProperties(Map.of("login", "10/PT1M"), null);
        assertThat(props.ipLimit("login").max()).isEqualTo(10);
        assertThatThrownBy(() -> props.userLimit("write"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("rate-limit.user.write");
    }

    @Test
    void routesAreGroupedAsDocumented() {
        assertThat(group("POST", "/api/v1/auth/login")).isEqualTo("login");
        for (String path : new String[]{"/signup", "/password/forgot", "/email/resend", "/email/change",
                "/password/change"}) {
            assertThat(group("POST", "/api/v1/auth" + path)).as(path).isEqualTo("account");
        }
        for (String path : new String[]{"/email/verify", "/password/reset", "/email/change/confirm"}) {
            assertThat(group("POST", "/api/v1/auth" + path)).as(path).isEqualTo("token");
        }
        assertThat(group("POST", "/api/v1/auth/refresh")).isEqualTo("public");
        assertThat(group("GET", "/api/v1/movies")).isEqualTo("public");
        assertThat(group("GET", "/api/v1/movies/1/similar")).isEqualTo("public");
        assertThat(group("GET", "/api/v1/home")).isEqualTo("public");
        assertThat(group("GET", "/api/v1/genres")).isEqualTo("public");
        assertThat(group("GET", "/api/v1/languages")).isEqualTo("public");
    }

    @Test
    void otherRoutesHaveNoIpLimit() {
        assertThat(group("POST", "/api/v1/auth/logout")).isNull();
        assertThat(group("GET", "/api/v1/me")).isNull();
        assertThat(group("PUT", "/api/v1/movies/1/watchlist")).isNull();
        assertThat(group("GET", "/api/v1/recommendations")).isNull();
        assertThat(group("GET", "/api/v1/moviesX")).isNull();
    }

    private static String group(String method, String path) {
        return IpRateLimitFilter.group(new MockHttpServletRequest(method, path));
    }
}
