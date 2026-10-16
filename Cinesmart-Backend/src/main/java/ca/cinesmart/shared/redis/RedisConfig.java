package ca.cinesmart.shared.redis;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

/**
 * REDIS CONFIGURATION
 * Configures the primary Redis template used for managing key-value pairs in memory.
 *
 * StringRedisTemplate is used instead of standard RedisTemplate because security
 * keys and counters are stored strictly as plain human-readable strings (e.g., "login:failed:user:john_doe" -> "3").
 * This eliminates unnecessary JDK serialization overhead and keeps Redis operations ultra-fast.
 */
@Configuration
public class RedisConfig {

    @Bean
    public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory connectionFactory) {
        return new StringRedisTemplate(connectionFactory);
    }
}