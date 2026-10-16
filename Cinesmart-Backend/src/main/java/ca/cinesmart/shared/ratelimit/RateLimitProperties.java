package ca.cinesmart.shared.ratelimit;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.Map;

/**
 * rate-limit.ip.&lt;group&gt;=max/window (change.md Q5); rate-limit.user.&lt;group&gt; (Q16) is used by UserRateLimitInterceptor.
 * Every configured value is parsed at startup, so a typo fails fast.
 */
@ConfigurationProperties("rate-limit")
public record RateLimitProperties(Map<String, String> ip, Map<String, String> user) {

    public RateLimitProperties {
        ip = ip == null ? Map.of() : Map.copyOf(ip);
        user = user == null ? Map.of() : Map.copyOf(user);
        ip.values().forEach(RateLimit::parse);
        user.values().forEach(RateLimit::parse);
    }

    public RateLimit ipLimit(String group) {
        return limit(ip, "ip", group);
    }

    public RateLimit userLimit(String group) {
        return limit(user, "user", group);
    }

    private static RateLimit limit(Map<String, String> limits, String scope, String group) {
        String spec = limits.get(group);
        if (spec == null) {
            throw new IllegalStateException("Missing setting rate-limit." + scope + "." + group);
        }
        return RateLimit.parse(spec);
    }
}
