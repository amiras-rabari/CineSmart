package ca.cinesmart.identity;

import ca.cinesmart.shared.util.TokenHasher;
import ca.cinesmart.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** POST /auth/refresh and /auth/logout: rotation, theft detection, idle TTL and the 7-day cap (change.md Q6). */
class SessionIntegrationTest extends IntegrationTest {

    @Test
    void refreshRotatesTheRefreshTokenAndIssuesANewAccessToken() throws Exception {
        Session session = loginAs("alice");

        MvcResult result = mvc.perform(post("/api/v1/auth/refresh").cookie(refreshCookie(session.refreshToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.user.username").value("alice"))
                .andReturn();
        Session refreshed = sessionFrom(result);

        assertThat(refreshed.refreshToken()).isNotNull().isNotEqualTo(session.refreshToken());
        mvc.perform(get("/api/v1/me").with(bearer(refreshed))).andExpect(status().isOk());
        mvc.perform(post("/api/v1/auth/refresh").cookie(refreshCookie(refreshed.refreshToken())))
                .andExpect(status().isOk());
    }

    @Test
    void missingOrUnknownRefreshTokenIs401AndClearsTheCookie() throws Exception {
        mvc.perform(post("/api/v1/auth/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(header().string("Set-Cookie", containsString("Max-Age=0")));
        mvc.perform(post("/api/v1/auth/refresh").cookie(refreshCookie("made-up")))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("Set-Cookie", containsString("refresh_token=;")));
    }

    @Test
    void replayingARotatedRefreshTokenRevokesEverySession() throws Exception {
        Session first = loginAs("alice");
        Session second = login("alice", PASSWORD);
        Session rotated = sessionFrom(mvc.perform(post("/api/v1/auth/refresh")
                .cookie(refreshCookie(first.refreshToken()))).andExpect(status().isOk()).andReturn());

        // Someone presents the old (already used) token again.
        mvc.perform(post("/api/v1/auth/refresh").cookie(refreshCookie(first.refreshToken())))
                .andExpect(status().isUnauthorized());

        mvc.perform(post("/api/v1/auth/refresh").cookie(refreshCookie(rotated.refreshToken())))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/refresh").cookie(refreshCookie(second.refreshToken())))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void accessTokensIssuedBeforeARevokeAllStopWorking() throws Exception {
        Session first = loginAs("alice");
        mvc.perform(post("/api/v1/auth/refresh").cookie(refreshCookie(first.refreshToken())))
                .andExpect(status().isOk());
        // tokens-valid-after has one-second resolution; make sure the revoke lands in a later second.
        Thread.sleep(1100);
        mvc.perform(post("/api/v1/auth/refresh").cookie(refreshCookie(first.refreshToken())))
                .andExpect(status().isUnauthorized());

        mvc.perform(get("/api/v1/me").with(bearer(first))).andExpect(status().isUnauthorized());
    }

    @Test
    void refreshTokenHasTheTwoHourIdleTtlInRedis() throws Exception {
        Session session = loginAs("alice");
        Long ttl = redis.getExpire("refresh:" + TokenHasher.sha256(session.refreshToken()));
        assertThat(ttl).isBetween(7200L - 30, 7200L);
    }

    @Test
    void sessionCannotBeRefreshedPastSevenDays() throws Exception {
        long userId = createUser("alice", true);
        String token = "planted-refresh-token";
        long start = Instant.now().minus(Duration.ofDays(7)).minusSeconds(5).getEpochSecond();
        redis.opsForValue().set("refresh:" + TokenHasher.sha256(token), userId + "|" + start, Duration.ofMinutes(5));

        mvc.perform(post("/api/v1/auth/refresh").cookie(refreshCookie(token)))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("Set-Cookie", containsString("Max-Age=0")));
    }

    @Test
    void refreshNearTheCapGetsAShorterCookie() throws Exception {
        long userId = createUser("alice", true);
        String token = "near-cap-token";
        long start = Instant.now().minus(Duration.ofDays(7)).plus(Duration.ofMinutes(30)).getEpochSecond();
        redis.opsForValue().set("refresh:" + TokenHasher.sha256(token), userId + "|" + start, Duration.ofMinutes(5));

        MvcResult result = mvc.perform(post("/api/v1/auth/refresh").cookie(refreshCookie(token)))
                .andExpect(status().isOk()).andReturn();
        String cookie = refreshSetCookie(result);
        long maxAge = Long.parseLong(cookie.replaceAll(".*Max-Age=(\\d+).*", "$1"));
        assertThat(maxAge).isBetween(30 * 60L - 30, 30 * 60L);
    }

    @Test
    void logoutEndsThisSessionOnly() throws Exception {
        Session phone = loginAs("alice");
        // Different seconds, so the two access tokens differ (same-second logins: see TokenServiceTest).
        Thread.sleep(1100);
        Session laptop = login("alice", PASSWORD);

        mvc.perform(post("/api/v1/auth/logout").with(bearer(phone)).cookie(refreshCookie(phone.refreshToken())))
                .andExpect(status().isNoContent())
                .andExpect(header().string("Set-Cookie", containsString("Max-Age=0")));

        mvc.perform(get("/api/v1/me").with(bearer(phone))).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/refresh").cookie(refreshCookie(phone.refreshToken())))
                .andExpect(status().isUnauthorized());

        mvc.perform(get("/api/v1/me").with(bearer(laptop))).andExpect(status().isOk());
        mvc.perform(post("/api/v1/auth/refresh").cookie(refreshCookie(laptop.refreshToken())))
                .andExpect(status().isOk());
    }

    @Test
    void logoutNeedsAnAccessToken() throws Exception {
        mvc.perform(post("/api/v1/auth/logout")).andExpect(status().isUnauthorized());
    }

    @Test
    void refreshOfADeletedUserIs401() throws Exception {
        Session session = loginAs("alice");
        jdbc.update("DELETE FROM app_user WHERE user_id = ?", session.userId());
        mvc.perform(post("/api/v1/auth/refresh").cookie(refreshCookie(session.refreshToken())))
                .andExpect(status().isUnauthorized());
    }
}
