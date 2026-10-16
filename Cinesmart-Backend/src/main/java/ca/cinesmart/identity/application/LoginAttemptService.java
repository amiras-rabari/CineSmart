package ca.cinesmart.identity.application;

import ca.cinesmart.shared.redis.RedisFailClosed;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.Locale;

/**
 * Failed-login counters and locks in Redis (change.md Q1, Q5). Keys use the lowercased username,
 * and unknown usernames are counted and locked too, so a lock reveals nothing.
 * <ul>
 *   <li>login:failed:user:&lt;username&gt; / login:lock:user:&lt;username&gt;</li>
 *   <li>login:failed:ip:&lt;ip&gt; / login:block:ip:&lt;ip&gt; (the block applies to login only)</li>
 * </ul>
 * Fails closed: login can't run safely without the lockout check (Q24).
 */
@Service
public class LoginAttemptService {

    static final String UNAVAILABLE = "Login temporarily unavailable. Please try again later.";

    private static final String USER_FAILED_PREFIX = "login:failed:user:";
    private static final String USER_LOCK_PREFIX = "login:lock:user:";
    private static final String IP_FAILED_PREFIX = "login:failed:ip:";
    private static final String IP_BLOCK_PREFIX = "login:block:ip:";

    // INCR and start the TTL on the first failure, in one atomic step.
    private static final String INCR_AND_EXPIRE_LUA = """
            local current = redis.call('INCR', KEYS[1])
            if tonumber(current) == 1 then
              redis.call('EXPIRE', KEYS[1], ARGV[1])
            end
            return current
            """;

    private final DefaultRedisScript<Long> incrAndExpire = new DefaultRedisScript<>(INCR_AND_EXPIRE_LUA, Long.class);

    private final StringRedisTemplate redis;
    private final int maxUserFailures;
    private final int maxIpFailures;
    private final Duration lockDuration;

    public LoginAttemptService(StringRedisTemplate redis,
                               @Value("${auth.lockout.max-user-failures}") int maxUserFailures,
                               @Value("${auth.lockout.max-ip-failures}") int maxIpFailures,
                               @Value("${auth.lockout.duration}") Duration lockDuration) {
        this.redis = redis;
        this.maxUserFailures = maxUserFailures;
        this.maxIpFailures = maxIpFailures;
        this.lockDuration = lockDuration;
    }

    public boolean isUserLocked(String username) {
        return RedisFailClosed.call(UNAVAILABLE, () -> Boolean.TRUE.equals(redis.hasKey(USER_LOCK_PREFIX + key(username))));
    }

    public boolean isIpBlocked(String ip) {
        return RedisFailClosed.call(UNAVAILABLE, () -> Boolean.TRUE.equals(redis.hasKey(IP_BLOCK_PREFIX + ip)));
    }

    /** A wrong password or unknown username: counts for both the username and the IP. */
    public void recordFailure(String username, String ip) {
        RedisFailClosed.run(UNAVAILABLE, () -> {
            countAndMaybeLock(USER_FAILED_PREFIX + key(username), USER_LOCK_PREFIX + key(username), maxUserFailures);
            countAndMaybeLock(IP_FAILED_PREFIX + ip, IP_BLOCK_PREFIX + ip, maxIpFailures);
        });
    }

    /** Correct password: both counters start again from zero. */
    public void reset(String username, String ip) {
        RedisFailClosed.run(UNAVAILABLE, () -> redis.delete(List.of(USER_FAILED_PREFIX + key(username), IP_FAILED_PREFIX + ip)));
    }

    private void countAndMaybeLock(String failKey, String lockKey, int max) {
        Long attempts = redis.execute(incrAndExpire, List.of(failKey), String.valueOf(lockDuration.toSeconds()));
        if (attempts != null && attempts >= max) {
            redis.opsForValue().set(lockKey, "true", lockDuration);
            redis.delete(failKey);
        }
    }

    private static String key(String username) {
        return username.trim().toLowerCase(Locale.ROOT);
    }
}
