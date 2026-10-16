package ca.cinesmart.shared;

import ca.cinesmart.support.IntegrationTest;
import ca.cinesmart.support.Json;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The configured limits from application.properties (change.md Q5, Q16) and CORS for the frontend (Q28):
 * ip.login 10/1 min, ip.account 5/15 min, ip.public 120/1 min, user.write 60/1 min, user.read 120/1 min.
 */
class RateLimitAndCorsIntegrationTest extends IntegrationTest {

    private static final String FRONTEND = "http://localhost:5173";

    @Test
    void publicReadsAreLimitedTo120PerMinutePerIp() throws Exception {
        for (int i = 0; i < 120; i++) {
            mvc.perform(get("/api/v1/genres").with(fromIp("10.1.0.1"))).andExpect(status().isOk());
        }
        MvcResult blocked = mvc.perform(get("/api/v1/genres").with(fromIp("10.1.0.1")))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"))
                .andExpect(header().exists("Retry-After"))
                .andReturn();
        assertThat(Long.parseLong(blocked.getResponse().getHeader("Retry-After"))).isBetween(1L, 60L);

        mvc.perform(get("/api/v1/genres").with(fromIp("10.1.0.2"))).andExpect(status().isOk());
    }

    @Test
    void loginIsLimitedTo10PerMinutePerIp() throws Exception {
        createUser("alice", true);
        for (int i = 0; i < 10; i++) {
            login("10.2.0.1").andExpect(status().isOk());
        }
        login("10.2.0.1")
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.message").value("Too many requests. Try again later."));
        login("10.2.0.2").andExpect(status().isOk());
    }

    @Test
    void accountActionsAreLimitedTo5Per15Minutes() throws Exception {
        for (int i = 0; i < 5; i++) {
            resend("10.3.0.1").andExpect(status().isOk());
        }
        MvcResult blocked = resend("10.3.0.1").andExpect(status().isTooManyRequests()).andReturn();
        assertThat(Long.parseLong(blocked.getResponse().getHeader("Retry-After"))).isBetween(840L, 900L);
        // Other groups have their own budget.
        mvc.perform(get("/api/v1/genres").with(fromIp("10.3.0.1"))).andExpect(status().isOk());
    }

    @Test
    void activityWritesAreLimitedTo60PerMinutePerUser() throws Exception {
        Session alice = loginAs("alice");
        Session bob = loginAs("bob");
        for (int i = 0; i < 60; i++) {
            mvc.perform(put("/api/v1/movies/" + (i % 20 + 1) + "/watchlist").with(bearer(alice)))
                    .andExpect(status().isOk());
        }
        mvc.perform(put("/api/v1/movies/1/watched").with(bearer(alice)))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"));
        mvc.perform(put("/api/v1/movies/1/watched").with(bearer(bob))).andExpect(status().isOk());
        mvc.perform(get("/api/v1/me/watchlist").with(bearer(alice))).andExpect(status().isOk());
    }

    @Test
    void personalReadsAreLimitedTo120PerMinutePerUser() throws Exception {
        Session alice = loginAs("alice");
        for (int i = 0; i < 120; i++) {
            mvc.perform(get(i % 2 == 0 ? "/api/v1/me" : "/api/v1/recommendations").with(bearer(alice)))
                    .andExpect(status().isOk());
        }
        mvc.perform(get("/api/v1/me/ratings").with(bearer(alice))).andExpect(status().isTooManyRequests());
    }

    @Test
    void preflightFromTheFrontendIsAllowedWithCredentials() throws Exception {
        mvc.perform(options("/api/v1/auth/login")
                        .header("Origin", FRONTEND)
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "Content-Type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", FRONTEND))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"))
                .andExpect(header().string("Access-Control-Max-Age", "3600"));
        mvc.perform(options("/api/v1/me/watchlist")
                        .header("Origin", FRONTEND)
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "Authorization"))
                .andExpect(status().isOk());
    }

    @Test
    void otherOriginsAreRefused() throws Exception {
        mvc.perform(options("/api/v1/auth/login")
                        .header("Origin", "http://evil.test")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/genres").header("Origin", "http://evil.test"))
                .andExpect(status().isForbidden());
    }

    @Test
    void responsesToTheFrontendCarryCorsHeadersEvenWhenRateLimited() throws Exception {
        mvc.perform(get("/api/v1/genres").header("Origin", FRONTEND))
                .andExpect(header().string("Access-Control-Allow-Origin", FRONTEND))
                .andExpect(header().string("Access-Control-Expose-Headers", containsString("Retry-After")));
        for (int i = 0; i < 120; i++) {
            mvc.perform(get("/api/v1/genres").header("Origin", FRONTEND));
        }
        mvc.perform(get("/api/v1/genres").header("Origin", FRONTEND))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Access-Control-Allow-Origin", FRONTEND));
    }

    private org.springframework.test.web.servlet.ResultActions login(String ip) throws Exception {
        return mvc.perform(post("/api/v1/auth/login").with(fromIp(ip)).contentType(MediaType.APPLICATION_JSON)
                .content(Json.of("username", "alice", "password", PASSWORD)));
    }

    private org.springframework.test.web.servlet.ResultActions resend(String ip) throws Exception {
        return mvc.perform(post("/api/v1/auth/email/resend").with(fromIp(ip)).contentType(MediaType.APPLICATION_JSON)
                .content(Json.of("email", "nobody@test.local")));
    }
}
