package ca.cinesmart.shared.ratelimit;

import ca.cinesmart.shared.api.ErrorCode;
import ca.cinesmart.shared.security.ClientIpResolver;
import ca.cinesmart.shared.security.ErrorResponseWriter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Per-IP limits on public endpoints (change.md Q5). Registered inside the security chain
 * (see SecurityConfig), after CORS, so a 429 still carries the CORS headers.
 * <ul>
 *   <li>login: POST /auth/login</li>
 *   <li>account: signup, password/forgot, email/resend, email/change, password/change</li>
 *   <li>token: email/verify, password/reset, email/change/confirm</li>
 *   <li>public: POST /auth/refresh and the public GETs (movies, home, genres, languages)</li>
 * </ul>
 */
public class IpRateLimitFilter extends OncePerRequestFilter {

    private static final String AUTH = "/api/v1/auth";

    private final RateLimiter rateLimiter;
    private final RateLimitProperties properties;
    private final ClientIpResolver ipResolver;

    public IpRateLimitFilter(RateLimiter rateLimiter, RateLimitProperties properties, ClientIpResolver ipResolver) {
        this.rateLimiter = rateLimiter;
        this.properties = properties;
        this.ipResolver = ipResolver;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String group = group(request);
        if (group != null) {
            String ip = ipResolver.resolve(request);
            RateLimiter.Decision decision = rateLimiter.hit("rl:ip:" + group + ":" + ip, properties.ipLimit(group));
            if (!decision.allowed()) {
                response.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf(decision.retryAfterSeconds()));
                ErrorResponseWriter.write(request, response, ErrorCode.RATE_LIMITED,
                        "Too many requests. Try again later.");
                return;
            }
        }
        chain.doFilter(request, response);
    }

    static String group(HttpServletRequest request) {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        String method = request.getMethod();
        if ("POST".equals(method)) {
            return switch (path) {
                case AUTH + "/login" -> "login";
                case AUTH + "/signup", AUTH + "/password/forgot", AUTH + "/email/resend",
                     AUTH + "/email/change", AUTH + "/password/change" -> "account";
                case AUTH + "/email/verify", AUTH + "/password/reset", AUTH + "/email/change/confirm" -> "token";
                case AUTH + "/refresh" -> "public";
                default -> null;
            };
        }
        if ("GET".equals(method) && (path.equals("/api/v1/movies") || path.startsWith("/api/v1/movies/")
                || path.equals("/api/v1/home") || path.equals("/api/v1/genres") || path.equals("/api/v1/languages"))) {
            return "public";
        }
        return null;
    }
}
