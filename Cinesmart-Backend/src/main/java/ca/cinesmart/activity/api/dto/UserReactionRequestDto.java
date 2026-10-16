package ca.cinesmart.activity.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record UserReactionRequestDto(

        @NotBlank(message = "Reaction is required")
        @Pattern(
                regexp = "LIKE|DISLIKE|NEUTRAL",
                message = "Reaction must be LIKE, DISLIKE, or NEUTRAL"
        )
        String reaction

) {}

