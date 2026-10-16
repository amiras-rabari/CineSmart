package ca.cinesmart;

import ca.cinesmart.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.testcontainers.postgresql.PostgreSQLContainer;

import javax.sql.DataSource;
import java.sql.Connection;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The app starts against the containers and Hibernate accepts the real schema (ddl-auto=validate).
 * Also guards that the tests are connected to the throwaway database, never a real one.
 */
class ApplicationSmokeIntegrationTest extends IntegrationTest {

    @Autowired
    DataSource dataSource;

    @Autowired
    PostgreSQLContainer postgres;

    @Test
    void connectsToTheThrowawayContainerDatabase() throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            assertThat(connection.getMetaData().getURL()).isEqualTo(postgres.getJdbcUrl());
        }
        assertThat(jdbc.queryForObject("SELECT current_database()", String.class)).isEqualTo("cinesmart_test");
    }

    @Test
    void schemaAndSeedAreLoaded() {
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM movie", Integer.class)).isEqualTo(20);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM pg_extension WHERE extname = 'pg_trgm'", Integer.class))
                .isEqualTo(1);
    }

    @Test
    void redisIsReachable() {
        redis.opsForValue().set("smoke", "ok");
        assertThat(redis.opsForValue().get("smoke")).isEqualTo("ok");
    }
}
