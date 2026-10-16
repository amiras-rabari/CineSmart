package ca.cinesmart.shared.ratelimit;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Registers the per-user rate limits (change.md Q16). */
@Configuration
public class UserRateLimitConfig implements WebMvcConfigurer {

    private final RateLimiter rateLimiter;
    private final RateLimitProperties properties;

    public UserRateLimitConfig(RateLimiter rateLimiter, RateLimitProperties properties) {
        this.rateLimiter = rateLimiter;
        this.properties = properties;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new UserRateLimitInterceptor(rateLimiter, properties, UserRateLimitInterceptor.WRITE))
                .addPathPatterns("/api/v1/movies/*/watchlist", "/api/v1/movies/*/watched",
                        "/api/v1/movies/*/rating", "/api/v1/movies/*/reaction");
        registry.addInterceptor(new UserRateLimitInterceptor(rateLimiter, properties, UserRateLimitInterceptor.READ))
                .addPathPatterns("/api/v1/me", "/api/v1/me/**",
                        "/api/v1/recommendations", "/api/v1/recommendations/**");
    }
}
