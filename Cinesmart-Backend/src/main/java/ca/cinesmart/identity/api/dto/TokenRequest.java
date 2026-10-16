package ca.cinesmart.identity.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Body of POST /auth/email/verify and /auth/email/change/confirm. */
public record TokenRequest(
        @NotBlank
        @Size(max = 200)
        String token) {
}
