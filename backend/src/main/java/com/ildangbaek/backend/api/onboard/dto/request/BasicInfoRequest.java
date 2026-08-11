package com.ildangbaek.backend.api.onboard.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record BasicInfoRequest(
        @NotBlank @Size(max = 10) String name,
        @NotNull String gender,
        @NotNull @Min(10) @Max(100) Integer age
) {
}
