package ca.cinesmart.identity.application;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Email links point at frontend pages, which POST the token to the API (change.md Q4, Q8). */
@Component
public class EmailLinkService {

    private final String frontendBaseUrl;

    public EmailLinkService(@Value("${app.frontend-base-url}") String frontendBaseUrl) {
        this.frontendBaseUrl = frontendBaseUrl.endsWith("/")
                ? frontendBaseUrl.substring(0, frontendBaseUrl.length() - 1)
                : frontendBaseUrl;
    }

    // Tokens are URL-safe Base64 (RandomToken), so they need no encoding.
    public String verifyEmail(String token) {
        return frontendBaseUrl + "/verify-email?token=" + token;
    }

    public String resetPassword(String token) {
        return frontendBaseUrl + "/reset-password?token=" + token;
    }

    public String confirmEmail(String token) {
        return frontendBaseUrl + "/confirm-email?token=" + token;
    }
}
