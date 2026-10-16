package ca.cinesmart.identity.api;

import ca.cinesmart.identity.domain.IssuedSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

/** refresh_token cookie: HttpOnly, Secure, SameSite=Strict, Path=/api/v1/auth (change.md Q6). */
@Component
public class RefreshCookies {

    public static final String NAME = "refresh_token";
    private static final String PATH = "/api/v1/auth";

    private final boolean secure;

    public RefreshCookies(@Value("${auth.refresh.cookie-secure}") boolean secure) {
        this.secure = secure;
    }

    public String create(IssuedSession session) {
        return build(session.refreshToken(), session.refreshTtl());
    }

    public String clear() {
        return build("", Duration.ZERO);
    }

    private String build(String value, Duration maxAge) {
        return ResponseCookie.from(NAME, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Strict")
                .path(PATH)
                .maxAge(maxAge)
                .build()
                .toString();
    }
}
