package ca.cinesmart.support;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.MountableFile;

import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Throwaway PostgreSQL + Redis in Docker for the integration tests. @ServiceConnection points the app at them,
 * so the real database in SPRING_DATASOURCE_URL is never used.
 * <p>
 * The schema is read (never written) from ../Database/Schema.sql, then src/test/resources/db/test-seed.sql runs.
 * Both containers are removed when the test JVM exits.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

    static final Path SCHEMA = Path.of("..", "Database", "Schema.sql").toAbsolutePath().normalize();

    @Bean
    @ServiceConnection
    PostgreSQLContainer postgres() {
        if (!Files.isRegularFile(SCHEMA)) {
            throw new IllegalStateException("Schema not found at " + SCHEMA
                    + " (run the tests from the Cinesmart-Backend folder)");
        }
        return new PostgreSQLContainer("postgres:18-alpine")
                .withDatabaseName("cinesmart_test")
                .withCopyFileToContainer(MountableFile.forHostPath(SCHEMA), "/docker-entrypoint-initdb.d/01-schema.sql")
                .withCopyFileToContainer(MountableFile.forClasspathResource("db/test-seed.sql"),
                        "/docker-entrypoint-initdb.d/02-seed.sql");
    }

    @Bean
    @ServiceConnection(name = "redis")
    GenericContainer<?> redis() {
        return new GenericContainer<>("redis:7-alpine").withExposedPorts(6379);
    }
}
