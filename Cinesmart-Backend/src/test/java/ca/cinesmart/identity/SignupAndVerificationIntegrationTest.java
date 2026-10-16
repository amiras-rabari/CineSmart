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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** POST /auth/signup, /auth/email/verify, /auth/email/resend (change.md Q3, Q4, Q9). */
class SignupAndVerificationIntegrationTest extends IntegrationTest {

    @Test
    void signupCreatesAnUnverifiedUserAndEmailsAVerificationLink() throws Exception {
        signup("Alice", "Alice@Example.COM", PASSWORD)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("Alice"))
                .andExpect(jsonPath("$.message").isNotEmpty());

        assertThat(jdbc.queryForMap("SELECT email, is_verified FROM app_user WHERE username = 'Alice'"))
                .containsEntry("email", "alice@example.com")
                .containsEntry("is_verified", false);
        SimpleMailMessage mail = mailsTo("alice@example.com").getFirst();
        assertThat(mail.getSubject()).isEqualTo("Welcome to CineSmart");
        assertThat(mail.getFrom()).isEqualTo("noreply@cinesmart.ca");
        assertThat(mail.getText()).contains("http://localhost:5173/verify-email?token=", "24 hours");
    }

    /** change.md Q9: emails are stored "lowercased + trimmed", for signup and change email alike. */
    @Test
    void emailWithSurroundingSpacesIsTrimmedNotRejected() throws Exception {
        signup("Alice", "  Alice@Example.COM ", PASSWORD).andExpect(status().isCreated());
        assertThat(jdbc.queryForObject("SELECT email FROM app_user WHERE username = 'Alice'", String.class))
                .isEqualTo("alice@example.com");
    }

    @Test
    void passwordIsStoredAsBcryptHash() throws Exception {
        signup("bob", "bob@test.local", PASSWORD).andExpect(status().isCreated());
        String hash = jdbc.queryForObject("SELECT password_hash FROM app_user WHERE username = 'bob'", String.class);
        assertThat(hash).startsWith("$2").isNotEqualTo(PASSWORD);
        assertThat(passwordEncoder.matches(PASSWORD, hash)).isTrue();
    }

    @Test
    void usernameIsUniqueIgnoringCase() throws Exception {
        createUser("Alice", true);
        signup("aLiCe", "other@test.local", PASSWORD)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("USERNAME_TAKEN"));
    }

    @Test
    void emailIsUniqueIgnoringCase() throws Exception {
        createUser("alice", true);
        signup("someoneElse", "ALICE@test.local", PASSWORD)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EMAIL_TAKEN"));
    }

    @Test
    void invalidFieldsAreReportedPerField() throws Exception {
        signup("a b", "not-an-email", "short")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fields.username").exists())
                .andExpect(jsonPath("$.fields.email").exists())
                .andExpect(jsonPath("$.fields.password").exists());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM app_user", Integer.class)).isZero();
    }

    @Test
    void usernameLengthLimitsAreEnforced() throws Exception {
        signup("ab", "ab@test.local", PASSWORD).andExpect(status().isBadRequest());
        signup("a".repeat(33), "long@test.local", PASSWORD).andExpect(status().isBadRequest());
        signup("ok_name.1-2", "fine@test.local", PASSWORD).andExpect(status().isCreated());
    }

    @Test
    void signupStillSucceedsWhenTheEmailCannotBeSent() throws Exception {
        doThrow(new MailSendException("smtp down")).when(mailSender).send(any(SimpleMailMessage.class));
        signup("carol", "carol@test.local", PASSWORD).andExpect(status().isCreated());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM app_user WHERE username = 'carol'", Integer.class))
                .isEqualTo(1);
    }

    @Test
    void verificationLinkVerifiesOnceAndThenLoginWorks() throws Exception {
        signup("dave", "dave@test.local", PASSWORD).andExpect(status().isCreated());
        String token = tokenFromLastMailTo("dave@test.local");

        verify(token).andExpect(status().isOk()).andExpect(jsonPath("$.message").isNotEmpty());
        assertThat(jdbc.queryForObject("SELECT is_verified FROM app_user WHERE username = 'dave'", Boolean.class))
                .isTrue();
        login("dave", PASSWORD);

        verify(token).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("TOKEN_INVALID"));
    }

    @Test
    void unknownVerificationTokenIsRejected() throws Exception {
        verify("not-a-real-token").andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("TOKEN_INVALID"));
        verify("").andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    void verificationTokenExpiresAfter24Hours() throws Exception {
        signup("erin", "erin@test.local", PASSWORD).andExpect(status().isCreated());
        Long ttl = redis.getExpire(redis.keys("verification:token:*").iterator().next());
        assertThat(ttl).isBetween(24 * 3600L - 60, 24 * 3600L);
    }

    @Test
    void resendOnlyMailsUnverifiedAccountsButAlwaysAnswersTheSame() throws Exception {
        createUser("unverified", false);
        createUser("verified", true);

        String forUnverified = resend("unverified@test.local").andExpect(status().isOk()).andReturn()
                .getResponse().getContentAsString();
        String forVerified = resend("verified@test.local").andExpect(status().isOk()).andReturn()
                .getResponse().getContentAsString();
        String forUnknown = resend("nobody@test.local").andExpect(status().isOk()).andReturn()
                .getResponse().getContentAsString();

        assertThat(forVerified).isEqualTo(forUnverified).isEqualTo(forUnknown);
        assertThat(mailsTo("unverified@test.local")).hasSize(1);
        assertThat(mailsTo("verified@test.local")).isEmpty();
        assertThat(sentMails()).hasSize(1);
    }

    @Test
    void resendIsCaseInsensitive() throws Exception {
        createUser("frank", false);
        resend("FRANK@Test.Local").andExpect(status().isOk());
        assertThat(mailsTo("frank@test.local")).hasSize(1);
    }

    private ResultActions signup(String username, String email, String password) throws Exception {
        return mvc.perform(post("/api/v1/auth/signup").contentType(MediaType.APPLICATION_JSON)
                .content(Json.of("username", username, "email", email, "password", password)));
    }

    private ResultActions verify(String token) throws Exception {
        return mvc.perform(post("/api/v1/auth/email/verify").contentType(MediaType.APPLICATION_JSON)
                .content(Json.of("token", token)));
    }

    private ResultActions resend(String email) throws Exception {
        return mvc.perform(post("/api/v1/auth/email/resend").contentType(MediaType.APPLICATION_JSON)
                .content(Json.of("email", email)));
    }
}
