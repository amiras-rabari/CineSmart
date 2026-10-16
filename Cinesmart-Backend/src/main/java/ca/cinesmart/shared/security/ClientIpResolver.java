package ca.cinesmart.shared.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * The client IP used for rate limits and the login IP block (change.md Q5, B-6).
 * X-Forwarded-For is client-controlled, so it's only honoured behind a trusted proxy.
 */
@Component
public class ClientIpResolver {

    private final boolean trustProxy;

    public ClientIpResolver(@Value("${app.trust-proxy:false}") boolean trustProxy) {
        this.trustProxy = trustProxy;
    }

    public String resolve(HttpServletRequest request) {
        if (trustProxy) {
            String forwardedFor = request.getHeader("X-Forwarded-For");
            if (forwardedFor != null && !forwardedFor.isBlank()) {
                return forwardedFor.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr();
    }
}
