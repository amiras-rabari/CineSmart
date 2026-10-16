package ca.cinesmart.shared.ratelimit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Redis fixed-window counter (change.md Q5, Q16). Fails open: when Redis is down the request
 * is allowed and a warning is logged (Q24).
 */
@Component
public class RateLimiter {

    private static final Logger log = LoggerFactory.getLogger(RateLimiter.class);

    // INCR, start the window on the first hit (or if the key somehow has no TTL), return {count, ttlMillis}.
    private static final String INCR_WINDOW_LUA = """
            local count = redis.call('INCR', KEYS[1])
            local ttl = redis.call('PTTL', KEYS[1])
            if ttl < 0 then
              redis.call('PEXPIRE', KEYS[1], ARGV[1])
              ttl = tonumber(ARGV[1])
            end
            return {count, ttl}
            """;

    @SuppressWarnings("rawtypes")
    private final DefaultRedisScript<List> script = new DefaultRedisScript<>(INCR_WINDOW_LUA, List.class);

    private final StringRedisTemplate redis;

    public RateLimiter(StringRedisTemplate redis) {
        this.redis = redis;
    }

    /** Counts one hit against key; blocked once the count exceeds limit.max() within the window. */
    public Decision hit(String key, RateLimit limit) {
        try {
            List<?> result = redis.execute(script, List.of(key), String.valueOf(limit.window().toMillis()));
            long count = ((Number) result.get(0)).longValue();
            long ttlMillis = ((Number) result.get(1)).longValue();
            if (count > limit.max()) {
                return new Decision(false, Math.max(1, (ttlMillis + 999) / 1000));
            }
            return Decision.ALLOWED;
        } catch (DataAccessException ex) {
            log.warn("Rate limit skipped, Redis unavailable: {}", ex.getMessage());
            return Decision.ALLOWED;
        }
    }

    public record Decision(boolean allowed, long retryAfterSeconds) {
        static final Decision ALLOWED = new Decision(true, 0);
    }
}
