package ca.cinesmart.identity;

import ca.cinesmart.support.IntegrationTest;
import ca.cinesmart.support.Json;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** POST /auth/login and the lockout rules (change.md Q1, Q5, Q28, B-1). */
class LoginAndLockoutIntegrationTest extends IntegrationTest {

    @Test
    void loginReturnsAccessTokenUserAndRefreshCookie() throws Exception {
        long id = createUser("alice", true);

        login("alice", PASSWORD, "127.0.0.1")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.expiresIn").value(900))
                .andExpect(jsonPath("$.user.userId").value(id))
                .andExpect(jsonPath("$.user.username").value("alice"))
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andExpect(header().string("Set-Cookie", containsString("refresh_token=")))
                .andExpect(header().string("Set-Cookie", containsString("HttpOnly")))
                .andExpect(header().string("Set-Cookie", containsString("Secure")))
                .andExpect(header().string("Set-Cookie", containsString("SameSite=Strict")))
                .andExpect(header().string("Set-Cookie", containsString("Path=/api/v1/auth")))
                .andExpect(header().string("Set-Cookie", containsString("Max-Age=7200")));
    }

    @Test
    void usernameMatchIsCaseInsensitiveAndTrimmed() throws Exception {
        createUser("Alice", true);
        login("  aLICE ", PASSWORD, "127.0.0.1")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.username").value("Alice"));
    }

    @Test
    void wrongPasswordAndUnknownUserGetTheSameAnswer() throws Exception {
        createUser("alice", true);
        String wrong = login("alice", "wrong-password", "127.0.0.1")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andReturn().getResponse().getContentAsString();
        String unknown = login("nobody", "wrong-password", "127.0.0.1")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andReturn().getResponse().getContentAsString();
        assertThat(messageOf(wrong)).isEqualTo(messageOf(unknown));
    }

    @Test
    void unverifiedAccountIsRefusedOnlyAfterTheRightPassword() throws Exception {
        createUser("pending", false);
        login("pending", "wrong-password", "127.0.0.1").andExpect(status().isUnauthorized());
        login("pending", PASSWORD, "127.0.0.1")
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCOUNT_NOT_VERIFIED"))
                .andExpect(header().doesNotExist("Set-Cookie"));
    }

    @Test
    void unverifiedLoginsDoNotCountTowardTheLockout() throws Exception {
        createUser("pending", false);
        for (int i = 0; i < 6; i++) {
            login("pending", PASSWORD, "127.0.0.1").andExpect(status().isForbidden());
        }
        assertThat(redis.hasKey("login:lock:user:pending")).isFalse();
    }

    @Test
    void fiveFailuresLockTheAccountEvenForTheRightPassword() throws Exception {
        createUser("alice", true);
        for (int i = 1; i <= 5; i++) {
            login("alice", "wrong-" + i, "10.0.0." + i).andExpect(status().isUnauthorized());
        }
        login("alice", PASSWORD, "10.0.0.9")
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("ACCOUNT_LOCKED"));
        Long ttl = redis.getExpire("login:lock:user:alice");
        assertThat(ttl).isBetween(3500L, 3600L);
    }

    @Test
    void lockIsPerUsernameIgnoringCase() throws Exception {
        createUser("Alice", true);
        createUser("bob", true);
        for (int i = 1; i <= 5; i++) {
            login(i % 2 == 0 ? "ALICE" : "alice", "wrong", "10.0.1." + i).andExpect(status().isUnauthorized());
        }
        login("Alice", PASSWORD, "10.0.1.9").andExpect(status().isTooManyRequests());
        login("bob", PASSWORD, "10.0.1.9").andExpect(status().isOk());
    }

    @Test
    void unknownUsernamesAreLockedTooSoALockRevealsNothing() throws Exception {
        for (int i = 1; i <= 5; i++) {
            login("ghost", "wrong", "10.0.2." + i).andExpect(status().isUnauthorized());
        }
        login("ghost", "anything", "10.0.2.9")
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("ACCOUNT_LOCKED"));
    }

    @Test
    void successfulLoginResetsTheFailureCounter() throws Exception {
        createUser("alice", true);
        for (int i = 0; i < 4; i++) {
            login("alice", "wrong", "10.0.3.1").andExpect(status().isUnauthorized());
        }
        login("alice", PASSWORD, "10.0.3.1").andExpect(status().isOk());
        for (int i = 0; i < 4; i++) {
            login("alice", "wrong", "10.0.3.1").andExpect(status().isUnauthorized());
        }
        login("alice", PASSWORD, "10.0.3.1").andExpect(status().isOk());
    }

    @Test
    void tenFailuresFromOneIpBlockThatIpForLogin() throws Exception {
        createUser("alice", true);
        for (int i = 1; i <= 10; i++) {
            login("user" + i, "wrong", "10.9.9.9").andExpect(status().isUnauthorized());
        }
        // Clear only the per-IP request rate limit so the 11th call reaches the login IP block itself.
        redis.delete(redis.keys("rl:ip:login:*"));

        login("alice", PASSWORD, "10.9.9.9")
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"))
                .andExpect(jsonPath("$.message").value(containsString("from this address")));
        login("alice", PASSWORD, "10.9.9.10").andExpect(status().isOk());
    }

    @Test
    void blankFieldsAreValidationErrors() throws Exception {
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(Json.of("username", " ", "password", "")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fields.username").exists())
                .andExpect(jsonPath("$.fields.password").exists());
    }

    private ResultActions login(String username, String password, String ip) throws Exception {
        return mvc.perform(post("/api/v1/auth/login").with(fromIp(ip)).contentType(MediaType.APPLICATION_JSON)
                .content(Json.of("username", username, "password", password)));
    }

    private static String messageOf(String body) {
        return com.jayway.jsonpath.JsonPath.read(body, "$.message");
    }
}
