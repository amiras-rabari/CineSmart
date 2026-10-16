package ca.cinesmart.shared.redis;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.stereotype.Component;

/** One PING at startup so a missing Redis shows up in the log immediately (change.md Q27). */
@Component
public class RedisStartupCheck {

    private static final Logger log = LoggerFactory.getLogger(RedisStartupCheck.class);

    private final RedisConnectionFactory connectionFactory;

    public RedisStartupCheck(RedisConnectionFactory connectionFactory) {
        this.connectionFactory = connectionFactory;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void ping() {
        try (RedisConnection connection = connectionFactory.getConnection()) {
            log.info("Redis reachable: {}", connection.ping());
        } catch (Exception ex) {
            log.warn("Redis unreachable at startup: {}", ex.getMessage());
        }
    }
}
