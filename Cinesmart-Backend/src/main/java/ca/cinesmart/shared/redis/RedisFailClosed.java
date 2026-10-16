package ca.cinesmart.shared.redis;

import ca.cinesmart.shared.api.ApiException;
import ca.cinesmart.shared.api.ErrorCode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.util.function.Supplier;

/**
 * Wraps Redis calls for features that must fail closed when Redis is down (change.md Q24):
 * the call becomes a 503 SERVICE_UNAVAILABLE instead of a 500.
 * Only wrap Redis calls here; a JDBC error inside the supplier would be mislabelled.
 */
public final class RedisFailClosed {

    public static final String DEFAULT_MESSAGE = "Service temporarily unavailable. Please try again later.";

    private static final Logger log = LoggerFactory.getLogger(RedisFailClosed.class);

    private RedisFailClosed() {
    }

    public static <T> T call(Supplier<T> action) {
        return call(DEFAULT_MESSAGE, action);
    }

    public static <T> T call(String message, Supplier<T> action) {
        try {
            return action.get();
        } catch (DataAccessException ex) {
            log.warn("Redis unavailable, failing closed: {}", ex.getMessage());
            throw new ApiException(ErrorCode.SERVICE_UNAVAILABLE, message, ex);
        }
    }

    public static void run(Runnable action) {
        run(DEFAULT_MESSAGE, action);
    }

    public static void run(String message, Runnable action) {
        call(message, () -> {
            action.run();
            return null;
        });
    }

    /** One PING, so a flow that touches Redis late can refuse before it changes anything. */
    public static void ensureAvailable(StringRedisTemplate redis) {
        run(() -> redis.execute((RedisCallback<String>) RedisConnection::ping));
    }
}
