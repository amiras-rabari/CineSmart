package ca.cinesmart.identity;

import ca.cinesmart.identity.api.RefreshCookies;
import ca.cinesmart.identity.application.EmailLinkService;
import ca.cinesmart.identity.domain.AppUser;
import ca.cinesmart.identity.domain.IssuedSession;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

class IdentityBasicsTest {

    @Test
    void emailsAreTrimmedAndLowercased() {
        assertThat(AppUser.normalizeEmail("  Alice@Example.COM ")).isEqualTo("alice@example.com");
        assertThat(AppUser.normalizeEmail(null)).isNull();
        AppUser user = new AppUser();
        user.setEmail("Bob@X.io");
        assertThat(user.getEmail()).isEqualTo("bob@x.io");
    }

    @Test
    void emailLinksPointAtFrontendPages() {
        EmailLinkService links = new EmailLinkService("http://localhost:5173/");
        assertThat(links.verifyEmail("t1")).isEqualTo("http://localhost:5173/verify-email?token=t1");
        assertThat(links.resetPassword("t2")).isEqualTo("http://localhost:5173/reset-password?token=t2");
        assertThat(links.confirmEmail("t3")).isEqualTo("http://localhost:5173/confirm-email?token=t3");
    }

    @Test
    void refreshCookieIsHttpOnlyStrictAndScopedToAuth() {
        IssuedSession session = new IssuedSession("jwt", 900, "refresh-value", Duration.ofHours(2), 1L, "alice");
        String cookie = new RefreshCookies(true).create(session);
        assertThat(cookie).startsWith("refresh_token=refresh-value;")
                .contains("Path=/api/v1/auth", "Max-Age=7200", "Secure", "HttpOnly", "SameSite=Strict");

        String cleared = new RefreshCookies(false).clear();
        assertThat(cleared).startsWith("refresh_token=;").contains("Max-Age=0").doesNotContain("Secure");
    }
}
