package ca.cinesmart.shared.ratelimit;

import java.time.Duration;

/** A fixed-window limit, configured as "max/ISO-duration", e.g. "10/PT1M". */
public record RateLimit(int max, Duration window) {

    public static RateLimit parse(String spec) {
        String[] parts = spec.trim().split("/", 2);
        if (parts.length != 2) {
            throw new IllegalArgumentException("Rate limit must look like 10/PT1M, got: " + spec);
        }
        return new RateLimit(Integer.parseInt(parts[0].trim()), Duration.parse(parts[1].trim()));
    }
}
