package ca.cinesmart.shared.ratelimit;

import ca.cinesmart.shared.api.ErrorCode;
import ca.cinesmart.shared.security.CurrentUser;
import ca.cinesmart.shared.security.ErrorResponseWriter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;

/**
 * Per-user limits (change.md Q16), keyed rl:user:&lt;group&gt;:&lt;userId&gt;. Registered in {@link UserRateLimitConfig}:
 * <ul>
 *   <li>write: PUT / DELETE /movies/{id}/watchlist|watched|rating|reaction, one shared budget</li>
 *   <li>read: /me, /me/**, /recommendations/**</li>
 * </ul>
 * Fails open like the IP limits (RateLimiter); anonymous requests never reach these paths.
 */
public class UserRateLimitInterceptor implements HandlerInterceptor {

    public static final String WRITE = "write";
    public static final String READ = "read";

    private final RateLimiter rateLimiter;
    private final RateLimitProperties properties;
    private final String group;

    public UserRateLimitInterceptor(RateLimiter rateLimiter, RateLimitProperties properties, String group) {
        this.rateLimiter = rateLimiter;
        this.properties = properties;
        this.group = group;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws IOException {
        if (WRITE.equals(group) && !"PUT".equals(request.getMethod()) && !"DELETE".equals(request.getMethod())) {
            return true;
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!(auth instanceof JwtAuthenticationToken token)) {
            return true;
        }
        Long userId = CurrentUser.id(token.getToken());
        RateLimiter.Decision decision = rateLimiter.hit("rl:user:" + group + ":" + userId, properties.userLimit(group));
        if (decision.allowed()) {
            return true;
        }
        response.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf(decision.retryAfterSeconds()));
        ErrorResponseWriter.write(request, response, ErrorCode.RATE_LIMITED, "Too many requests. Try again later.");
        return false;
    }
}
