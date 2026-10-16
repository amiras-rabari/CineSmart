package ca.cinesmart.shared;

import ca.cinesmart.support.IntegrationTest;
import ca.cinesmart.support.Json;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.testcontainers.containers.GenericContainer;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The Redis failure table (change.md Q24): auth flows that need Redis fail closed with 503, everything else
 * keeps working (rate limits, revocation checks and logout fail open). Redis is paused, not stopped,
 * so the shared container comes back for the other tests.
 */
class RedisOutageIntegrationTest extends IntegrationTest {

    @Autowired
    @Qualifier("redis")
    GenericContainer<?> redisContainer;

    private boolean paused;

    @AfterEach
    void bringRedisBack() throws Exception {
        if (paused) {
            redisContainer.getDockerClient().unpauseContainerCmd(redisContainer.getContainerId()).exec();
            paused = false;
            for (int i = 0; i < 50; i++) {
                try {
                    redis.opsForValue().get("ping");
                    return;
                } catch (RuntimeException stillDown) {
                    Thread.sleep(100);
                }
            }
        }
    }

    @Test
    void authFlowsThatNeedRedisAnswer503() throws Exception {
        createUser("alice", true);
        redisDown();

        post("/api/v1/auth/signup", Json.of("username", "newbie", "email", "newbie@test.local", "password", PASSWORD))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("SERVICE_UNAVAILABLE"));
        post("/api/v1/auth/login", Json.of("username", "alice", "password", PASSWORD))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value("Login temporarily unavailable. Please try again later."));
        post("/api/v1/auth/password/forgot", Json.of("email", "alice@test.local"))
                .andExpect(status().isServiceUnavailable());
        post("/api/v1/auth/email/resend", Json.of("email", "alice@test.local"))
                .andExpect(status().isServiceUnavailable());
        post("/api/v1/auth/email/verify", Json.of("token", "anything"))
                .andExpect(status().isServiceUnavailable());
        post("/api/v1/auth/password/reset", Json.of("token", "anything", "newPassword", "Whatever123!"))
                .andExpect(status().isServiceUnavailable());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/auth/refresh")
                        .cookie(refreshCookie("some-token")))
                .andExpect(status().isServiceUnavailable());
    }

    @Test
    void nothingIsWrittenWhenSignupIsRefused() throws Exception {
        redisDown();
        post("/api/v1/auth/signup", Json.of("username", "newbie", "email", "newbie@test.local", "password", PASSWORD))
                .andExpect(status().isServiceUnavailable());
        org.assertj.core.api.Assertions.assertThat(
                jdbc.queryForObject("SELECT COUNT(*) FROM app_user", Integer.class)).isZero();
    }

    @Test
    void browsingAndLoggedInUseKeepWorking() throws Exception {
        Session s = loginAs("alice");
        redisDown();

        mvc.perform(get("/api/v1/movies/1")).andExpect(status().isOk());
        mvc.perform(get("/api/v1/home")).andExpect(status().isOk());
        mvc.perform(get("/api/v1/movies/search").param("q", "matrix")).andExpect(status().isOk());
        mvc.perform(get("/api/v1/me").with(bearer(s))).andExpect(status().isOk());
        mvc.perform(put("/api/v1/movies/1/watchlist").with(bearer(s)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.inWatchlist").value(true));
        mvc.perform(get("/api/v1/recommendations").with(bearer(s))).andExpect(status().isOk());
    }

    @Test
    void logoutStillSucceeds() throws Exception {
        Session s = loginAs("alice");
        redisDown();
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/auth/logout")
                        .with(bearer(s)).cookie(refreshCookie(s.refreshToken())))
                .andExpect(status().isNoContent());
    }

    @Test
    void passwordChangeFailsClosed() throws Exception {
        Session s = loginAs("alice");
        redisDown();
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/auth/password/change")
                        .with(bearer(s)).contentType(MediaType.APPLICATION_JSON)
                        .content(Json.of("currentPassword", PASSWORD, "newPassword", "BrandNew456!")))
                .andExpect(status().isServiceUnavailable());
    }

    private void redisDown() {
        redisContainer.getDockerClient().pauseContainerCmd(redisContainer.getContainerId()).exec();
        paused = true;
    }

    private org.springframework.test.web.servlet.ResultActions post(String path, String body) throws Exception {
        return mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(path)
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }
}
