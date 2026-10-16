package ca.cinesmart.identity;

import ca.cinesmart.support.IntegrationTest;
import ca.cinesmart.support.Json;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.test.web.servlet.ResultActions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** GET /me and change email (change.md Q8). */
class EmailChangeAndProfileIntegrationTest extends IntegrationTest {

    @Test
    void profileShowsAccountAndActivityCounts() throws Exception {
        Session session = loginAs("alice");
        mvc.perform(put("/api/v1/movies/1/watchlist").with(bearer(session))).andExpect(status().isOk());
        mvc.perform(put("/api/v1/movies/2/watchlist").with(bearer(session))).andExpect(status().isOk());
        mvc.perform(put("/api/v1/movies/3/watched").with(bearer(session))).andExpect(status().isOk());
        mvc.perform(put("/api/v1/movies/3/rating").with(bearer(session)).contentType(MediaType.APPLICATION_JSON)
                .content(Json.of("rating", 8))).andExpect(status().isOk());

        mvc.perform(get("/api/v1/me").with(bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(session.userId()))
                .andExpect(jsonPath("$.username").value("alice"))
                .andExpect(jsonPath("$.email").value("alice@test.local"))
                .andExpect(jsonPath("$.createdAt").isNotEmpty())
                .andExpect(jsonPath("$.watchlistCount").value(2))
                .andExpect(jsonPath("$.watchedCount").value(1))
                .andExpect(jsonPath("$.ratingCount").value(1))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    void profileRequiresLogin() throws Exception {
        mvc.perform(get("/api/v1/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void emailChangeIsConfirmedFromTheNewAddressAndTheOldOneIsNotified() throws Exception {
        Session session = loginAs("alice");

        requestChange(session, PASSWORD, "Alice.New@Test.Local").andExpect(status().isOk());
        assertThat(mailsTo("alice.new@test.local")).singleElement()
                .satisfies(m -> assertThat(m.getText()).contains("/confirm-email?token=", "24 hours"));
        // Nothing changes until the link is used.
        mvc.perform(get("/api/v1/me").with(bearer(session))).andExpect(jsonPath("$.email").value("alice@test.local"));

        String token = tokenFromLastMailTo("alice.new@test.local");
        confirm(token).andExpect(status().isOk());

        mvc.perform(get("/api/v1/me").with(bearer(session))).andExpect(jsonPath("$.email").value("alice.new@test.local"));
        assertThat(mailsTo("alice@test.local")).singleElement()
                .satisfies(m -> assertThat(m.getText()).contains("alice.new@test.local"));
        confirm(token).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("TOKEN_INVALID"));
    }

    /** change.md Q9: "lowercased + trimmed" also applies to change email. */
    @Test
    void newEmailWithSurroundingSpacesIsTrimmedNotRejected() throws Exception {
        Session session = loginAs("alice");
        requestChange(session, PASSWORD, "  Alice.New@Test.Local ").andExpect(status().isOk());
        assertThat(mailsTo("alice.new@test.local")).hasSize(1);
    }

    @Test
    void wrongPasswordSameEmailAndTakenEmailAreRejected() throws Exception {
        Session session = loginAs("alice");
        createUser("bob", true);

        requestChange(session, "wrong", "new@test.local")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.currentPassword").value("is incorrect"));
        requestChange(session, PASSWORD, "ALICE@test.local")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.newEmail").exists());
        requestChange(session, PASSWORD, "Bob@Test.Local")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EMAIL_TAKEN"));
        requestChange(session, PASSWORD, "not-an-email")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.newEmail").exists());
        assertThat(sentMails()).isEmpty();
    }

    @Test
    void emailTakenBetweenRequestAndConfirmIsAConflict() throws Exception {
        Session session = loginAs("alice");
        requestChange(session, PASSWORD, "wanted@test.local").andExpect(status().isOk());
        String token = tokenFromLastMailTo("wanted@test.local");
        createUser("sneaky", "wanted@test.local", PASSWORD, true);

        confirm(token).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("EMAIL_TAKEN"));
        mvc.perform(get("/api/v1/me").with(bearer(session))).andExpect(jsonPath("$.email").value("alice@test.local"));
    }

    @Test
    void mailFailureOnEmailChangeIs503() throws Exception {
        Session session = loginAs("alice");
        doThrow(new MailSendException("smtp down")).when(mailSender).send(any(SimpleMailMessage.class));
        requestChange(session, PASSWORD, "new@test.local")
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("SERVICE_UNAVAILABLE"));
    }

    @Test
    void emailChangeRequiresLoginButConfirmDoesNot() throws Exception {
        mvc.perform(post("/api/v1/auth/email/change").contentType(MediaType.APPLICATION_JSON)
                        .content(Json.of("currentPassword", PASSWORD, "newEmail", "x@test.local")))
                .andExpect(status().isUnauthorized());
        confirm("unknown-token").andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("TOKEN_INVALID"));
    }

    private ResultActions requestChange(Session session, String password, String newEmail) throws Exception {
        return mvc.perform(post("/api/v1/auth/email/change").with(bearer(session))
                .contentType(MediaType.APPLICATION_JSON)
                .content(Json.of("currentPassword", password, "newEmail", newEmail)));
    }

    private ResultActions confirm(String token) throws Exception {
        return mvc.perform(post("/api/v1/auth/email/change/confirm").contentType(MediaType.APPLICATION_JSON)
                .content(Json.of("token", token)));
    }
}
