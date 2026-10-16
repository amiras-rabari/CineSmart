package ca.cinesmart.shared.api;

import java.util.Map;

/** Base for every expected error; the global handler turns it into an {@link ApiError}. */
public class ApiException extends RuntimeException {

    private final ErrorCode code;
    private final Map<String, String> fields;

    public ApiException(ErrorCode code, String message) {
        this(code, message, null, null);
    }

    public ApiException(ErrorCode code, String message, Throwable cause) {
        this(code, message, null, cause);
    }

    private ApiException(ErrorCode code, String message, Map<String, String> fields, Throwable cause) {
        super(message, cause);
        this.code = code;
        this.fields = fields;
    }

    /** VALIDATION_FAILED for one field checked in code, same shape as bean-validation errors. */
    public static ApiException invalidField(String field, String message) {
        return new ApiException(ErrorCode.VALIDATION_FAILED, "Invalid request fields", Map.of(field, message), null);
    }

    public ErrorCode code() {
        return code;
    }

    /** Null unless this is a field validation error. */
    public Map<String, String> fields() {
        return fields;
    }
}
