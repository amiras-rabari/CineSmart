package ca.cinesmart.shared;

import ca.cinesmart.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The security matrix (implementation-plan B.5, change.md Q7) and the one error format (Q25, B-3). */
class SecurityAndErrorsIntegrationTest extends IntegrationTest {

    @Autowired
    JwtEncoder jwtEncoder;

    @Test
    void protectedRouteWithoutTokenGivesTheStandardErrorBody() throws Exception {
        mvc.perform(get("/api/v1/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.message").value("Missing, invalid or expired access token"))
                .andExpect(jsonPath("$.path").value("/api/v1/me"))
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }

    @Test
    void expiredTokenIsRejected() throws Exception {
        long userId = createUser("alice", true);
        Instant past = Instant.now().minus(Duration.ofHours(1));
        String token = token(jwtEncoder, "cinesmart-api", userId, past, past.plus(Duration.ofMinutes(15)));
        mvc.perform(get("/api/v1/me").with(bearer(token))).andExpect(status().isUnauthorized());
    }

    @Test
    void tokenFromAnotherIssuerIsRejected() throws Exception {
        long userId = createUser("alice", true);
        Instant now = Instant.now();
        String token = token(jwtEncoder, "someone-else", userId, now, now.plus(Duration.ofMinutes(15)));
        mvc.perform(get("/api/v1/me").with(bearer(token))).andExpect(status().isUnauthorized());
    }

    @Test
    void tokenSignedWithAnotherKeyIsRejected() throws Exception {
        long userId = createUser("alice", true);
        JwtEncoder forger = NimbusJwtEncoder.withSecretKey(new SecretKeySpec(
                "a-completely-different-secret-key!!".getBytes(StandardCharsets.UTF_8), "HmacSHA256"))
                .algorithm(MacAlgorithm.HS256).build();
        Instant now = Instant.now();
        String token = token(forger, "cinesmart-api", userId, now, now.plus(Duration.ofMinutes(15)));
        mvc.perform(get("/api/v1/me").with(bearer(token))).andExpect(status().isUnauthorized());
    }

    @Test
    void validTokenOfADeletedUserIs401() throws Exception {
        Session s = loginAs("alice");
        jdbc.update("DELETE FROM app_user WHERE user_id = ?", s.userId());
        mvc.perform(get("/api/v1/me").with(bearer(s)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void invalidTokenIsIgnoredOnPublicReadsButRejectedElsewhere() throws Exception {
        mvc.perform(get("/api/v1/movies/1").with(bearer("garbage"))).andExpect(status().isOk());
        mvc.perform(get("/api/v1/home").with(bearer("garbage"))).andExpect(status().isOk());
        mvc.perform(get("/api/v1/genres").with(bearer("garbage"))).andExpect(status().isOk());
        mvc.perform(get("/api/v1/movies/1/similar").with(bearer("garbage"))).andExpect(status().isOk());
        mvc.perform(get("/api/v1/me/watchlist").with(bearer("garbage"))).andExpect(status().isUnauthorized());
    }

    @Test
    void loggedOutTokenIsAnonymousOnPublicReads() throws Exception {
        Session s = loginAs("alice");
        mvc.perform(post("/api/v1/auth/logout").with(bearer(s))).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/movies/1").with(bearer(s)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userState").doesNotExist());
    }

    @Test
    void unknownUrlsAre401WhenAnonymousAnd404WhenLoggedIn() throws Exception {
        // Documented in implementation-plan Phase 0: Spring Security runs before routing.
        mvc.perform(get("/api/v1/nope")).andExpect(status().isUnauthorized());
        Session s = loginAs("alice");
        mvc.perform(get("/api/v1/nope").with(bearer(s)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("Resource not found"));
        mvc.perform(get("/api/v1/movies/1/nope"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void wrongMethodIs405() throws Exception {
        Session s = loginAs("alice");
        mvc.perform(post("/api/v1/genres").with(bearer(s)))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.code").value("METHOD_NOT_ALLOWED"));
        mvc.perform(get("/api/v1/auth/login").with(bearer(s)))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    void malformedOrMissingBodyIs400() throws Exception {
        mvc.perform(post("/api/v1/auth/signup").contentType(MediaType.APPLICATION_JSON).content("{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"))
                .andExpect(jsonPath("$.message").value("Request body is missing or malformed"));
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
    }

    @Test
    void unsupportedContentTypeIsA4xxWithTheStandardBody() throws Exception {
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.TEXT_PLAIN).content("username=a"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.status").value(415))
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
    }

    @Test
    void passwordHashesAndTokensNeverLeakIntoResponses() throws Exception {
        Session s = loginAs("alice");
        String me = mvc.perform(get("/api/v1/me").with(bearer(s))).andReturn().getResponse().getContentAsString();
        String hash = jdbc.queryForObject("SELECT password_hash FROM app_user WHERE user_id = ?", String.class, s.userId());
        org.assertj.core.api.Assertions.assertThat(me).doesNotContain(hash).doesNotContain(s.refreshToken());
    }

    private static String token(JwtEncoder encoder, String issuer, long userId, Instant issuedAt, Instant expiresAt) {
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .issuedAt(issuedAt)
                .expiresAt(expiresAt)
                .subject("alice")
                .claim("userId", userId)
                .build();
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();
    }
}
