package ca.cinesmart.identity;

import ca.cinesmart.support.IntegrationTest;
import ca.cinesmart.support.Json;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Forgot / reset password (Q2, Q3, Q4, B-7, B-8) and change password (Q8). */
class PasswordIntegrationTest extends IntegrationTest {

    private static final String NEW_PASSWORD = "BrandNew456!";

    @Test
    void forgotPasswordAnswersTheSameForEveryKindOfAccount() throws Exception {
        createUser("verified", true);
        createUser("pending", false);

        String a = forgot("verified@test.local").andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String b = forgot("pending@test.local").andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String c = forgot("nobody@test.local").andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(a).isEqualTo(b).isEqualTo(c);

        assertThat(mailsTo("verified@test.local")).singleElement()
                .satisfies(m -> assertThat(m.getText()).contains("/reset-password?token=", "10 minutes"));
        assertThat(mailsTo("pending@test.local")).singleElement()
                .satisfies(m -> assertThat(m.getText()).contains("/verify-email?token="));
        assertThat(sentMails()).hasSize(2);
    }

    /** change.md Q9: "lowercased + trimmed" also applies to forgot password and resend verification. */
    @Test
    void forgotPasswordAndResendTrimTheEmail() throws Exception {
        createUser("verified", true);
        createUser("pending", false);
        forgot("  Verified@Test.Local ").andExpect(status().isOk());
        mvc.perform(post("/api/v1/auth/email/resend").contentType(MediaType.APPLICATION_JSON)
                        .content(Json.of("email", "  Pending@Test.Local ")))
                .andExpect(status().isOk());
        assertThat(mailsTo("verified@test.local")).hasSize(1);
        assertThat(mailsTo("pending@test.local")).hasSize(1);
    }

    @Test
    void resetTokenLivesTenMinutes() throws Exception {
        createUser("alice", true);
        forgot("alice@test.local").andExpect(status().isOk());
        Long ttl = redis.getExpire(redis.keys("reset:token:*").iterator().next());
        assertThat(ttl).isBetween(570L, 600L);
    }

    @Test
    void resetChangesThePasswordOnceAndLogsOutEverySession() throws Exception {
        Session session = loginAs("alice");
        forgot("alice@test.local").andExpect(status().isOk());
        String token = tokenFromLastMailTo("alice@test.local");
        Thread.sleep(1100); // revoke-all has one-second resolution

        reset(token, NEW_PASSWORD).andExpect(status().isOk()).andExpect(jsonPath("$.message").isNotEmpty());

        mvc.perform(post("/api/v1/auth/refresh").cookie(refreshCookie(session.refreshToken())))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/me").with(bearer(session))).andExpect(status().isUnauthorized());
        loginExpect("alice", PASSWORD, 401);
        loginExpect("alice", NEW_PASSWORD, 200);

        reset(token, "Another789!").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("TOKEN_INVALID"));
    }

    @Test
    void resetValidatesTheNewPassword() throws Exception {
        reset("whatever", "short").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.newPassword").exists());
        reset("bogus-token", NEW_PASSWORD).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("TOKEN_INVALID"));
    }

    @Test
    void forgotPasswordStillAnswers200WhenMailFails() throws Exception {
        createUser("alice", true);
        doThrow(new MailSendException("smtp down")).when(mailSender).send(any(SimpleMailMessage.class));
        forgot("alice@test.local").andExpect(status().isOk());
    }

    @Test
    void changePasswordGivesTheCallerAFreshSessionAndEndsTheOthers() throws Exception {
        Session caller = loginAs("alice");
        Session other = login("alice", PASSWORD);
        Thread.sleep(1100);

        MvcResult result = change(caller, PASSWORD, NEW_PASSWORD)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(header().exists("Set-Cookie"))
                .andReturn();
        Session fresh = sessionFrom(result);

        mvc.perform(get("/api/v1/me").with(bearer(fresh))).andExpect(status().isOk());
        mvc.perform(post("/api/v1/auth/refresh").cookie(refreshCookie(fresh.refreshToken()))).andExpect(status().isOk());
        mvc.perform(get("/api/v1/me").with(bearer(other))).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/me").with(bearer(caller))).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/refresh").cookie(refreshCookie(other.refreshToken())))
                .andExpect(status().isUnauthorized());
        loginExpect("alice", NEW_PASSWORD, 200);
    }

    @Test
    void wrongCurrentPasswordIs400AndCountsTowardTheLockout() throws Exception {
        Session session = loginAs("alice");
        for (int i = 0; i < 5; i++) {
            change(session, "wrong-" + i, NEW_PASSWORD)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                    .andExpect(jsonPath("$.fields.currentPassword").value("is incorrect"));
            flushRateLimits();
        }
        change(session, PASSWORD, NEW_PASSWORD)
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("ACCOUNT_LOCKED"));
        loginExpect("alice", PASSWORD, 429);
    }

    @Test
    void newPasswordMustDiffer() throws Exception {
        Session session = loginAs("alice");
        change(session, PASSWORD, PASSWORD)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.newPassword").exists());
    }

    @Test
    void changePasswordRequiresLogin() throws Exception {
        mvc.perform(post("/api/v1/auth/password/change").contentType(MediaType.APPLICATION_JSON)
                        .content(Json.of("currentPassword", PASSWORD, "newPassword", NEW_PASSWORD)))
                .andExpect(status().isUnauthorized());
    }

    /** The account limit (5 per 15 minutes) would otherwise stop this test before the lockout does. */
    private void flushRateLimits() {
        redis.delete(redis.keys("rl:*"));
    }

    private ResultActions forgot(String email) throws Exception {
        return mvc.perform(post("/api/v1/auth/password/forgot").contentType(MediaType.APPLICATION_JSON)
                .content(Json.of("email", email)));
    }

    private ResultActions reset(String token, String newPassword) throws Exception {
        return mvc.perform(post("/api/v1/auth/password/reset").contentType(MediaType.APPLICATION_JSON)
                .content(Json.of("token", token, "newPassword", newPassword)));
    }

    private ResultActions change(Session session, String current, String next) throws Exception {
        return mvc.perform(post("/api/v1/auth/password/change").with(bearer(session))
                .contentType(MediaType.APPLICATION_JSON)
                .content(Json.of("currentPassword", current, "newPassword", next)));
    }

    private void loginExpect(String username, String password, int status) throws Exception {
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(Json.of("username", username, "password", password)))
                .andExpect(status().is(status));
    }
}
