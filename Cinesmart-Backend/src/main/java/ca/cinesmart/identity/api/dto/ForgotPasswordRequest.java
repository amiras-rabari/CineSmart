package ca.cinesmart.identity.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Also used for POST /auth/email/resend: both identify the account by email only (change.md Q2, Q4). */
public record ForgotPasswordRequest(
        @NotBlank
        @Email
        @Size(max = 64)
        String email
) {
}
