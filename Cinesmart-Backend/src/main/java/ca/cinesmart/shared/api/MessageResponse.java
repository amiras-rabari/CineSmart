package ca.cinesmart.shared.api;

/** Success body for endpoints that only report a message (change.md Q25). */
public record MessageResponse(String message) {
}
