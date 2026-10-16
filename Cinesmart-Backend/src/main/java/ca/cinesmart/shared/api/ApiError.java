package ca.cinesmart.shared.api;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.Map;

/** The one error body used by every endpoint and filter (change.md Q25). */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(
        int status,
        String code,
        String message,
        String path,
        String timestamp,
        Map<String, String> fields
) {
    public static ApiError of(ErrorCode code, String message, String path) {
        return of(code, message, path, null);
    }

    public static ApiError of(ErrorCode code, String message, String path, Map<String, String> fields) {
        return new ApiError(code.status().value(), code.name(), message, path, Instant.now().toString(), fields);
    }
}
