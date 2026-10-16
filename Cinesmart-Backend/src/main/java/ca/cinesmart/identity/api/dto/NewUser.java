package ca.cinesmart.identity.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Signup body. The email is lowercased when stored (change.md Q9). */
public record NewUser(
        @NotBlank
        @Pattern(regexp = "^[A-Za-z0-9_.-]{3,32}$",
                message = "must be 3-32 characters: letters, digits, '_', '.' or '-'")
        String username,

        @NotBlank
        @Email
        @Size(max = 64)
        String email,

        @NotBlank
        @Size(min = 8, max = 100)
        String password) {
}
