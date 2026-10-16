package ca.cinesmart.activity.api.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record RatingRequestDto(
        @NotNull(message = "Rating cannot be null")
        @DecimalMin(value = "1.0", message = "Rating must be at least 1.0")
        @DecimalMax(value = "10.0", message = "Rating must be at most 10.0")
        @Digits(integer = 2, fraction = 1, message = "Rating must have at most 2 integer digits and 1 decimal place")
        BigDecimal rating
) {}